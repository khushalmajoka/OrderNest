package com.ordernest.server.usage;

import java.util.Arrays;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Every feature that is counted. SERVER features are counted by the server
 * itself; APP features are reported by the web app (things that only happen on
 * screen). The list must match the Node server's (a test checks this).
 */
public enum Feature {
    ORDER_CREATE("order.create", "Create order", "Orders", false),
    ORDER_EDIT("order.edit", "Edit order details", "Orders", false),
    ORDER_STATUS("order.status", "Change an order's status", "Orders", false),
    ORDERS_BULK_STATUS("orders.bulk_status", "Change the status of several orders", "Orders", false),
    ORDER_DELETE("order.delete", "Delete order", "Orders", false),
    ORDERS_SEARCH("orders.search", "Search orders", "Orders", true),
    ORDERS_FILTER("orders.filter", "Use filters", "Orders", true),
    ORDERS_SORT("orders.sort", "Sort the list", "Orders", true),
    ORDERS_TILE("orders.tile", "Tap a dashboard tile", "Orders", true),
    ORDERS_REFRESH("orders.refresh", "Press Refresh", "Orders", true),
    ORDERS_BULK_UPLOAD("orders.bulk_upload", "Bulk upload (Excel)", "Orders", false),
    ORDERS_EXPORT("orders.export", "Export (Excel)", "Orders", false),
    PRODUCT_CREATE("product.create", "Add a product", "Products", false),
    PRODUCT_IMAGE("product.image", "Product pictures added, removed or ordered", "Products", false),
    CATEGORY_MANAGE("category.manage", "Category added, renamed or deleted", "Products", false),
    CATEGORY_MOVE("category.move", "Products moved to a category", "Products", false),
    PRODUCT_EDIT("product.edit", "Edit or archive a product", "Products", false),
    WHATSAPP_OPEN("whatsapp.open", "WhatsApp window opened", "Sharing", true),
    WHATSAPP_SEND("whatsapp.send", "WhatsApp message started", "Sharing", true),
    SHARE_OPEN("share.open", "Share picture window", "Sharing", true),
    SLIP_OPEN("slip.open", "Delivery slip window", "Sharing", true),
    TRACKING_VIEW("tracking.view", "Customer tracked an order", "Customers", false),
    CATALOG_VIEW("catalog.view", "Customer opened the catalog", "Customers", false),
    CATALOG_MANAGE("catalog.manage", "Catalog switched, changed or products shown/hidden", "Products", false),
    ACTIVITY_VIEW("activity.view", "Activity history opened", "Admin", false),
    STAFF_MANAGE("staff.manage", "Staff changes", "Admin", false),
    SETTINGS_PROFILE("settings.profile", "Shop details saved", "Settings", false),
    SETTINGS_STATUSES("settings.statuses", "Statuses switched on/off", "Settings", false),
    PRODUCT_FROM_ORDERS("product.from_orders", "Products added from old orders", "Products", false),
    SETTINGS_SHARE_PICTURE("settings.share_picture", "Share picture setting saved", "Settings", false),
    PRODUCTS_TIDY_SIZES("products.tidy_sizes", "Product sizes made the same way", "Products", false),
    SETTINGS_NEEDS_REVIEW("settings.needs_review", "Needs review setting saved", "Settings", false),
    ORDERS_REVIEW_SNOOZE("orders.review_snooze", "Needs review: Not yet", "Orders", false),
    ORDERS_REVIEW_OPEN("orders.review_open", "Needs review list opened", "Orders", true),
    SETTINGS_WHATSAPP_PROMPT("settings.whatsapp_prompt", "WhatsApp question statuses saved", "Settings", false),
    SETTINGS_COLORS("settings.colors", "Status colours saved", "Settings", false),
    SETTINGS_COLUMNS("settings.columns", "Table columns saved", "Settings", false),
    SETTINGS_SLIP("settings.slip", "Delivery slip settings saved", "Settings", false),
    SETTINGS_WHATSAPP("settings.whatsapp", "WhatsApp messages saved", "Settings", false),
    TOOL_CLOSE_OLD("tool.close_old", "Close old orders tool used", "Settings", false),
    TOOL_CLEAN_NAMES("tool.clean_names", "Clean customer names tool used", "Settings", false);

    private final String key;
    private final String label;
    private final String group;
    private final boolean fromApp;

    Feature(String key, String label, String group, boolean fromApp) {
        this.key = key;
        this.label = label;
        this.group = group;
        this.fromApp = fromApp;
    }

    public String key() {
        return key;
    }

    public String label() {
        return label;
    }

    public String group() {
        return group;
    }

    public boolean fromApp() {
        return fromApp;
    }

    private static final Map<String, Feature> BY_KEY = Arrays.stream(values())
            .collect(Collectors.toUnmodifiableMap(Feature::key, Function.identity()));

    /** The feature with this key, if the web app is the one that reports it. */
    public static Optional<Feature> reportedByApp(String key) {
        return Optional.ofNullable(BY_KEY.get(key)).filter(Feature::fromApp);
    }
}
