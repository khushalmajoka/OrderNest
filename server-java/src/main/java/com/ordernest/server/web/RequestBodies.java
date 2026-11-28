package com.ordernest.server.web;

import jakarta.servlet.http.HttpServletRequest;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.JsonNodeFactory;

/** The JSON body read by {@link JsonBodyFilter}; an empty object when there is none. */
public final class RequestBodies {

    static final String ATTRIBUTE = "ordernest.json-body";

    private RequestBodies() {
    }

    public static JsonNode of(HttpServletRequest request) {
        Object body = request.getAttribute(ATTRIBUTE);
        return body instanceof JsonNode node ? node : JsonNodeFactory.instance.objectNode();
    }
}
