package com.ordernest.server.auth;

import java.util.Date;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Pattern;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ordernest.server.auth.EmailCodes.Purpose;
import com.ordernest.server.common.ApiException;
import com.ordernest.server.common.JsText;
import com.ordernest.server.ratelimit.Limit;
import com.ordernest.server.ratelimit.RateLimited;
import com.ordernest.server.security.Account;
import com.ordernest.server.security.AdminOnly;
import com.ordernest.server.security.Passwords;
import com.ordernest.server.security.Public;
import com.ordernest.server.security.TokenService;
import com.ordernest.server.user.UserEdit;
import com.ordernest.server.user.Users;
import com.ordernest.server.web.RequestBodies;

import tools.jackson.databind.JsonNode;

/** Changing a password, and getting a new one by an emailed code. */
@RestController
@RequestMapping("/api/auth")
class PasswordController {

    private static final Pattern SIX_DIGITS = Pattern.compile("\\d{6}");

    private final Users users;
    private final Passwords passwords;
    private final EmailCodes codes;
    private final CodeMail mail;
    private final TokenService tokens;

    PasswordController(Users users, Passwords passwords, EmailCodes codes, CodeMail mail, TokenService tokens) {
        this.users = users;
        this.passwords = passwords;
        this.codes = codes;
        this.mail = mail;
        this.tokens = tokens;
    }

    // Logins on other devices stop working; this one gets a fresh token.
    @AdminOnly
    @RateLimited(Limit.CHANGE_PASSWORD)
    @PostMapping("/change-password")
    Map<String, Object> changePassword(Account account, HttpServletRequest request) {
        JsonNode body = RequestBodies.of(request);
        UserEdit user = users.byId(account.id()).orElseThrow();
        String current = Requests.text(body, "currentPassword");
        if (current == null || !passwords.matches(current, user.stored().getString("password"))) {
            throw ApiException.error(400, "Your current password is not right.");
        }
        String wanted = Requests.requireNewPassword(Requests.text(body, "newPassword"));
        if (wanted.equals(current)) {
            throw ApiException.error(400, "The new password must be different.");
        }
        replacePassword(user, wanted);

        Map<String, Object> answer = new LinkedHashMap<>();
        answer.put("message", "Password changed. Other devices were logged out.");
        answer.put("token", tokens.create(user.id()));
        return answer;
    }

    // The same answer whether or not the email has an account.
    @Public
    @RateLimited(Limit.FORGOT)
    @PostMapping("/forgot-password")
    Map<String, Object> forgotPassword(HttpServletRequest request) {
        String email = Requests.requireEmail(Requests.clean(Requests.text(RequestBodies.of(request), "email")));
        mail.requireAvailable();

        users.ownerByEmail(email)
                .filter(user -> !Boolean.FALSE.equals(user.stored().get("emailVerified")))
                .ifPresent(user -> {
                    Optional<String> code = codes.issue(user, Purpose.RESET_PASSWORD, null);
                    if (code.isPresent()) { // asked again too soon: nothing is sent
                        users.save(user);
                        mail.resetPassword(user.stored().getString("email"), code.get());
                    }
                });
        return Map.of("message",
                "If this email has an account, we sent a 6-digit code. It works for " + EmailCodes.MINUTES + " minutes.");
    }

    @Public
    @RateLimited(Limit.RESET)
    @PostMapping("/reset-password")
    Map<String, Object> resetPassword(HttpServletRequest request) {
        JsonNode body = RequestBodies.of(request);
        String email = Requests.clean(Requests.text(body, "email"));
        String code = Requests.text(body, "code");
        if (!Requests.isEmail(email) || code == null || !SIX_DIGITS.matcher(JsText.trim(code)).matches()) {
            throw new WrongCode();
        }
        String wanted = Requests.requireNewPassword(Requests.text(body, "newPassword"));

        UserEdit user = users.ownerByEmail(email).orElseThrow(WrongCode::new);
        if (!codes.check(user, Purpose.RESET_PASSWORD, code)) {
            users.save(user); // keeps the count of wrong tries
            throw new WrongCode();
        }
        replacePassword(user, wanted);
        return Map.of("message", "Password changed. You can login now.");
    }

    private void replacePassword(UserEdit user, String password) {
        user.set("password", passwords.hash(password));
        user.set("passwordChangedAt", new Date()); // ends every older login
        user.unset("resetCode"); // an unused forgot-password code must not work any more
        users.save(user);
    }
}
