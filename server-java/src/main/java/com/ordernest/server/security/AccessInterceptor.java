package com.ordernest.server.security;

import jakarta.servlet.DispatcherType;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

import com.ordernest.server.common.ApiException;
import com.ordernest.server.ratelimit.RateLimited;
import com.ordernest.server.ratelimit.RateLimiter;

/**
 * Runs before every controller method, in the same order as the Node server:
 * login, account, shop, role or permission, rate limit. A method needs a login
 * unless it is marked {@link Public}.
 */
@Component
class AccessInterceptor implements HandlerInterceptor {

    static final String ACCOUNT = "ordernest.account";
    static final String SHOP = "ordernest.shop";

    private final AccountService accounts;
    private final RateLimiter limiter;

    AccessInterceptor(AccountService accounts, RateLimiter limiter) {
        this.accounts = accounts;
        this.limiter = limiter;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if (!(handler instanceof HandlerMethod method) || "OPTIONS".equals(request.getMethod())
                || request.getDispatcherType() != DispatcherType.REQUEST) {
            return true;
        }
        RateLimited limits = method.getMethodAnnotation(RateLimited.class);
        if (limits != null && limits.beforeLogin()) {
            limiter.check(limits.value(), request, response);
        }
        if (!method.hasMethodAnnotation(Public.class)) {
            checkAccess(request, method);
        }
        if (limits != null && !limits.beforeLogin()) {
            limiter.check(limits.value(), request, response);
        }
        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
        limiter.finished(request, response);
    }

    private void checkAccess(HttpServletRequest request, HandlerMethod method) {
        Account account = accounts.load(login(request), request.getHeader("X-Dev-Shop"));
        request.setAttribute(ACCOUNT, account);

        if (method.hasMethodAnnotation(NeedsShop.class)) {
            request.setAttribute(SHOP, accounts.shopOf(account));
        }
        if (method.hasMethodAnnotation(AdminOnly.class) && !account.isAdmin()) {
            throw ApiException.error(403, "Only the admin can do this.");
        }
        if (method.hasMethodAnnotation(StaffOnly.class) && !account.isStaff()) {
            throw ApiException.error(403, "This is only for staff accounts.");
        }
        Needs needs = method.getMethodAnnotation(Needs.class);
        if (needs != null && !account.can(needs.value())) {
            throw ApiException.error(403, "You do not have permission to do this. Ask your admin.");
        }
        if (method.hasMethodAnnotation(DeveloperOnly.class) && !account.developer()) {
            throw ApiException.failure(404, "Not found");
        }
    }

    private static TokenService.Login login(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) {
            throw ApiException.error(401, "Unauthorized: No token provided");
        }
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof TokenService.Login login) {
            return login;
        }
        throw ApiException.error(401, "Unauthorized: Invalid token");
    }
}
