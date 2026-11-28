package com.ordernest.server.usage;

import java.util.Date;
import java.util.List;

import org.bson.types.ObjectId;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Component;

import com.ordernest.server.common.BusinessDay;
import com.ordernest.server.security.Account;

/**
 * Counts how much each feature is used: one record per shop, day and feature.
 * Counting never slows down or breaks the action itself.
 */
@Component
public class UsageRecorder {

    private static final Logger log = LoggerFactory.getLogger(UsageRecorder.class);
    private static final String COLLECTION = "usagecounts";

    private final MongoTemplate mongo;
    private final BusinessDay day;

    public UsageRecorder(MongoTemplate mongo, BusinessDay day) {
        this.mongo = mongo;
        this.day = day;
    }

    /** The developer testing inside a shop is not the shop's use. */
    public void count(ObjectId shop, Account account, Feature feature) {
        if (!account.devMode()) {
            record(shop, account.id(), feature);
        }
    }

    /** @param user null for a customer on the tracking page or the catalog */
    public void record(ObjectId shop, ObjectId user, Feature feature) {
        if (shop == null) {
            return;
        }
        Thread.ofVirtual().start(() -> {
            try {
                write(shop, user, feature);
            } catch (RuntimeException e) {
                log.error("Could not count a feature use: {}", e.getMessage());
            }
        });
    }

    private void write(ObjectId shop, ObjectId user, Feature feature) {
        Query row = Query.query(Criteria.where("shop").is(shop).and("day").is(day.today()).and("feature").is(feature.key()));
        Date now = new Date();
        // "__v" is the version number the Node server puts on every new record
        Update update = new Update().inc("count", 1).set("lastAt", now).setOnInsert("createdAt", now).setOnInsert("__v", 0);
        if (user != null) {
            update.addToSet("users", user.toHexString());
        } else {
            update.setOnInsert("users", List.of());
        }
        try {
            mongo.upsert(row, update, COLLECTION);
        } catch (DuplicateKeyException e) {
            // two first uses at the same moment: the record exists now, so try once more
            mongo.updateFirst(row, update, COLLECTION);
        }
    }
}
