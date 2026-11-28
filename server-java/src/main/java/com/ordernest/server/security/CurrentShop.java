package com.ordernest.server.security;

import org.bson.Document;
import org.bson.types.ObjectId;

/** The caller's own shop (or the shop a staff member works for). */
public record CurrentShop(ObjectId id, Document document) {
}
