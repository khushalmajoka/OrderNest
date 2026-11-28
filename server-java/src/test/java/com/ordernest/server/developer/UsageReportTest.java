package com.ordernest.server.developer;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;

import com.ordernest.server.usage.Feature;

class UsageReportTest {

    // The order Node's localeCompare gives these names, when nothing was used
    @Test
    void featuresNobodyUsedAreListedByNameAsNodeDoes() {
        List<String> node = List.of(
                "activity.view",
                "product.create",
                "orders.bulk_upload",
                "catalog.manage",
                "category.manage",
                "order.status",
                "orders.bulk_status",
                "tool.clean_names",
                "tool.close_old",
                "order.create",
                "catalog.view",
                "tracking.view",
                "order.delete",
                "settings.slip",
                "slip.open",
                "product.edit",
                "order.edit",
                "orders.export",
                "orders.review_open",
                "settings.needs_review",
                "orders.review_snooze",
                "orders.refresh",
                "product.image",
                "products.tidy_sizes",
                "product.from_orders",
                "category.move",
                "orders.search",
                "settings.share_picture",
                "share.open",
                "settings.profile",
                "orders.sort",
                "staff.manage",
                "settings.colors",
                "settings.statuses",
                "settings.columns",
                "orders.tile",
                "orders.filter",
                "whatsapp.send",
                "settings.whatsapp",
                "settings.whatsapp_prompt",
                "whatsapp.open");
        assertEquals(node, UsageReport.ordered(Map.of()).stream().map(Feature::key).toList());
    }
}
