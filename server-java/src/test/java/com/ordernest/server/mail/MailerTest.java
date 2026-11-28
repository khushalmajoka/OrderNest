package com.ordernest.server.mail;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.util.concurrent.atomic.AtomicReference;

import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

import com.ordernest.server.config.AppSettings;
import com.sun.net.httpserver.HttpServer;

import tools.jackson.databind.json.JsonMapper;

class MailerTest {

    private final JsonMapper mapper = JsonMapper.builder().build();

    private Mailer mailer(MockEnvironment env) {
        return new Mailer(new AppSettings(env), mapper);
    }

    @Test
    void sendsThroughBrevo() throws Exception {
        AtomicReference<String> body = new AtomicReference<>();
        AtomicReference<String> key = new AtomicReference<>();
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/", exchange -> {
            key.set(exchange.getRequestHeaders().getFirst("api-key"));
            body.set(new String(exchange.getRequestBody().readAllBytes()));
            exchange.sendResponseHeaders(201, -1);
            exchange.close();
        });
        server.start();
        try {
            mailer(new MockEnvironment()
                    .withProperty("BREVO_API_KEY", "test-only")
                    .withProperty("BREVO_API_URL", "http://127.0.0.1:" + server.getAddress().getPort())
                    .withProperty("MAIL_FROM", "OrderNest <noreply@example.test>"))
                    .send("person@example.test", "Subject", "Text");
        } finally {
            server.stop(0);
        }
        assertEquals("test-only", key.get());
        assertEquals("{\"sender\":{\"email\":\"noreply@example.test\",\"name\":\"OrderNest\"},"
                + "\"to\":[{\"email\":\"person@example.test\"}],\"subject\":\"Subject\",\"textContent\":\"Text\"}", body.get());
    }

    @Test
    void aRefusalIsAnError() throws Exception {
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/", exchange -> {
            exchange.sendResponseHeaders(401, -1);
            exchange.close();
        });
        server.start();
        try {
            Mailer mailer = mailer(new MockEnvironment()
                    .withProperty("BREVO_API_KEY", "wrong")
                    .withProperty("BREVO_API_URL", "http://127.0.0.1:" + server.getAddress().getPort())
                    .withProperty("MAIL_FROM", "noreply@example.test"));
            assertThrows(IOException.class, () -> mailer.send("person@example.test", "s", "t"));
        } finally {
            server.stop(0);
        }
    }

    @Test
    void notSetUp() {
        assertFalse(mailer(new MockEnvironment()).isConfigured());
    }
}
