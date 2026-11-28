package com.ordernest.server.common;

import java.util.Map;

import jakarta.servlet.http.HttpServletRequest;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.NoHandlerFoundException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

@RestControllerAdvice
class ErrorHandling {

    private static final Logger log = LoggerFactory.getLogger(ErrorHandling.class);

    @ExceptionHandler(ApiException.class)
    ResponseEntity<Map<String, Object>> api(ApiException e) {
        return ResponseEntity.status(e.status()).body(e.body());
    }

    // An address (or a method on an address) that does not exist
    @ExceptionHandler({ NoHandlerFoundException.class, NoResourceFoundException.class, HttpRequestMethodNotSupportedException.class })
    ResponseEntity<Map<String, Object>> notFound() {
        return failure(404, "Not found");
    }

    @ExceptionHandler(DuplicateKeyException.class)
    ResponseEntity<Map<String, Object>> duplicate() {
        return failure(409, "Duplicate value: this record already exists.");
    }

    // The full error stays in the server log only
    @ExceptionHandler(Exception.class)
    ResponseEntity<Map<String, Object>> unexpected(Exception e, HttpServletRequest request) {
        log.error("{} {} failed", request.getMethod(), request.getRequestURI(), e);
        return failure(500, "Something went wrong. Please try again.");
    }

    private static ResponseEntity<Map<String, Object>> failure(int status, String text) {
        return ResponseEntity.status(status).body(ApiException.failureBody(text));
    }
}
