package com.ordernest.server.usage;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.List;

import org.bson.Document;
import org.bson.types.ObjectId;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.mongodb.MongoDBContainer;

import com.mongodb.client.model.IndexOptions;

@Testcontainers
@SpringBootTest
class UsageRecorderTest {

    @Container
    static final MongoDBContainer MONGO = new MongoDBContainer("mongo:8.0");

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry registry) {
        registry.add("spring.mongodb.uri", () -> MONGO.getReplicaSetUrl("ordernest-test"));
    }

    @Autowired
    MongoTemplate mongo;

    @Autowired
    UsageRecorder usage;

    // Several people use a feature for the first time today at the same moment:
    // one record, and nothing lost
    @Test
    void usesAtTheSameMomentAreAllCountedInOneRecord() throws InterruptedException {
        // the unique index the live database has
        mongo.getCollection("usagecounts").createIndex(new Document("shop", 1).append("day", 1).append("feature", 1),
                new IndexOptions().unique(true));
        ObjectId shop = new ObjectId();
        for (int i = 0; i < 40; i++) {
            usage.record(shop, new ObjectId(), Feature.SLIP_OPEN);
        }

        Document row = null;
        for (int i = 0; i < 100; i++) {
            row = mongo.getCollection("usagecounts").find(new Document("shop", shop)).first();
            if (row != null && row.getInteger("count") == 40) {
                break;
            }
            Thread.sleep(100);
        }
        assertEquals(40, row.getInteger("count"));
        assertEquals(40, row.get("users", List.class).size());
        assertEquals(1, mongo.getCollection("usagecounts").countDocuments(new Document("shop", shop)));
    }
}
