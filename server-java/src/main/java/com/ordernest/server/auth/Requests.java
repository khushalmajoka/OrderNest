package com.ordernest.server.auth;

import java.util.Locale;
import java.util.regex.Pattern;

import com.ordernest.server.common.ApiException;
import com.ordernest.server.common.JsText;

import tools.jackson.databind.JsonNode;

/** Reading what was typed into the sign-up and login forms, like the Node server. */
final class Requests {

    private static final String SPACE_OR_AT = "\\t\\n\\x0B\\f\\r \\u00a0\\u1680\\u2000-\\u200a\\u2028\\u2029\\u202f\\u205f\\u3000\\ufeff@";
    private static final Pattern EMAIL = Pattern.compile(
            "[^" + SPACE_OR_AT + "]+@[^" + SPACE_OR_AT + "]+\\.[^" + SPACE_OR_AT + "]+");
    private static final int MIN_PASSWORD = 8;
    private static final int MAX_PASSWORD = 72;

    private Requests() {
    }

    /** The text sent under this name, or null when it was not sent as a text. */
    static String text(JsonNode body, String name) {
        JsonNode value = body.get(name);
        return value != null && value.isString() ? value.stringValue() : null;
    }

    /** Trimmed and lower case; "" when it was not a text. */
    static String clean(String typed) {
        return typed == null ? "" : JsText.trim(typed).toLowerCase(Locale.ROOT);
    }

    static boolean isEmail(String text) {
        return EMAIL.matcher(text).matches();
    }

    static String requireEmail(String email) {
        if (!isEmail(email)) {
            throw ApiException.error(400, "Please enter a valid email.");
        }
        return email;
    }

    static String requireNewPassword(String password) {
        if (password == null || password.length() < MIN_PASSWORD || password.length() > MAX_PASSWORD) {
            throw ApiException.error(400, "Password must be " + MIN_PASSWORD + " to " + MAX_PASSWORD + " characters.");
        }
        return password;
    }
}
