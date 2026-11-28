package com.ordernest.server.web;

import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ordernest.server.security.Public;

@RestController
class HomeController {

    @Public
    @GetMapping(value = "/", produces = "text/html;charset=utf-8")
    String home() {
        return "API is running...";
    }

    // Used to time the start-up
    @Public
    @GetMapping("/health")
    Map<String, Object> health() {
        return Map.of("ok", true);
    }
}
