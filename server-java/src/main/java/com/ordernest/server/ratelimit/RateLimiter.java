package com.ordernest.server.ratelimit;

import java.net.Inet6Address;
import java.net.InetAddress;
import java.net.UnknownHostException;
import java.time.Clock;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import com.ordernest.server.common.ApiException;
import com.ordernest.server.web.RequestBodies;

import tools.jackson.databind.JsonNode;

/**
 * Fixed-window counters in memory, with the headers of the Node package
 * "express-rate-limit" that the Node server uses.
 */
@Component
public class RateLimiter {

    private static final String COUNTED = "ordernest.rate-limit";

    private final Clock clock;
    private final Map<String, Window> windows = new ConcurrentHashMap<>();
    private volatile long nextCleanUp;

    @Autowired
    public RateLimiter() {
        this(Clock.systemUTC());
    }

    RateLimiter(Clock clock) {
        this.clock = clock;
    }

    private record Window(int used, long resetAt) {
    }

    public void check(Limit[] limits, HttpServletRequest request, HttpServletResponse response) {
        for (Limit limit : limits) {
            count(limit, request, response);
        }
    }

    private void count(Limit limit, HttpServletRequest request, HttpServletResponse response) {
        long now = clock.millis();
        cleanUp(now);
        String key = limit.name() + "|" + key(limit, request);
        Window window = windows.compute(key, (k, old) -> old == null || old.resetAt() <= now
                ? new Window(1, now + limit.window.toMillis())
                : new Window(old.used() + 1, old.resetAt()));

        long seconds = limit.window.toSeconds();
        long reset = Math.max(0, (long) Math.ceil((window.resetAt() - now) / 1000.0));
        int remaining = Math.max(0, limit.max - window.used());
        response.setHeader("RateLimit-Policy", limit.max + ";w=" + seconds);
        if (limit == Limit.USAGE) {
            response.setHeader("RateLimit-Limit", String.valueOf(limit.max));
            response.setHeader("RateLimit-Remaining", String.valueOf(remaining));
            response.setHeader("RateLimit-Reset", String.valueOf(reset));
        } else {
            response.setHeader("RateLimit", "limit=" + limit.max + ", remaining=" + remaining + ", reset=" + reset);
        }
        if (window.used() > limit.max) {
            response.setHeader("Retry-After", String.valueOf(reset));
            throw new ApiException(429, Map.of(limit.field, limit.text));
        }
        if (limit.onlyFailuresCount) {
            counted(request).add(key);
        }
    }

    /** Takes the request back out of the "only failures count" limits when it went well. */
    public void finished(HttpServletRequest request, HttpServletResponse response) {
        if (request.getAttribute(COUNTED) != null && response.getStatus() < 400) {
            for (String key : counted(request)) {
                windows.computeIfPresent(key, (k, w) -> new Window(Math.max(0, w.used() - 1), w.resetAt()));
            }
        }
        request.removeAttribute(COUNTED);
    }

    @SuppressWarnings("unchecked")
    private static List<String> counted(HttpServletRequest request) {
        List<String> keys = (List<String>) request.getAttribute(COUNTED);
        if (keys == null) {
            keys = new ArrayList<>();
            request.setAttribute(COUNTED, keys);
        }
        return keys;
    }

    private static String key(Limit limit, HttpServletRequest request) {
        if (limit == Limit.LOGIN_ACCOUNT) {
            JsonNode body = RequestBodies.of(request);
            JsonNode typed = body.hasNonNull("identifier") ? body.get("identifier") : body.get("email");
            String who = typed != null && typed.isString() ? typed.stringValue().strip().toLowerCase(Locale.ROOT) : "";
            if (!who.isEmpty()) {
                return "account:" + who.substring(0, Math.min(200, who.length()));
            }
        }
        return network(clientIp(request));
    }

    /** Behind Render's proxy the real address is the last one the proxy added. */
    static String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null) {
            String[] hops = forwarded.split(",");
            String last = hops.length == 0 ? "" : hops[hops.length - 1].strip();
            if (!last.isEmpty()) {
                return last;
            }
        }
        return request.getRemoteAddr();
    }

    // One home or office has a whole block of IPv6 addresses: count the block (/56)
    static String network(String ip) {
        if (ip == null || !ip.contains(":")) {
            return ip;
        }
        try {
            // a text with ":" is read as an address, never looked up by name
            if (InetAddress.getByName(ip) instanceof Inet6Address address) {
                byte[] bytes = address.getAddress();
                Arrays.fill(bytes, 7, bytes.length, (byte) 0);
                return InetAddress.getByAddress(bytes).getHostAddress() + "/56";
            }
        } catch (UnknownHostException e) {
            // not an address: count it as it is
        }
        return ip;
    }

    private void cleanUp(long now) {
        if (now >= nextCleanUp) {
            nextCleanUp = now + 60_000;
            windows.values().removeIf(w -> w.resetAt() <= now);
        }
    }
}
