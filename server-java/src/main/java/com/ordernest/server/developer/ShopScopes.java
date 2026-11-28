package com.ordernest.server.developer;

import org.bson.Document;
import org.bson.types.ObjectId;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Component;

import com.ordernest.server.common.ApiException;
import com.ordernest.server.common.Ids;

/** Reads "?shop=": all shops, or one that exists. */
@Component
class ShopScopes {

    private final MongoTemplate mongo;

    ShopScopes(MongoTemplate mongo) {
        this.mongo = mongo;
    }

    /** @param shop null means every shop */
    record Scope(ObjectId shop) {
        boolean all() {
            return shop == null;
        }

        /** A filter on the field that holds the shop's id. */
        Document filter(String field) {
            return all() ? new Document() : new Document(field, shop);
        }
    }

    Scope read(String wanted) {
        if (wanted == null || wanted.isEmpty() || wanted.equals("all")) {
            return new Scope(null);
        }
        if (Ids.valid(wanted)) {
            ObjectId id = new ObjectId(wanted);
            if (mongo.getCollection("shops").countDocuments(new Document("_id", id)) > 0) {
                return new Scope(id);
            }
        }
        throw ApiException.message(400, "Unknown shop.");
    }
}
