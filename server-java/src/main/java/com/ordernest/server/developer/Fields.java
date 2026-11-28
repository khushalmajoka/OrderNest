package com.ordernest.server.developer;

import java.util.Map;

import org.bson.Document;

final class Fields {

    private Fields() {
    }

    /** Left out of the answer when the record does not have it, as the Node server does. */
    static void copy(Document from, String field, Map<String, Object> to, String name) {
        if (from != null && from.containsKey(field)) {
            to.put(name, from.get(field));
        }
    }
}
