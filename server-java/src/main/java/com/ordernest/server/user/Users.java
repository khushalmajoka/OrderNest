package com.ordernest.server.user;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

import org.bson.Document;
import org.bson.types.ObjectId;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Collation;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Repository;

/** Reading and writing accounts. */
@Repository
public class Users {

    private static final String COLLECTION = "users";
    // capitals do not matter in emails; older accounts may be saved with them
    private static final Collation ANY_CAPITALS = Collation.of("en").strength(Collation.ComparisonLevel.secondary());

    private final MongoTemplate mongo;

    public Users(MongoTemplate mongo) {
        this.mongo = mongo;
    }

    public Optional<UserEdit> byId(ObjectId id) {
        return one(Query.query(Criteria.where("_id").is(id)));
    }

    public Optional<UserEdit> byEmail(String email) {
        return one(email(Criteria.where("email").is(email)));
    }

    /** Signed up, but the emailed code was never typed. */
    public Optional<UserEdit> waitingForConfirmation(String email) {
        return one(email(Criteria.where("email").is(email).and("emailVerified").is(false)));
    }

    /** Staff have no real email: they cannot use "forgot password". */
    public Optional<UserEdit> ownerByEmail(String email) {
        return one(email(Criteria.where("email").is(email).and("role").ne("staff")));
    }

    public Optional<UserEdit> byUsername(String username) {
        return one(Query.query(Criteria.where("username").is(username)));
    }

    /** @param except an account that may have it, or null */
    public boolean emailTaken(String email, ObjectId except) {
        Criteria criteria = Criteria.where("email").is(email);
        if (except != null) {
            criteria.and("_id").ne(except);
        }
        return mongo.exists(email(criteria), COLLECTION);
    }

    /** A new account, with everything an account starts with. */
    public Document insert(ObjectId id, String name, String email, String passwordHash, boolean emailVerified,
            Document emailCode) {
        Document user = new Document("_id", id).append("name", name).append("email", email).append("password", passwordHash);
        UserDefaults.ALL.forEach((path, value) -> {
            int dot = path.indexOf('.');
            if (dot < 0) {
                user.append(path, value);
            } else {
                Document group = (Document) user.computeIfAbsent(path.substring(0, dot), key -> new Document());
                group.append(path.substring(dot + 1), value);
            }
        });
        user.put("emailVerified", emailVerified);
        if (emailCode != null) {
            user.put("emailCode", emailCode);
        }
        user.append("__v", 0);
        return mongo.insert(user, COLLECTION);
    }

    public void save(UserEdit edit) {
        UserDefaults.addMissing(edit);
        if (edit.toSet().isEmpty() && edit.toUnset().isEmpty()) {
            return;
        }
        Update update = new Update();
        edit.toSet().forEach(update::set);
        edit.toUnset().forEach(update::unset);
        mongo.updateFirst(Query.query(Criteria.where("_id").is(edit.id())), update, COLLECTION);
    }

    /** What may be shown about an account; never the password fingerprint. */
    public static Map<String, Object> publicView(Document user) {
        String role = role(user);
        Map<String, Object> shown = new LinkedHashMap<>();
        shown.put("_id", user.getObjectId("_id"));
        shown.put("name", user.get("name"));
        // the email stored for staff is made up
        if ("admin".equals(role) && user.containsKey("email")) {
            shown.put("email", user.get("email"));
        }
        if (user.containsKey("username")) {
            shown.put("username", user.get("username"));
        }
        shown.put("role", role);
        if (user.containsKey("shopId")) {
            shown.put("shopId", user.get("shopId"));
        }
        return shown;
    }

    /** Accounts from before roles existed are owners. */
    public static String role(Document user) {
        return user.get("role") instanceof String role && !role.isEmpty() ? role : "admin";
    }

    private static Query email(Criteria criteria) {
        return Query.query(criteria).collation(ANY_CAPITALS);
    }

    private Optional<UserEdit> one(Query query) {
        return Optional.ofNullable(mongo.findOne(query, Document.class, COLLECTION)).map(UserEdit::new);
    }
}
