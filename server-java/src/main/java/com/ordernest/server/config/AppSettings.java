package com.ordernest.server.config;

import java.util.Arrays;
import java.util.List;
import java.util.Locale;

import org.slf4j.LoggerFactory;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

/** The settings, read from the same environment variable names as the Node server. */
@Component
public class AppSettings {

    private final Environment env;

    public AppSettings(Environment env) {
        this.env = env;
        if (jwtSecret().isEmpty()) {
            LoggerFactory.getLogger(AppSettings.class).warn("JWT_SECRET is not set: nobody can be logged in");
        }
    }

    private String get(String name) {
        return env.getProperty(name, "");
    }

    public String jwtSecret() {
        return get("JWT_SECRET");
    }

    /** Websites that may call this API from a browser. Empty means every website. */
    public List<String> corsOrigins() {
        return list(get("CORS_ORIGINS")).stream().map(o -> o.endsWith("/") ? o.substring(0, o.length() - 1) : o).toList();
    }

    public List<String> developerEmails() {
        return list(get("DEVELOPER_EMAILS")).stream().map(e -> e.toLowerCase(Locale.ROOT)).toList();
    }

    public String brevoApiKey() {
        return get("BREVO_API_KEY");
    }

    public String brevoApiUrl() {
        String url = get("BREVO_API_URL");
        return url.isEmpty() ? "https://api.brevo.com/v3/smtp/email" : url;
    }

    public String mailFrom() {
        return get("MAIL_FROM");
    }

    public String mailDriver() {
        return get("MAIL_DRIVER");
    }

    public String smtpHost() {
        return get("SMTP_HOST");
    }

    public int smtpPort() {
        String port = get("SMTP_PORT");
        return port.matches("\\d{1,5}") ? Integer.parseInt(port) : 587;
    }

    public String smtpUser() {
        return get("SMTP_USER");
    }

    public String smtpPass() {
        return get("SMTP_PASS");
    }

    private static List<String> list(String text) {
        return Arrays.stream(text.split(",")).map(String::trim).filter(s -> !s.isEmpty()).toList();
    }
}
