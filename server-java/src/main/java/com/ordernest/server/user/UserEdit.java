package com.ordernest.server.user;

import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;

import org.bson.Document;
import org.bson.types.ObjectId;

/**
 * A stored account and the changes to be made to it. Only the named fields are
 * written: whatever else the record holds is left alone.
 */
public class UserEdit {

    private final Document user;
    private final Map<String, Object> set = new LinkedHashMap<>();
    private final Set<String> unset = new LinkedHashSet<>();

    UserEdit(Document user) {
        this.user = user;
    }

    /** The record as it was read (changes are not applied to it). */
    public Document stored() {
        return user;
    }

    public ObjectId id() {
        return user.getObjectId("_id");
    }

    public void set(String field, Object value) {
        set.keySet().removeIf(path -> path.startsWith(field + "."));
        unset.remove(field);
        set.put(field, value);
    }

    public void unset(String field) {
        set.keySet().removeIf(path -> path.equals(field) || path.startsWith(field + "."));
        unset.add(field);
    }

    Map<String, Object> toSet() {
        return set;
    }

    Set<String> toUnset() {
        return unset;
    }
}
