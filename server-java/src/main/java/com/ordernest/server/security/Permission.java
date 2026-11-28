package com.ordernest.server.security;

/** What a staff member can be allowed to do. Seeing orders is always allowed. */
public enum Permission {
    CREATE_ORDERS("createOrders"),
    EDIT_ORDERS("editOrders"),
    DELETE_ORDERS("deleteOrders"),
    SHARE_SLIP("shareSlip"),
    VIEW_AMOUNTS("viewAmounts"),
    MANAGE_PRODUCTS("manageProducts");

    private final String key;

    Permission(String key) {
        this.key = key;
    }

    /** The name saved in the database. */
    public String key() {
        return key;
    }
}
