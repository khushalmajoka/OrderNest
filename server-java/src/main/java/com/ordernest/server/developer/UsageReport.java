package com.ordernest.server.developer;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.Date;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.regex.Pattern;

import org.bson.Document;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Component;

import com.ordernest.server.common.BusinessDay;
import com.ordernest.server.usage.Feature;

/** How much each feature was used over the last 7, 30 or 90 days. */
@Component
class UsageReport {

    private static final List<Integer> DAYS = List.of(7, 30, 90);
    private static final Pattern WHOLE_NUMBER = Pattern.compile("\\s*\\+?\\d{1,4}(\\.0*)?\\s*");

    private final MongoTemplate mongo;
    private final BusinessDay day;

    UsageReport(MongoTemplate mongo, BusinessDay day) {
        this.mongo = mongo;
        this.day = day;
    }

    private static final class Tally {
        long count;
        Date lastAt;
        final Set<Object> users = new HashSet<>();
        final Set<String> days = new HashSet<>();
    }

    Map<String, Object> build(String askedDays, ShopScopes.Scope scope) {
        int days = days(askedDays);
        Instant now = Instant.now();

        Document match = scope.filter("shop").append("day", new Document("$gte", dayAgo(now, days - 1)));
        Map<String, Tally> byFeature = new HashMap<>();
        Map<String, Long> daily = new HashMap<>();
        Set<Object> activeUsers = new HashSet<>();
        long total = 0;
        for (Document row : mongo.getCollection("usagecounts").find(match)) {
            Tally tally = byFeature.computeIfAbsent(row.getString("feature"), key -> new Tally());
            long count = row.get("count") instanceof Number n ? n.longValue() : 0;
            tally.count += count;
            total += count;
            if (row.get("users") instanceof List<?> users) {
                tally.users.addAll(users);
                activeUsers.addAll(users);
            }
            Date lastAt = row.get("lastAt") instanceof Date date ? date : null;
            if (tally.lastAt == null || (lastAt != null && lastAt.after(tally.lastAt))) {
                tally.lastAt = lastAt;
            }
            tally.days.add(row.getString("day"));
            daily.merge(row.getString("day"), count, Long::sum);
        }

        // the first day anything was counted
        Document first = mongo.getCollection("usagecounts").find(scope.filter("shop"))
                .sort(new Document("day", 1)).projection(new Document("day", 1)).first();

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("days", days);
        body.put("since", first == null ? null : first.getString("day"));
        body.put("total", total);
        body.put("people", people(scope));
        body.put("activePeople", activeUsers.size());
        body.put("features", features(byFeature, total));
        body.put("series", series(now, days, daily));
        // always every shop, for the shop picker
        body.put("shops", everyShop());
        body.put("shop", scope.all() ? "all" : scope.shop().toHexString());
        return body;
    }

    private static int days(String asked) {
        if (asked != null && WHOLE_NUMBER.matcher(asked).matches()) {
            int value = (int) Double.parseDouble(asked.strip());
            if (DAYS.contains(value)) {
                return value;
            }
        }
        return 30;
    }

    private String dayAgo(Instant now, int ago) {
        return day.stamp(now.minus(Duration.ofDays(ago)));
    }

    // the owners and the turned-on staff: everyone who could use the app
    private long people(ShopScopes.Scope scope) {
        List<Object> ids = new ArrayList<>();
        List<Object> owners = new ArrayList<>();
        for (Document shop : mongo.getCollection("shops").find(scope.filter("_id")).projection(new Document("owner", 1))) {
            ids.add(shop.get("_id"));
            owners.add(shop.get("owner"));
        }
        owners.removeIf(Objects::isNull);
        return mongo.getCollection("users").countDocuments(new Document("$or", List.of(
                new Document("_id", new Document("$in", owners)),
                new Document("shopId", new Document("$in", ids))))
                .append("active", new Document("$ne", false)));
    }

    // Most used first, then by name. Plain letter order (capitals ignored) gives
    // the Node server's order for these names; Java's Collator does not, because
    // it skips spaces. A test checks the order.
    static List<Feature> ordered(Map<Feature, Long> counts) {
        Comparator<Feature> mostUsed = Comparator.comparing((Feature f) -> counts.getOrDefault(f, 0L)).reversed();
        return Arrays.stream(Feature.values())
                .sorted(mostUsed.thenComparing(Feature::label, String.CASE_INSENSITIVE_ORDER))
                .toList();
    }

    private static List<Map<String, Object>> features(Map<String, Tally> byFeature, long total) {
        Map<Feature, Long> counts = new HashMap<>();
        for (Feature feature : Feature.values()) {
            Tally tally = byFeature.get(feature.key());
            counts.put(feature, tally == null ? 0 : tally.count);
        }
        return ordered(counts).stream().map(feature -> {
            Tally tally = byFeature.get(feature.key());
            Map<String, Object> out = new LinkedHashMap<>();
            out.put("key", feature.key());
            out.put("label", feature.label());
            out.put("group", feature.group());
            out.put("count", tally == null ? 0 : tally.count);
            out.put("share", tally == null || total == 0 ? 0.0 : ((double) tally.count / total) * 100);
            out.put("people", tally == null ? 0 : tally.users.size());
            out.put("daysUsed", tally == null ? 0 : tally.days.size());
            out.put("lastAt", tally == null ? null : tally.lastAt);
            return out;
        }).toList();
    }

    // one number per day, oldest first, for the small bar chart
    private List<Map<String, Object>> series(Instant now, int days, Map<String, Long> daily) {
        List<Map<String, Object>> series = new ArrayList<>();
        for (int ago = days - 1; ago >= 0; ago--) {
            String stamp = dayAgo(now, ago);
            Map<String, Object> point = new LinkedHashMap<>();
            point.put("day", stamp);
            point.put("count", daily.getOrDefault(stamp, 0L));
            series.add(point);
        }
        return series;
    }

    private List<Map<String, Object>> everyShop() {
        List<Map<String, Object>> shops = new ArrayList<>();
        for (Document shop : mongo.getCollection("shops").find().projection(new Document("name", 1)).sort(new Document("name", 1))) {
            Map<String, Object> out = new LinkedHashMap<>();
            out.put("id", shop.getObjectId("_id").toHexString());
            Fields.copy(shop, "name", out, "name");
            shops.add(out);
        }
        return shops;
    }
}
