package com.ordernest.server;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Date;
import java.util.List;
import java.util.Map;

import org.bson.Document;
import org.bson.types.ObjectId;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.mongodb.MongoDBContainer;

import com.ordernest.server.security.Account;
import com.ordernest.server.security.AdminOnly;
import com.ordernest.server.security.CurrentShop;
import com.ordernest.server.security.DeveloperOnly;
import com.ordernest.server.security.Needs;
import com.ordernest.server.security.NeedsShop;
import com.ordernest.server.security.Permission;
import com.ordernest.server.security.StaffOnly;
import com.ordernest.server.security.TokenService;

/** The whole app with a throwaway database: who gets in, and who is refused. */
@Testcontainers
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = { "JWT_SECRET=a-test-only-key!", "DEVELOPER_EMAILS=dev@example.test" })
@Import(AccessRulesTest.GuardedPages.class)
class AccessRulesTest {

    @Container
    static final MongoDBContainer MONGO = new MongoDBContainer("mongo:8.0");

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry registry) {
        registry.add("spring.mongodb.uri", () -> MONGO.getReplicaSetUrl("ordernest-test"));
    }

    // pages that exist only in this test, one per rule
    @TestConfiguration
    static class GuardedPages {
        @RestController
        static class Pages {
            @GetMapping("/test/numbers")
            Map<String, Object> numbers(Account account) {
                return Map.of("n", 8.0);
            }

            @GetMapping("/test/login")
            Map<String, Object> login(Account account) {
                return Map.of("name", account.name());
            }

            @NeedsShop
            @GetMapping("/test/shop")
            Map<String, Object> shop(CurrentShop shop) {
                return Map.of("shop", shop.document().getString("name"), "hasCatalog", shop.document().containsKey("catalog"));
            }

            @AdminOnly
            @GetMapping("/test/admin")
            Map<String, Object> admin() {
                return Map.of();
            }

            @StaffOnly
            @GetMapping("/test/staff")
            Map<String, Object> staff() {
                return Map.of();
            }

            @Needs(Permission.DELETE_ORDERS)
            @GetMapping("/test/delete")
            Map<String, Object> delete() {
                return Map.of();
            }

            @DeveloperOnly
            @GetMapping("/test/developer")
            Map<String, Object> developer() {
                return Map.of();
            }
        }
    }

    private static final ObjectId OWNER = new ObjectId();
    private static final ObjectId STAFF = new ObjectId();
    private static final ObjectId HELPER = new ObjectId();
    private static final ObjectId DEV = new ObjectId();
    private static final ObjectId SHOP = new ObjectId();

    @LocalServerPort
    int port;

    @Autowired
    MongoTemplate mongo;

    @Autowired
    TokenService tokens;

    @BeforeEach
    void people() {
        mongo.getCollection("users").deleteMany(new Document());
        mongo.getCollection("shops").deleteMany(new Document());
        mongo.getCollection("users").insertMany(List.of(
                new Document("_id", OWNER).append("name", "Owner").append("email", "owner@example.test").append("role", "admin"),
                new Document("_id", STAFF).append("name", "Staff").append("role", "staff").append("username", "s")
                        .append("shopId", SHOP).append("permissions", new Document("deleteOrders", true)),
                new Document("_id", HELPER).append("name", "Helper").append("role", "staff").append("username", "h").append("shopId", SHOP),
                new Document("_id", DEV).append("name", "Dev").append("email", "Dev@example.test")));
        mongo.getCollection("shops").insertOne(new Document("_id", SHOP).append("name", "Test Shop").append("owner", OWNER)
                .append("catalog", new Document("token", "secret")));
    }

    private HttpResponse<String> get(String path, ObjectId who, String... headers) throws Exception {
        HttpRequest.Builder request = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + path));
        if (who != null) {
            request.header("Authorization", "Bearer " + tokens.create(who));
        }
        if (headers.length > 0) {
            request.headers(headers);
        }
        try (HttpClient client = HttpClient.newHttpClient()) {
            return client.send(request.build(), HttpResponse.BodyHandlers.ofString());
        }
    }

    private void expect(int status, String body, HttpResponse<String> response) {
        assertEquals(status + " " + body, response.statusCode() + " " + response.body());
    }

    @Test
    void everythingNeedsALoginUnlessMarkedPublic() throws Exception {
        expect(401, "{\"error\":\"Unauthorized: No token provided\"}", get("/test/login", null));
        expect(401, "{\"error\":\"Unauthorized: Invalid token\"}", get("/test/login", null, "Authorization", "Bearer nonsense"));
        expect(401, "{\"error\":\"Your account no longer exists.\"}", get("/test/login", new ObjectId()));
        expect(200, "{\"name\":\"Owner\"}", get("/test/login", OWNER));
        assertEquals(200, get("/health", null).statusCode());
        expect(200, "{\"n\":8}", get("/test/numbers", OWNER));
    }

    @Test
    void aPasswordChangeAndATurnedOffAccountEndTheLogin() throws Exception {
        mongo.getCollection("users").updateOne(new Document("_id", OWNER),
                new Document("$set", new Document("passwordChangedAt", new Date(System.currentTimeMillis() + 60_000))));
        expect(401, "{\"error\":\"Your password was changed. Please login again.\"}", get("/test/login", OWNER));
        mongo.getCollection("users").updateOne(new Document("_id", STAFF), new Document("$set", new Document("active", false)));
        expect(401, "{\"error\":\"Your account is turned off. Please ask your admin.\"}", get("/test/login", STAFF));
    }

    @Test
    void rolesAndPermissions() throws Exception {
        assertEquals(200, get("/test/admin", OWNER).statusCode());
        expect(403, "{\"error\":\"Only the admin can do this.\"}", get("/test/admin", STAFF));
        expect(403, "{\"error\":\"This is only for staff accounts.\"}", get("/test/staff", OWNER));
        assertEquals(200, get("/test/delete", OWNER).statusCode());
        assertEquals(200, get("/test/delete", STAFF).statusCode());
        expect(403, "{\"error\":\"You do not have permission to do this. Ask your admin.\"}", get("/test/delete", HELPER));
    }

    @Test
    void shopOfTheCallerWithoutTheCatalogLink() throws Exception {
        HttpResponse<String> mine = get("/test/shop", OWNER);
        assertEquals(200, mine.statusCode());
        assertTrue(mine.body().contains("\"shop\":\"Test Shop\""), mine.body());
        assertTrue(mine.body().contains("\"hasCatalog\":false"), mine.body());
        assertEquals(200, get("/test/shop", HELPER).statusCode());
        expect(404, "{\"message\":\"Shop not found\"}", get("/test/shop", DEV));
    }

    @Test
    void onlyTheDeveloperCanWorkInsideAShop() throws Exception {
        expect(404, "{\"success\":false,\"message\":\"Not found\"}", get("/test/developer", OWNER));
        assertEquals(200, get("/test/developer", DEV).statusCode());
        expect(200, "{\"name\":\"Owner\"}", get("/test/login", DEV, "X-Dev-Shop", SHOP.toHexString()));
        expect(404, "{\"error\":\"That shop no longer exists.\",\"devShopGone\":true}", get("/test/login", DEV, "X-Dev-Shop", "x"));
        expect(200, "{\"name\":\"Staff\"}", get("/test/login", STAFF, "X-Dev-Shop", new ObjectId().toHexString()));
    }
}
