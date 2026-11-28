package com.ordernest.server.auth;

import org.springframework.stereotype.Component;

import com.ordernest.server.common.ApiException;
import com.ordernest.server.mail.Mailer;

/** The emails that carry a code. Sent without making the person wait. */
@Component
class CodeMail {

    private final Mailer mailer;

    CodeMail(Mailer mailer) {
        this.mailer = mailer;
    }

    boolean isAvailable() {
        return mailer.isConfigured();
    }

    void requireAvailable() {
        if (!isAvailable()) {
            throw ApiException.error(503, "Email is not set up yet, so a code cannot be sent. Please contact support.");
        }
    }

    void confirmSignUp(String to, String code) {
        send(to, "Confirm your OrderNest email", "Welcome to OrderNest!", code);
    }

    void confirmNewEmail(String to, String code) {
        send(to, "Confirm your new OrderNest email", "You asked to change your OrderNest email.", code);
    }

    void resetPassword(String to, String code) {
        send(to, "Your OrderNest password code", "You asked to reset your OrderNest password.", code);
    }

    private void send(String to, String subject, String intro, String code) {
        mailer.sendLater(to, subject, intro + "\n\nYour OrderNest code is " + code + "\n\nIt works for "
                + EmailCodes.MINUTES + " minutes. If you did not ask for this, ignore this email.");
    }
}
