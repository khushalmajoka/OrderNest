package com.ordernest.server.security;

import java.util.Date;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;

import org.bson.Document;
import org.bson.types.ObjectId;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

import com.ordernest.server.common.ApiException;
import com.ordernest.server.common.Ids;
import com.ordernest.server.config.AppSettings;

/** Looks up the account and shop behind a login. Only reads. */
@Service
public class AccountService {

    private final MongoTemplate mongo;
    private final AppSettings settings;

    public AccountService(MongoTemplate mongo, AppSettings settings) {
        this.mongo = mongo;
        this.settings = settings;
    }

    /**
     * @param devShop the X-Dev-Shop header: the developer works inside that shop,
     *                exactly like its owner. Ignored for everybody else.
     */
    public Account load(TokenService.Login login, String devShop) {
        Document user = login.userId() == null ? null : user(Ids.parse(login.userId()));
        if (user == null) {
            throw ApiException.error(401, "Your account no longer exists.");
        }
        if ("staff".equals(role(user)) && Boolean.FALSE.equals(user.get("active"))) {
            throw ApiException.error(401, "Your account is turned off. Please ask your admin.");
        }
        // A password change ends the logins made before it
        if (user.get("passwordChangedAt") instanceof Date changed && login.issuedAt() != null
                && login.issuedAt() < Math.floorDiv(changed.getTime(), 1000)) {
            throw ApiException.error(401, "Your password was changed. Please login again.");
        }

        boolean developer = isDeveloper(user);
        Account.DeveloperActor actor = null;
        if (developer && devShop != null && !devShop.isEmpty()) {
            Document shop = Ids.valid(devShop) ? shop(new ObjectId(devShop)) : null;
            Document owner = shop == null || !(shop.get("owner") instanceof ObjectId id) ? null : user(id);
            if (owner == null) {
                Map<String, Object> body = new LinkedHashMap<>();
                body.put("error", "That shop no longer exists.");
                body.put("devShopGone", true);
                throw new ApiException(404, body);
            }
            actor = new Account.DeveloperActor(user.getObjectId("_id").toHexString(), user.getString("name"), user.getString("email"));
            user = owner;
        }

        String role = role(user);
        return new Account(
                user.getObjectId("_id"),
                role,
                user.getString("name"),
                "admin".equals(role) ? user.getString("email") : null,
                user.getString("username"),
                user.get("shopId") instanceof ObjectId shopId ? shopId : null,
                permissions(user),
                passwordChange(user),
                developer,
                actor);
    }

    public CurrentShop shopOf(Account account) {
        Document shop = account.isStaff()
                ? (account.shopId() == null ? null : shop(account.shopId()))
                : ownedShop(account.id());
        if (shop == null) {
            throw ApiException.message(404, "Shop not found");
        }
        return new CurrentShop(shop.getObjectId("_id"), shop);
    }

    /** An owner whose confirmed email is listed in DEVELOPER_EMAILS. */
    public boolean isDeveloper(Document user) {
        if (!"admin".equals(role(user)) || Boolean.FALSE.equals(user.get("emailVerified"))) {
            return false;
        }
        String email = user.get("email") instanceof String text ? text.toLowerCase(Locale.ROOT) : "";
        return settings.developerEmails().contains(email);
    }

    // Accounts from before roles existed are owners
    private static String role(Document user) {
        return user.get("role") instanceof String role && !role.isEmpty() ? role : "admin";
    }

    private static Map<String, Boolean> permissions(Document user) {
        Document saved = user.get("permissions") instanceof Document d ? d : new Document();
        Map<String, Boolean> all = new LinkedHashMap<>();
        for (Permission p : Permission.values()) {
            all.put(p.key(), Boolean.TRUE.equals(saved.get(p.key())));
        }
        return all;
    }

    private static Document passwordChange(Document user) {
        Document saved = user.get("passwordChange") instanceof Document d ? new Document(d) : new Document();
        saved.putIfAbsent("status", "none");
        return saved;
    }

    // the password fingerprint and codes are never loaded here
    private Document user(ObjectId id) {
        Query query = Query.query(Criteria.where("_id").is(id));
        query.fields().exclude("password", "resetCode", "emailCode");
        return mongo.findOne(query, Document.class, "users");
    }

    private Document ownedShop(ObjectId owner) {
        Query query = Query.query(Criteria.where("owner").is(owner));
        query.fields().exclude("catalog");
        return mongo.findOne(query, Document.class, "shops");
    }

    // the catalog link is never sent along with a shop
    private Document shop(ObjectId id) {
        Query query = Query.query(Criteria.where("_id").is(id));
        query.fields().exclude("catalog");
        return mongo.findOne(query, Document.class, "shops");
    }
}
