package com.ordernest.server.activity;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

import jakarta.servlet.http.HttpServletRequest;

import org.bson.Document;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ordernest.server.common.JsText;
import com.ordernest.server.common.QueryText;
import com.ordernest.server.security.Account;
import com.ordernest.server.security.AdminOnly;
import com.ordernest.server.security.CurrentShop;
import com.ordernest.server.security.NeedsShop;
import com.ordernest.server.usage.Feature;
import com.ordernest.server.usage.UsageRecorder;

/** Who did what, newest first. For the admin only. */
@RestController
class ActivityController {

    private static final String COLLECTION = "activities";
    private static final List<String> KINDS = List.of("order", "staff", "product");
    private static final List<String> SEARCHED = List.of("summary", "targetLabel", "actor.name", "actor.username",
            "changes.to", "changes.from");
    private static final Pattern SPECIAL = Pattern.compile("[.*+?^${}()|\\[\\]\\\\]");
    private static final long MAX_PAGE_SIZE = 100;
    // far beyond any real history; keeps the arithmetic below from overflowing
    private static final long LAST_PAGE = 1_000_000_000L;

    private final MongoTemplate mongo;
    private final UsageRecorder usage;

    ActivityController(MongoTemplate mongo, UsageRecorder usage) {
        this.mongo = mongo;
        this.usage = usage;
    }

    // Query: page (from 1), limit (max 100), kind ("order" | "staff" | "product"), search
    @NeedsShop
    @AdminOnly
    @GetMapping("/api/activity")
    Map<String, Object> list(Account account, CurrentShop shop, HttpServletRequest request) {
        String asked = QueryText.of(request, "page");
        long page = Math.clamp(QueryText.number(asked, 1), 1, LAST_PAGE);
        int limit = (int) Math.clamp(QueryText.number(QueryText.of(request, "limit"), 50), 1, MAX_PAGE_SIZE);

        Criteria filter = Criteria.where("shop").is(shop.id());
        String kind = QueryText.of(request, "kind");
        if (kind != null && KINDS.contains(kind)) {
            filter.and("kind").is(kind);
        }
        String search = search(QueryText.of(request, "search"));
        if (!search.isEmpty()) {
            // what was typed is looked for as text, never run as a pattern
            String pattern = SPECIAL.matcher(search).replaceAll("\\\\$0");
            filter.orOperator(SEARCHED.stream().map(field -> Criteria.where(field).regex(pattern, "i")).toArray(Criteria[]::new));
        }

        Query query = Query.query(filter)
                .with(Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("_id")))
                .skip((page - 1) * limit)
                .limit(limit);
        query.fields().exclude("shop", "__v");
        List<Document> items = mongo.find(query, Document.class, COLLECTION);
        long total = mongo.count(Query.query(filter), COLLECTION);

        // opening the history counts once, not once per further page
        if (asked == null || asked.isEmpty() || asked.equals("1")) {
            usage.count(shop.id(), account, Feature.ACTIVITY_VIEW);
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("items", items);
        body.put("total", total);
        body.put("page", page);
        body.put("hasMore", page * limit < total);
        return body;
    }

    private static String search(String typed) {
        String text = typed == null ? "" : JsText.trim(typed);
        return text.substring(0, Math.min(100, text.length()));
    }
}
