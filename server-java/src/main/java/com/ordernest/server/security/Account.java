package com.ordernest.server.security;

import java.util.Map;

import org.bson.Document;
import org.bson.types.ObjectId;

/**
 * The person making the request, read fresh from the database every time, so a
 * change of role or permissions works at once.
 *
 * @param developer      the real login is the developer
 * @param developerActor the developer, while working inside another shop
 */
public record Account(
        ObjectId id,
        String role,
        String name,
        String email,
        String username,
        ObjectId shopId,
        Map<String, Boolean> permissions,
        Document passwordChange,
        boolean developer,
        DeveloperActor developerActor) {

    public record DeveloperActor(String id, String name, String email) {
    }

    public boolean isAdmin() {
        return "admin".equals(role);
    }

    public boolean isStaff() {
        return "staff".equals(role);
    }

    public boolean devMode() {
        return developerActor != null;
    }

    public boolean can(Permission permission) {
        return isAdmin() || Boolean.TRUE.equals(permissions.get(permission.key()));
    }
}
