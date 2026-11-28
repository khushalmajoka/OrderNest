package com.ordernest.server.developer;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.bson.Document;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Component;

import com.ordernest.server.common.CustomerName;
import com.ordernest.server.common.JsText;

/** How many orders have a phone, an address, a real customer name, ... */
@Component
class CompletenessReport {

    private final MongoTemplate mongo;

    CompletenessReport(MongoTemplate mongo) {
        this.mongo = mongo;
    }

    Map<String, Object> build(ShopScopes.Scope scope) {
        Document match = scope.filter("shop");
        Document group = new Document("_id", null)
                .append("total", sumOf(1))
                .append("phone", filledIn("$phone"))
                .append("address", filledIn("$address"))
                .append("item", filledIn("$item"))
                .append("executive", filledIn("$orderExecutive"))
                .append("deliveryDate", sumOf(oneIf(new Document("$eq", List.of(new Document("$type", "$expectedDeliveryDate"), "date")))))
                .append("advance", sumOf(oneIf(new Document("$gt", List.of(new Document("$ifNull", List.of("$advance", 0)), 0)))));
        Document row = mongo.getCollection("orders")
                .aggregate(List.of(new Document("$match", match), new Document("$group", group)))
                .first();
        Document counts = row == null ? new Document() : row;
        long total = number(counts, "total");
        counts.put("customerName", realNames(match));

        List<Map<String, Object>> fields = new ArrayList<>();
        fields.add(part("Customer phone", "phone", counts, total));
        fields.add(part("Customer name", "customerName", counts, total));
        fields.add(part("Product", "item", counts, total));
        fields.add(part("Delivery address", "address", counts, total));
        fields.add(part("Delivery date", "deliveryDate", counts, total));
        fields.add(part("Order executive", "executive", counts, total));
        fields.add(part("Advance taken", "advance", counts, total));

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("total", total);
        body.put("fields", fields);
        return body;
    }

    // "N", "NA", "xx", "123" and an empty name do not count
    private long realNames(Document match) {
        long real = 0;
        for (Document order : mongo.getCollection("orders").find(match).projection(new Document("customerName", 1))) {
            if (order.get("customerName") instanceof String name && !JsText.trim(name).isEmpty()
                    && CustomerName.problem(name) == null) {
                real++;
            }
        }
        return real;
    }

    private static Document sumOf(Object value) {
        return new Document("$sum", value);
    }

    private static Document oneIf(Document condition) {
        return new Document("$cond", List.of(condition, 1, 0));
    }

    // a text with something other than spaces in it
    private static Document filledIn(String field) {
        Document isText = new Document("$eq", List.of(new Document("$type", field), "string"));
        Document length = new Document("$strLenCP", new Document("$trim", new Document("input", field)));
        return sumOf(oneIf(new Document("$and", List.of(isText, new Document("$gt", List.of(length, 0))))));
    }

    private static long number(Document counts, String key) {
        return counts.get(key) instanceof Number n ? n.longValue() : 0;
    }

    private static Map<String, Object> part(String label, String key, Document counts, long total) {
        long count = number(counts, key);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("key", key);
        out.put("label", label);
        out.put("count", count);
        out.put("percent", total == 0 ? 0.0 : ((double) count / total) * 100);
        return out;
    }
}
