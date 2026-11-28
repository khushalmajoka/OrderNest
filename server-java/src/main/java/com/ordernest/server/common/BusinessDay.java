package com.ordernest.server.common;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

import org.springframework.stereotype.Component;

import com.ordernest.server.config.AppSettings;

/** The calendar day in the shop's time zone (not UTC), written YYYYMMDD. */
@Component
public class BusinessDay {

    private final DateTimeFormatter format;

    public BusinessDay(AppSettings settings) {
        this.format = DateTimeFormatter.ofPattern("yyyyMMdd").withZone(ZoneId.of(settings.timeZone()));
    }

    public String stamp(Instant moment) {
        return format.format(moment);
    }

    public String today() {
        return stamp(Instant.now());
    }
}
