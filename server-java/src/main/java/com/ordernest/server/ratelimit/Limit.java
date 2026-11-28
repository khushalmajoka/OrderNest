package com.ordernest.server.ratelimit;

import java.time.Duration;

/** Every rate limit, with the same numbers and texts as the Node server. */
public enum Limit {
    TRACK(30, Duration.ofMinutes(15), false, "message", "Too many attempts. Please try again in a few minutes."),
    LOGIN(10, Duration.ofMinutes(15), true, "error", "Too many failed attempts. Please try again in 15 minutes."),
    LOGIN_ACCOUNT(30, Duration.ofHours(1), true, "error",
            "Too many failed attempts for this account. Please try again in an hour, or use Forgot password."),
    REGISTER(20, Duration.ofHours(1), false, "error", "Too many sign-ups from this network. Please try again later."),
    STAFF_PASSWORD(10, Duration.ofMinutes(15), true, "error", "Too many attempts. Please try again in 15 minutes."),
    FORGOT(5, Duration.ofMinutes(15), false, "error", "Too many requests. Please try again in 15 minutes."),
    RESET(10, Duration.ofMinutes(15), false, "error", "Too many attempts. Please try again in 15 minutes."),
    CHANGE_PASSWORD(10, Duration.ofMinutes(15), true, "error", "Too many attempts. Please try again in 15 minutes."),
    EXPORT(15, Duration.ofMinutes(5), false, "message", "Too many exports. Please wait a few minutes."),
    CATALOG(200, Duration.ofMinutes(15), false, "message", "Too many visits. Please try again in a few minutes."),
    CATALOG_IMAGE(3000, Duration.ofMinutes(15), false, "message", "Too many pictures. Please try again in a few minutes."),
    USAGE(120, Duration.ofMinutes(1), false, "message", "Too many requests.");

    final int max;
    final Duration window;
    final boolean onlyFailuresCount;
    final String field;
    final String text;

    Limit(int max, Duration window, boolean onlyFailuresCount, String field, String text) {
        this.max = max;
        this.window = window;
        this.onlyFailuresCount = onlyFailuresCount;
        this.field = field;
        this.text = text;
    }
}
