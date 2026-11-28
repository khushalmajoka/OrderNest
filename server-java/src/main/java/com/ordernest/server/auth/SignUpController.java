package com.ordernest.server.auth;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

import jakarta.servlet.http.HttpServletRequest;

import org.bson.Document;
import org.bson.types.ObjectId;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ordernest.server.auth.EmailCodes.Purpose;
import com.ordernest.server.common.ApiException;
import com.ordernest.server.common.JsText;
import com.ordernest.server.config.AppSettings;
import com.ordernest.server.ratelimit.Limit;
import com.ordernest.server.ratelimit.RateLimited;
import com.ordernest.server.security.Passwords;
import com.ordernest.server.security.Public;
import com.ordernest.server.user.UserEdit;
import com.ordernest.server.user.Users;
import com.ordernest.server.web.RequestBodies;

import tools.jackson.databind.JsonNode;

/** Making an account and confirming its email. */
@RestController
@RequestMapping("/api/auth")
class SignUpController {

    private static final Logger log = LoggerFactory.getLogger(SignUpController.class);

    private final Users users;
    private final Passwords passwords;
    private final EmailCodes codes;
    private final CodeMail mail;
    private final AppSettings settings;

    SignUpController(Users users, Passwords passwords, EmailCodes codes, CodeMail mail, AppSettings settings) {
        this.users = users;
        this.passwords = passwords;
        this.codes = codes;
        this.mail = mail;
        this.settings = settings;
    }

    @Public
    @RateLimited(Limit.REGISTER)
    @PostMapping("/register")
    ResponseEntity<Map<String, Object>> register(HttpServletRequest request) {
        JsonNode body = RequestBodies.of(request);
        String typedName = Requests.text(body, "name");
        String name = typedName == null ? "" : JsText.trim(typedName);
        if (name.isEmpty()) {
            throw ApiException.error(400, "Please enter your name.");
        }
        String email = Requests.requireEmail(Requests.clean(Requests.text(body, "email")));
        String password = Requests.requireNewPassword(Requests.text(body, "password"));

        boolean confirm = settings.emailConfirmationRequired();
        if (confirm && !mail.isAvailable()) {
            throw ApiException.error(503,
                    "Sign-up is not available right now (email is not set up yet). Please contact support.");
        }

        String hash = passwords.hash(password);
        try {
            Optional<UserEdit> existing = users.byEmail(email);
            if (existing.isPresent()
                    && !(confirm && Boolean.FALSE.equals(existing.get().stored().get("emailVerified")))) {
                throw alreadyRegistered();
            }
            return created(existing.isPresent()
                    ? startAgain(existing.get(), name, hash)
                    : create(name, email, hash, confirm), confirm);
        } catch (DuplicateKeyException twoAtOnce) {
            throw alreadyRegistered();
        }
    }

    // Signed up before but never confirmed (a typo or a lost email): such an
    // account holds no data, so they may start again.
    private Document startAgain(UserEdit user, String name, String hash) {
        user.set("name", name);
        user.set("password", hash);
        Optional<String> code = codes.issue(user, Purpose.CONFIRM_SIGN_UP, null);
        users.save(user);
        String email = user.stored().getString("email");
        code.ifPresent(c -> mail.confirmSignUp(email, c));
        Document shown = new Document(user.stored());
        shown.put("name", name);
        return shown;
    }

    private Document create(String name, String email, String hash, boolean confirm) {
        ObjectId id = new ObjectId();
        EmailCodes.Issued code = confirm ? codes.fresh(id, Purpose.CONFIRM_SIGN_UP, null) : null;
        Document user = users.insert(id, name, email, hash, !confirm, code == null ? null : code.record());
        if (code != null) {
            mail.confirmSignUp(email, code.code());
        }
        return user;
    }

    private static ResponseEntity<Map<String, Object>> created(Document user, boolean confirm) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("user", Users.publicView(user));
        body.put("needsVerification", confirm);
        return ResponseEntity.status(HttpStatus.CREATED).body(body);
    }

    private static ApiException alreadyRegistered() {
        return ApiException.error(400, "Email already registered");
    }

    @Public
    @RateLimited(Limit.RESET)
    @PostMapping("/verify-email")
    Map<String, Object> verifyEmail(HttpServletRequest request) {
        JsonNode body = RequestBodies.of(request);
        String email = Requests.clean(Requests.text(body, "email"));
        UserEdit user = (Requests.isEmail(email) ? users.waitingForConfirmation(email) : Optional.<UserEdit>empty())
                .orElseThrow(WrongCode::new);

        if (!codes.check(user, Purpose.CONFIRM_SIGN_UP, Requests.text(body, "code"))) {
            users.save(user); // keeps the count of wrong tries
            throw new WrongCode();
        }
        user.set("emailVerified", true);
        user.unset("emailCode");
        users.save(user);
        return Map.of("message", "Email confirmed. You can login now.");
    }

    // The same answer whether or not there is a waiting account, given before
    // looking, so the time taken says nothing either.
    @Public
    @RateLimited(Limit.FORGOT)
    @PostMapping("/resend-verification")
    Map<String, Object> resendVerification(HttpServletRequest request) {
        String email = Requests.requireEmail(Requests.clean(Requests.text(RequestBodies.of(request), "email")));
        mail.requireAvailable();
        Thread.ofVirtual().start(() -> {
            try {
                users.waitingForConfirmation(email).ifPresent(user -> {
                    Optional<String> code = codes.issue(user, Purpose.CONFIRM_SIGN_UP, null);
                    if (code.isPresent()) { // not asked again too soon
                        users.save(user);
                        mail.confirmSignUp(user.stored().getString("email"), code.get());
                    }
                });
            } catch (RuntimeException e) {
                log.error("Resend verification failed: {}", e.getMessage());
            }
        });
        return Map.of("message", "If this email is waiting to be confirmed, we sent a new 6-digit code. It works for "
                + EmailCodes.MINUTES + " minutes.");
    }
}
