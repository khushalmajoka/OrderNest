package com.ordernest.server.auth;

import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ordernest.server.security.Account;

@RestController
@RequestMapping("/api/auth")
class MeController {

    // Who is logged in (the "Set up shop" page shows it, as there is no shop yet)
    @GetMapping("/me")
    Map<String, Object> me(Account account) {
        Map<String, Object> body = new LinkedHashMap<>();
        if (account.email() != null) {
            body.put("email", account.email());
        }
        return body;
    }
}
