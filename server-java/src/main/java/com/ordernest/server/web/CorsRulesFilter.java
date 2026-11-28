package com.ordernest.server.web;

import java.io.IOException;
import java.util.List;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Which websites may call this API from a browser. Follows the Node "cors"
 * package: a website that is not allowed simply gets no CORS headers.
 */
class CorsRulesFilter extends OncePerRequestFilter {

    private final List<String> allowed;

    CorsRulesFilter(List<String> allowed) {
        this.allowed = allowed;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String origin = request.getHeader("Origin");
        if (!allowed.isEmpty() && origin != null && !allowed.contains(origin)) {
            chain.doFilter(request, response);
            return;
        }
        if (allowed.isEmpty()) {
            response.setHeader("Access-Control-Allow-Origin", "*");
        } else {
            if (origin != null) {
                response.setHeader("Access-Control-Allow-Origin", origin);
            }
            response.addHeader("Vary", "Origin");
        }
        if ("OPTIONS".equals(request.getMethod())) {
            response.setHeader("Access-Control-Allow-Methods", "GET,HEAD,PUT,PATCH,POST,DELETE");
            String wanted = request.getHeader("Access-Control-Request-Headers");
            if (wanted != null) {
                response.setHeader("Access-Control-Allow-Headers", wanted);
                response.addHeader("Vary", "Access-Control-Request-Headers");
            }
            response.setStatus(204);
            response.setContentLength(0);
            return;
        }
        chain.doFilter(request, response);
    }
}
