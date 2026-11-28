package com.ordernest.server.web;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.http.MediaType;
import org.springframework.web.filter.OncePerRequestFilter;

import com.ordernest.server.common.ApiException;

import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * Reads a JSON body once, before anything else looks at the request, with the
 * Node server's rules: only objects and lists, at most 10 MB, and a body that
 * is not JSON is refused even before the login is checked.
 */
class JsonBodyFilter extends OncePerRequestFilter {

    static final int LIMIT = 10 * 1024 * 1024;

    private final ObjectMapper mapper;

    JsonBodyFilter(ObjectMapper mapper) {
        this.mapper = mapper;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        if (isJson(request.getContentType())) {
            if (request.getContentLengthLong() > LIMIT) {
                refuse(response, 413, "request entity too large");
                return;
            }
            byte[] bytes = request.getInputStream().readNBytes(LIMIT + 1);
            if (bytes.length > LIMIT) {
                refuse(response, 413, "request entity too large");
                return;
            }
            String text = new String(bytes, StandardCharsets.UTF_8).strip();
            if (!text.isEmpty()) {
                JsonNode body = null;
                try {
                    if (text.charAt(0) == '{' || text.charAt(0) == '[') {
                        body = mapper.readTree(text);
                    }
                } catch (JacksonException e) {
                    // answered below
                }
                if (body == null) {
                    refuse(response, 400, "The request is not valid JSON.");
                    return;
                }
                request.setAttribute(RequestBodies.ATTRIBUTE, body);
            }
        }
        chain.doFilter(request, response);
    }

    private static boolean isJson(String contentType) {
        if (contentType == null) {
            return false;
        }
        String type = contentType.split(";", 2)[0].strip();
        return type.equalsIgnoreCase(MediaType.APPLICATION_JSON_VALUE);
    }

    private void refuse(HttpServletResponse response, int status, String message) throws IOException {
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getOutputStream().write(mapper.writeValueAsBytes(ApiException.failureBody(message)));
    }
}
