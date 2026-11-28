package com.ordernest.server.common;

import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Is this a real customer name? It may be left empty, but something typed must
 * look like a name: letters only (any language), at least 2 of them, and not a
 * placeholder. The same rules as the Node server and the web app.
 */
public final class CustomerName {

    // written without spaces or punctuation, lower case
    private static final Set<String> PLACEHOLDERS = Set.of(
            "n", "na", "nan", "nn", "nil", "nill", "none", "null", "no", "nm",
            "xx", "xxx", "xxxx", "abc", "abcd", "test", "testing", "demo", "dummy",
            "unknown", "customer", "cust", "name", "noname", "notknown", "notavailable",
            "dontknow", "donotknow", "walkin", "guest",
            "patanahi", "patanhi", "nahipata", "nahi", "nhi", "koinahi", "pta", "ptanahi",
            "ग्राहक", "पतानहीं", "नहींपता", "नामनहीं", "कोईनहीं", "अज्ञात");

    private static final Pattern ALLOWED = Pattern.compile(
            "^[\\p{L}\\p{M}\\t\\n\\x0B\\f\\r \\u00a0\\u1680\\u2000-\\u200a\\u2028\\u2029\\u202f\\u205f\\u3000\\ufeff.'’\\-&(),/]+$");
    private static final Pattern NOT_LETTER_OR_MARK = Pattern.compile("[^\\p{L}\\p{M}]");

    private CustomerName() {
    }

    /** Null when the name is fine (or empty), otherwise a short message. */
    public static String problem(String raw) {
        String name = JsText.collapse(raw == null ? "" : raw);
        if (name.isEmpty()) {
            return null;
        }
        if (!ALLOWED.matcher(name).matches()) {
            return "Customer name can only have letters. Type the real name, or leave it empty.";
        }
        long letters = name.codePoints().filter(Character::isLetter).count();
        long different = name.codePoints().filter(Character::isLetter).map(Character::toLowerCase).distinct().count();
        String key = NOT_LETTER_OR_MARK.matcher(name.toLowerCase(Locale.ROOT)).replaceAll("");
        if (letters < 2 || PLACEHOLDERS.contains(key) || different == 1) {
            return "That does not look like a real name. Type the real name, or leave it empty.";
        }
        return null;
    }
}
