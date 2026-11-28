package com.ordernest.server.common;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * An answer that ends the request. The web app reads {@code error} from some
 * answers and {@code message} from others, so each place says which one.
 */
public class ApiException extends RuntimeException {

    private final int status;
    private final transient Map<String, Object> body;

    public ApiException(int status, Map<String, Object> body) {
        super(String.valueOf(body), null, false, false);
        this.status = status;
        this.body = body;
    }

    public static ApiException error(int status, String text) {
        return new ApiException(status, Map.of("error", text));
    }

    public static ApiException message(int status, String text) {
        return new ApiException(status, Map.of("message", text));
    }

    /** The shape the Node server's last error handler uses. */
    public static ApiException failure(int status, String text) {
        return new ApiException(status, failureBody(text));
    }

    public static Map<String, Object> failureBody(String text) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("success", false);
        body.put("message", text);
        return body;
    }

    public int status() {
        return status;
    }

    public Map<String, Object> body() {
        return body;
    }
}
