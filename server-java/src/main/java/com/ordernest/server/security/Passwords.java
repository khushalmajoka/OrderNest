package com.ordernest.server.security;

import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Arrays;

import org.springframework.security.crypto.bcrypt.BCrypt;
import org.springframework.stereotype.Component;

/**
 * Password fingerprints that work on both servers: bcrypt, cost 10.
 *
 * <p>bcrypt only uses the first 72 bytes. The Node server cuts there silently;
 * Spring's usual encoder refuses longer input, which would lock out someone
 * with a long password in Hindi (3 bytes a letter). So the cut is done here.
 */
@Component
public class Passwords {

    private static final int USED_BYTES = 72;

    private final SecureRandom random = new SecureRandom();
    // compared with when there is no account, so that takes just as long
    private final String nobody = hash("not-a-real-password");

    public String hash(String password) {
        return BCrypt.hashpw(bytes(password), BCrypt.gensalt("$2b", 10, random));
    }

    /** @param fingerprint null when there is no such account (always false, equally slow) */
    public boolean matches(String password, String fingerprint) {
        boolean same;
        try {
            same = BCrypt.checkpw(bytes(password), fingerprint == null ? nobody : fingerprint);
        } catch (IllegalArgumentException notAFingerprint) {
            same = false;
        }
        return fingerprint != null && same;
    }

    private static byte[] bytes(String password) {
        byte[] all = password.getBytes(StandardCharsets.UTF_8);
        return all.length > USED_BYTES ? Arrays.copyOf(all, USED_BYTES) : all;
    }
}
