package com.ordernest.server.developer;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

import org.bson.Document;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Component;

/** Every shop with its owner and sizes, so the developer can open any of them. */
@Component
class ShopList {

    private final MongoTemplate mongo;

    ShopList(MongoTemplate mongo) {
        this.mongo = mongo;
    }

    Map<String, Object> build() {
        List<Document> shops = mongo.getCollection("shops").find()
                .projection(new Document("name", 1).append("category", 1).append("phone", 1).append("owner", 1).append("createdAt", 1))
                .sort(new Document("createdAt", 1))
                .into(new ArrayList<>());

        List<Object> ownerIds = shops.stream().map(s -> s.get("owner")).filter(Objects::nonNull).toList();
        Map<Object, Document> owners = new HashMap<>();
        mongo.getCollection("users").find(new Document("_id", new Document("$in", ownerIds)))
                .projection(new Document("name", 1).append("email", 1))
                .forEach(user -> owners.put(user.get("_id"), user));

        Map<Object, Document> orders = new HashMap<>();
        mongo.getCollection("orders").aggregate(List.of(new Document("$group", new Document("_id", "$shop")
                .append("orders", new Document("$sum", 1))
                .append("lastAt", new Document("$max", "$updatedAt")))))
                .forEach(row -> orders.put(row.get("_id"), row));

        List<Object> shopIds = shops.stream().map(s -> s.get("_id")).toList();
        Map<Object, Document> staff = new HashMap<>();
        mongo.getCollection("users").aggregate(List.of(
                new Document("$match", new Document("role", "staff").append("shopId", new Document("$in", shopIds))),
                new Document("$group", new Document("_id", "$shopId").append("staff", new Document("$sum", 1)))))
                .forEach(row -> staff.put(row.get("_id"), row));

        List<Map<String, Object>> list = shops.stream().map(shop -> {
            Document owner = owners.get(shop.get("owner"));
            Document sizes = orders.get(shop.get("_id"));
            Document team = staff.get(shop.get("_id"));
            Map<String, Object> out = new LinkedHashMap<>();
            out.put("id", shop.getObjectId("_id").toHexString());
            Fields.copy(shop, "name", out, "name");
            Fields.copy(shop, "category", out, "category");
            Fields.copy(owner, "name", out, "ownerName");
            Fields.copy(owner, "email", out, "ownerEmail");
            out.put("orders", sizes == null ? 0 : sizes.get("orders"));
            out.put("lastActivity", sizes == null ? null : sizes.get("lastAt"));
            out.put("staff", team == null ? 0 : team.get("staff"));
            Fields.copy(shop, "createdAt", out, "createdAt");
            return out;
        }).toList();

        return Map.of("shops", list);
    }
}
