package com.ordernest.server.security;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;

import org.bson.types.ObjectId;
import org.springframework.stereotype.Component;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.exceptions.JWTVerificationException;
import com.auth0.jwt.interfaces.DecodedJWT;
import com.ordernest.server.config.AppSettings;

/** The same login tokens as the Node server: HS256, claim userId, 7 days. */
@Component
public class TokenService {

    private static final Duration LIFE = Duration.ofDays(7);

    private final Algorithm algorithm;

    public TokenService(AppSettings settings) {
        String secret = settings.jwtSecret();
        this.algorithm = secret.isEmpty() ? null : Algorithm.HMAC256(secret);
    }

    /** @param issuedAt seconds since 1970, or null */
    public record Login(String userId, Long issuedAt) {
    }

    public String create(ObjectId userId) {
        Instant now = Instant.now();
        return JWT.create()
                .withClaim("userId", userId.toHexString())
                .withIssuedAt(now)
                .withExpiresAt(now.plus(LIFE))
                .sign(algorithm);
    }

    public Optional<Login> read(String token) {
        if (algorithm == null) {
            return Optional.empty();
        }
        try {
            // The Node server does not check "issued at", so a small difference
            // between two servers' clocks must not log anyone out.
            DecodedJWT jwt = JWT.require(algorithm).ignoreIssuedAt().build().verify(token);
            Instant issued = jwt.getIssuedAtAsInstant();
            return Optional.of(new Login(jwt.getClaim("userId").asString(), issued == null ? null : issued.getEpochSecond()));
        } catch (JWTVerificationException e) {
            return Optional.empty();
        }
    }
}
