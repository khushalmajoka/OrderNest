package com.ordernest.server.common;

import org.bson.types.ObjectId;

public final class Ids {

    private Ids() {
    }

    public static boolean valid(String id) {
        return id != null && ObjectId.isValid(id) && id.length() == 24;
    }

    /** Like Mongoose: an id that cannot be one is a 400, not a 500. */
    public static ObjectId parse(String id) {
        if (!valid(id)) {
            throw ApiException.failure(400, "Invalid ID or value provided.");
        }
        return new ObjectId(id);
    }
}
