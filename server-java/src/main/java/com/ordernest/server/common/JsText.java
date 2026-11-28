package com.ordernest.server.common;

import java.util.regex.Pattern;

/** Text handling the way the Node server (JavaScript) does it. */
public final class JsText {

    // what JavaScript counts as a space: more than Java's \s does
    private static final String SPACE = "[\\t\\n\\x0B\\f\\r \\u00a0\\u1680\\u2000-\\u200a\\u2028\\u2029\\u202f\\u205f\\u3000\\ufeff]";
    private static final Pattern ENDS = Pattern.compile("^" + SPACE + "+|(?<!" + SPACE + ")" + SPACE + "+$");
    private static final Pattern RUNS = Pattern.compile(SPACE + "+");

    private JsText() {
    }

    public static String trim(String text) {
        return ENDS.matcher(text).replaceAll("");
    }

    /** Trimmed, with every run of spaces made one space. */
    public static String collapse(String text) {
        return RUNS.matcher(trim(text)).replaceAll(" ");
    }
}
