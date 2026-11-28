package com.ordernest.server.auth;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Duration;
import java.util.Date;
import java.util.HexFormat;
import java.util.Optional;
import java.util.regex.Pattern;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import org.bson.Document;
import org.bson.types.ObjectId;
import org.springframework.stereotype.Component;

import com.ordernest.server.common.JsText;
import com.ordernest.server.config.AppSettings;
import com.ordernest.server.user.UserEdit;

/**
 * Emailed 6-digit codes. Only a fingerprint is stored, tied to the account and
 * to what the code is for. Calculated like the Node server's, so a code sent by
 * one server works on the other.
 */
@Component
class EmailCodes {

    static final int MINUTES = 10;
    private static final Duration RESEND_AFTER = Duration.ofSeconds(60);
    private static final int MAX_TRIES = 5;
    private static final Pattern SIX_DIGITS = Pattern.compile("\\d{6}");

    /** Where a code is kept on the account, and what it is for. */
    enum Purpose {
        CONFIRM_SIGN_UP("emailCode", "verify"),
        CHANGE_EMAIL("emailCode", "change"),
        RESET_PASSWORD("resetCode", "reset");

        final String field;
        final String kind;

        Purpose(String field, String kind) {
            this.field = field;
            this.kind = kind;
        }
    }

    /** @param record what to store; @param code what to email */
    record Issued(String code, Document record) {
    }

    private final AppSettings settings;
    private final SecureRandom random = new SecureRandom();

    EmailCodes(AppSettings settings) {
        this.settings = settings;
    }

    /** A code for an account that is about to be created. */
    Issued fresh(ObjectId userId, Purpose purpose, String newEmail) {
        String code = "%06d".formatted(random.nextInt(1_000_000));
        long now = System.currentTimeMillis();
        Document record = new Document("hash", fingerprint(code, userId, purpose))
                .append("expiresAt", new Date(now + Duration.ofMinutes(MINUTES).toMillis()))
                .append("attempts", 0)
                .append("sentAt", new Date(now))
                .append("kind", purpose.kind);
        if (newEmail != null) {
            record.append("newEmail", newEmail);
        }
        return new Issued(code, record);
    }

    /** Empty when a code was sent less than a minute ago: then nothing changes. */
    Optional<String> issue(UserEdit user, Purpose purpose, String newEmail) {
        if (saved(user, purpose).get("sentAt") instanceof Date sentAt
                && System.currentTimeMillis() - sentAt.getTime() < RESEND_AFTER.toMillis()) {
            return Optional.empty();
        }
        Issued issued = fresh(user.id(), purpose, newEmail);
        user.set(purpose.field, issued.record());
        return Optional.of(issued.code());
    }

    /**
     * Is this the right code? Every try is counted, and after too many wrong
     * ones the code is thrown away. The caller saves the account afterwards.
     *
     * @param typed what was sent, or null when it was not a text
     */
    boolean check(UserEdit user, Purpose purpose, String typed) {
        Document saved = saved(user, purpose);
        if (!(saved.get("hash") instanceof String hash) || hash.isEmpty()
                || !(saved.get("expiresAt") instanceof Date expiresAt) || expiresAt.before(new Date())) {
            return false;
        }
        if (saved.get("kind") instanceof String kind && !kind.isEmpty() && !kind.equals(purpose.kind)) {
            return false;
        }
        if (typed == null || !SIX_DIGITS.matcher(JsText.trim(typed)).matches()) {
            return false;
        }
        int tries = (saved.get("attempts") instanceof Number n ? n.intValue() : 0) + 1;
        if (tries > MAX_TRIES) {
            user.unset(purpose.field);
            return false;
        }
        user.set(purpose.field + ".attempts", tries);
        return MessageDigest.isEqual(hash.getBytes(StandardCharsets.UTF_8),
                fingerprint(JsText.trim(typed), user.id(), purpose).getBytes(StandardCharsets.UTF_8));
    }

    private static Document saved(UserEdit user, Purpose purpose) {
        return user.stored().get(purpose.field) instanceof Document saved ? saved : new Document();
    }

    String fingerprint(String code, ObjectId userId, Purpose purpose) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(settings.jwtSecret().getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            String what = userId.toHexString() + ":" + purpose.kind + ":" + code;
            return HexFormat.of().formatHex(mac.doFinal(what.getBytes(StandardCharsets.UTF_8)));
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("Could not make the code's fingerprint", e);
        }
    }
}
