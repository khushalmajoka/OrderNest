package com.ordernest.server.auth;

import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;

import jakarta.servlet.http.HttpServletRequest;

import org.bson.Document;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ordernest.server.auth.EmailCodes.Purpose;
import com.ordernest.server.common.ApiException;
import com.ordernest.server.ratelimit.Limit;
import com.ordernest.server.ratelimit.RateLimited;
import com.ordernest.server.security.Account;
import com.ordernest.server.security.AdminOnly;
import com.ordernest.server.security.Passwords;
import com.ordernest.server.user.UserEdit;
import com.ordernest.server.user.Users;
import com.ordernest.server.web.RequestBodies;

import tools.jackson.databind.JsonNode;

/** The owner moving to a new email. The code goes to the NEW address. */
@RestController
@RequestMapping("/api/auth/change-email")
class ChangeEmailController {

    private final Users users;
    private final Passwords passwords;
    private final EmailCodes codes;
    private final CodeMail mail;

    ChangeEmailController(Users users, Passwords passwords, EmailCodes codes, CodeMail mail) {
        this.users = users;
        this.passwords = passwords;
        this.codes = codes;
        this.mail = mail;
    }

    @AdminOnly
    @RateLimited(Limit.FORGOT)
    @PostMapping("/request")
    Map<String, Object> request(Account account, HttpServletRequest request) {
        JsonNode body = RequestBodies.of(request);
        String newEmail = Requests.requireEmail(Requests.clean(Requests.text(body, "newEmail")));
        mail.requireAvailable();

        UserEdit user = users.byId(account.id()).orElseThrow();
        String password = Requests.text(body, "password");
        if (password == null || !passwords.matches(password, user.stored().getString("password"))) {
            throw ApiException.error(400, "Your password is not right.");
        }
        if (newEmail.equals(user.stored().getString("email").toLowerCase(Locale.ROOT))) {
            throw ApiException.error(400, "This is already your email.");
        }
        if (users.emailTaken(newEmail, null)) {
            throw taken();
        }

        String code = codes.issue(user, Purpose.CHANGE_EMAIL, newEmail).orElseThrow(
                () -> ApiException.error(400, "A code was just sent. Please wait a minute before asking again."));
        users.save(user);
        mail.confirmNewEmail(newEmail, code);
        return Map.of("message",
                "We sent a 6-digit code to " + newEmail + ". It works for " + EmailCodes.MINUTES + " minutes.");
    }

    @AdminOnly
    @RateLimited(Limit.RESET)
    @PostMapping("/confirm")
    Map<String, Object> confirm(Account account, HttpServletRequest request) {
        UserEdit user = users.byId(account.id()).orElseThrow();
        String newEmail = user.stored().get("emailCode") instanceof Document saved
                && saved.get("newEmail") instanceof String text ? text : "";

        if (newEmail.isEmpty()
                || !codes.check(user, Purpose.CHANGE_EMAIL, Requests.text(RequestBodies.of(request), "code"))) {
            users.save(user);
            throw new WrongCode();
        }
        // someone may have taken it in the meantime
        if (users.emailTaken(newEmail, user.id())) {
            throw taken();
        }
        user.set("email", newEmail);
        user.set("emailVerified", true);
        user.unset("emailCode");
        try {
            users.save(user);
        } catch (DuplicateKeyException twoAtOnce) {
            throw taken();
        }
        Map<String, Object> answer = new LinkedHashMap<>();
        answer.put("email", newEmail);
        answer.put("message", "Your email was changed.");
        return answer;
    }

    private static ApiException taken() {
        return ApiException.error(400, "This email is already used by another account.");
    }
}
