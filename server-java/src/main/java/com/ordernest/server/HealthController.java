package com.ordernest.server;

import java.util.Map;

import org.bson.Document;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
class HealthController {

    private final MongoTemplate mongo;

    HealthController(MongoTemplate mongo) {
        this.mongo = mongo;
    }

    @GetMapping("/health")
    Map<String, Object> health() {
        return Map.of("ok", true);
    }

    // Read only: asks the database "are you there?".
    @GetMapping("/db")
    Map<String, Object> db() {
        Document reply = mongo.executeCommand(new Document("ping", 1));
        return Map.of("ok", ((Number) reply.get("ok")).intValue() == 1);
    }
}
