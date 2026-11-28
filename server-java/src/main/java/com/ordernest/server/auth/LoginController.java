package com.ordernest.server.auth;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

import jakarta.servlet.http.HttpServletRequest;

import org.bson.Document;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ordernest.server.common.ApiException;
import com.ordernest.server.ratelimit.Limit;
import com.ordernest.server.ratelimit.RateLimited;
import com.ordernest.server.security.AccountService;
import com.ordernest.server.security.Passwords;
import com.ordernest.server.security.Public;
import com.ordernest.server.security.TokenService;
import com.ordernest.server.user.UserEdit;
import com.ordernest.server.user.Users;
import com.ordernest.server.web.RequestBodies;

import tools.jackson.databind.JsonNode;

@RestController
@RequestMapping("/api/auth")
class LoginController {

    private final Users users;
    private final Passwords passwords;
    private final TokenService tokens;
    private final AccountService accounts;

    LoginController(Users users, Passwords passwords, TokenService tokens, AccountService accounts) {
        this.users = users;
        this.passwords = passwords;
        this.tokens = tokens;
        this.accounts = accounts;
    }

    // Owners log in with their email, staff with their username (same box).
    // The old field name "email" still works.
    @Public
    @RateLimited({ Limit.LOGIN, Limit.LOGIN_ACCOUNT })
    @PostMapping("/login")
    Map<String, Object> login(HttpServletRequest request) {
        JsonNode body = RequestBodies.of(request);
        String typed = Requests.text(body, body.hasNonNull("identifier") ? "identifier" : "email");
        String identifier = Requests.clean(typed);
        String password = Requests.text(body, "password");
        if (identifier.isEmpty() || password == null || password.isEmpty()) {
            throw ApiException.error(400, "Please enter your email or username and password.");
        }

        Optional<UserEdit> found = identifier.contains("@") ? users.byEmail(identifier) : users.byUsername(identifier);
        Document user = found.map(UserEdit::stored).orElse(null);
        // the same answer for "no such account" and "wrong password"
        if (!passwords.matches(password, user == null ? null : user.getString("password"))) {
            throw ApiException.error(401, "Wrong email, username or password.");
        }
        if ("staff".equals(Users.role(user)) && Boolean.FALSE.equals(user.get("active"))) {
            throw ApiException.error(403, "Your account is turned off. Please ask your admin.");
        }
        if (Boolean.FALSE.equals(user.get("emailVerified"))) {
            Map<String, Object> refusal = new LinkedHashMap<>();
            refusal.put("code", "EMAIL_NOT_VERIFIED");
            refusal.put("error", "Please confirm your email first.");
            throw new ApiException(403, refusal);
        }

        Map<String, Object> answer = new LinkedHashMap<>();
        answer.put("user", Users.publicView(user));
        answer.put("token", tokens.create(user.getObjectId("_id")));
        answer.put("isDeveloper", accounts.isDeveloper(user));
        return answer;
    }
}
