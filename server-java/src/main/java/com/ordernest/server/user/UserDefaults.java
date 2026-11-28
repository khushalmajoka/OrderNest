package com.ordernest.server.user;

import java.util.LinkedHashMap;
import java.util.Map;

import org.bson.Document;

import com.ordernest.server.security.Permission;

/**
 * What an account has when nothing was said. The Node server writes these into
 * a new account, and into an older one that lacks them whenever it saves it.
 * Java does the same, so both leave the same record behind.
 */
final class UserDefaults {

    static final Map<String, Object> ALL = all();

    private UserDefaults() {
    }

    private static Map<String, Object> all() {
        Map<String, Object> defaults = new LinkedHashMap<>();
        defaults.put("role", "admin");
        for (Permission permission : Permission.values()) {
            defaults.put("permissions." + permission.key(), false);
        }
        defaults.put("active", true);
        defaults.put("passwordChange.status", "none");
        defaults.put("resetCode.attempts", 0);
        defaults.put("emailCode.attempts", 0);
        defaults.put("emailVerified", true);
        return defaults;
    }

    /** Adds the missing defaults to the changes, leaving alone what is being changed anyway. */
    static void addMissing(UserEdit edit) {
        ALL.forEach((path, value) -> {
            int dot = path.indexOf('.');
            String field = dot < 0 ? path : path.substring(0, dot);
            if (edit.toSet().containsKey(path) || edit.toSet().containsKey(field) || edit.toUnset().contains(field)) {
                return;
            }
            if (isMissing(edit.stored(), field, dot < 0 ? null : path.substring(dot + 1))) {
                edit.toSet().put(path, value);
            }
        });
    }

    private static boolean isMissing(Document user, String field, String inside) {
        if (inside == null) {
            return !user.containsKey(field);
        }
        if (!user.containsKey(field)) {
            return true;
        }
        // something that is not a group of fields cannot get a field added
        return user.get(field) instanceof Document group && !group.containsKey(inside);
    }
}
