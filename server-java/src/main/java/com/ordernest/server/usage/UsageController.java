package com.ordernest.server.usage;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.ordernest.server.ratelimit.Limit;
import com.ordernest.server.ratelimit.RateLimited;
import com.ordernest.server.security.Account;
import com.ordernest.server.security.CurrentShop;
import com.ordernest.server.security.NeedsShop;
import com.ordernest.server.web.RequestBodies;

import tools.jackson.databind.JsonNode;

@RestController
class UsageController {

    private final UsageRecorder usage;

    UsageController(UsageRecorder usage) {
        this.usage = usage;
    }

    // The app reports things that only happen on screen, e.g. {"feature": "whatsapp.open"}.
    // Always 204: counting is never something the person waits for.
    @RateLimited(value = Limit.USAGE, beforeLogin = true)
    @NeedsShop
    @PostMapping("/api/usage")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void report(Account account, CurrentShop shop, HttpServletRequest request) {
        JsonNode sent = RequestBodies.of(request).get("feature");
        if (sent != null && sent.isString()) {
            Feature.reportedByApp(sent.stringValue()).ifPresent(feature -> usage.count(shop.id(), account, feature));
        }
    }
}
