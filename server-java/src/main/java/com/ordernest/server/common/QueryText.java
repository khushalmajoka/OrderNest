package com.ordernest.server.common;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

import jakarta.servlet.http.HttpServletRequest;

/** The "?a=b" part of an address, read the way the Node server reads it. */
public final class QueryText {

    private static final Pattern LEADING_NUMBER = Pattern.compile("^\\s*([+-]?\\d+)");

    private QueryText() {
    }

    /** The value; null when absent. A name given twice reads as "a,b". */
    public static String of(HttpServletRequest request, String name) {
        String[] values = request.getParameterValues(name);
        return values == null ? null : String.join(",", values);
    }

    /** Like parseInt(text) || fallback: leading digits count, 0 and nonsense give the fallback. */
    public static long number(String text, long fallback) {
        Matcher digits = text == null ? null : LEADING_NUMBER.matcher(text);
        if (digits == null || !digits.find()) {
            return fallback;
        }
        String found = digits.group(1);
        long value;
        try {
            value = Long.parseLong(found);
        } catch (NumberFormatException tooLong) {
            value = found.startsWith("-") ? Long.MIN_VALUE : Long.MAX_VALUE;
        }
        return value == 0 ? fallback : value;
    }
}
