package com.ordernest.server.mail;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Properties;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.stereotype.Component;

import com.ordernest.server.config.AppSettings;

import tools.jackson.databind.ObjectMapper;

/**
 * Sends the code emails: through Brevo's web service (Render's free plan blocks
 * the normal mail ports), or by SMTP where that works.
 */
@Component
public class Mailer {

    private static final Logger log = LoggerFactory.getLogger(Mailer.class);
    private static final Pattern NAMED = Pattern.compile("^(.*?)\\s*<([^<>\\s]+)>$");

    private final AppSettings settings;
    private final ObjectMapper mapper;

    public Mailer(AppSettings settings, ObjectMapper mapper) {
        this.settings = settings;
        this.mapper = mapper;
    }

    public boolean isConfigured() {
        return !settings.brevoApiKey().isEmpty() || smtpSet() || "json".equals(settings.mailDriver());
    }

    private boolean smtpSet() {
        return !settings.smtpHost().isEmpty() && !settings.smtpUser().isEmpty() && !settings.smtpPass().isEmpty();
    }

    /** Sends without making the person wait; a failure is only written to the log. */
    public void sendLater(String to, String subject, String text) {
        Thread.ofVirtual().start(() -> {
            try {
                send(to, subject, text);
            } catch (Exception e) {
                if (e instanceof InterruptedException) {
                    Thread.currentThread().interrupt();
                }
                log.error("Could not send the email: {}", e.getMessage());
            }
        });
    }

    void send(String to, String subject, String text) throws IOException, InterruptedException {
        if (!isConfigured()) {
            throw new IllegalStateException("Email is not set up");
        }
        if ("json".equals(settings.mailDriver())) {
            log.info("Email not sent (test mode)");
        } else if (!settings.brevoApiKey().isEmpty()) {
            sendWithBrevo(to, subject, text);
        } else {
            sendWithSmtp(to, subject, text);
        }
    }

    private void sendWithBrevo(String to, String subject, String text) throws IOException, InterruptedException {
        String from = settings.mailFrom().isEmpty() ? settings.smtpUser() : settings.mailFrom();
        Map<String, Object> sender = sender(from);
        if (String.valueOf(sender.get("email")).isEmpty()) {
            throw new IllegalStateException("MAIL_FROM is needed with BREVO_API_KEY (the confirmed sender address)");
        }
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("sender", sender);
        body.put("to", List.of(Map.of("email", to)));
        body.put("subject", subject);
        body.put("textContent", text);
        HttpRequest request = HttpRequest.newBuilder(URI.create(settings.brevoApiUrl()))
                .timeout(Duration.ofSeconds(15))
                .header("accept", "application/json")
                .header("content-type", "application/json")
                .header("api-key", settings.brevoApiKey())
                .POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(body)))
                .build();
        try (HttpClient client = HttpClient.newBuilder().version(HttpClient.Version.HTTP_1_1).build()) {
            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 300) {
                String detail = response.body();
                throw new IOException("Brevo refused the email (" + response.statusCode() + ") "
                        + detail.substring(0, Math.min(300, detail.length())));
            }
        }
    }

    private void sendWithSmtp(String to, String subject, String text) {
        JavaMailSenderImpl sender = new JavaMailSenderImpl();
        sender.setHost(settings.smtpHost());
        sender.setPort(settings.smtpPort());
        sender.setUsername(settings.smtpUser());
        sender.setPassword(settings.smtpPass());
        Properties properties = sender.getJavaMailProperties();
        properties.put("mail.smtp.auth", "true");
        properties.put(settings.smtpPort() == 465 ? "mail.smtp.ssl.enable" : "mail.smtp.starttls.enable", "true");
        properties.put("mail.smtp.connectiontimeout", "15000");
        properties.put("mail.smtp.timeout", "15000");
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(settings.mailFrom().isEmpty() ? settings.smtpUser() : settings.mailFrom());
        message.setTo(to);
        message.setSubject(subject);
        message.setText(text);
        sender.send(message);
    }

    // "OrderNest <me@gmail.com>" or "me@gmail.com" -> { name, email }
    static Map<String, Object> sender(String text) {
        String value = text == null ? "" : text.strip();
        Map<String, Object> sender = new LinkedHashMap<>();
        Matcher named = NAMED.matcher(value);
        if (named.matches()) {
            sender.put("email", named.group(2));
            String name = named.group(1).replaceAll("^\"|\"$", "").strip();
            if (!name.isEmpty()) {
                sender.put("name", name);
            }
        } else {
            sender.put("email", value);
        }
        return sender;
    }
}
