package com.ordernest.server.ratelimit;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import com.ordernest.server.common.ApiException;

class RateLimiterTest {

    private static final Limit[] FORGOT = { Limit.FORGOT };

    private static class TestClock extends Clock {
        long now = 1_000_000;

        @Override
        public long millis() {
            return now;
        }

        @Override
        public Instant instant() {
            return Instant.ofEpochMilli(now);
        }

        @Override
        public java.time.ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(java.time.ZoneId zone) {
            return this;
        }
    }

    private final TestClock clock = new TestClock();
    private final RateLimiter limiter = new RateLimiter(clock);

    private static MockHttpServletRequest from(String ip) {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("X-Forwarded-For", "1.2.3.4, " + ip);
        return request;
    }

    @Test
    void stopsAfterTheLimitAndStartsAgainLater() {
        for (int i = 0; i < 5; i++) {
            limiter.check(FORGOT, from("10.0.0.1"), new MockHttpServletResponse());
        }
        MockHttpServletResponse sixth = new MockHttpServletResponse();
        ApiException refused = assertThrows(ApiException.class, () -> limiter.check(FORGOT, from("10.0.0.1"), sixth));
        assertEquals(429, refused.status());
        assertEquals("limit=5, remaining=0, reset=900", sixth.getHeader("RateLimit"));
        assertEquals("5;w=900", sixth.getHeader("RateLimit-Policy"));
        assertEquals("900", sixth.getHeader("Retry-After"));
        // another address is not affected
        assertDoesNotThrow(() -> limiter.check(FORGOT, from("10.0.0.2"), new MockHttpServletResponse()));
        clock.now += 15 * 60 * 1000;
        assertDoesNotThrow(() -> limiter.check(FORGOT, from("10.0.0.1"), new MockHttpServletResponse()));
    }

    @Test
    void successfulLoginsDoNotCount() {
        for (int i = 0; i < 50; i++) {
            MockHttpServletRequest request = from("10.0.0.3");
            MockHttpServletResponse response = new MockHttpServletResponse();
            limiter.check(new Limit[] { Limit.LOGIN }, request, response);
            limiter.finished(request, response); // 200
        }
    }

    @Test
    void ipv6IsCountedPerBlock() {
        assertEquals(RateLimiter.network("2001:db8:1:200::1"), RateLimiter.network("2001:db8:1:2ff:ffff::9"));
        assertEquals("10.0.0.1", RateLimiter.network("10.0.0.1"));
    }
}
