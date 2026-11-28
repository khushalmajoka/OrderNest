package com.ordernest.server.common;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.Date;

import org.bson.types.ObjectId;
import org.springframework.stereotype.Component;

import tools.jackson.core.JsonGenerator;
import tools.jackson.databind.SerializationContext;
import tools.jackson.databind.ValueSerializer;
import tools.jackson.databind.module.SimpleModule;

/**
 * Writes values the way the Node server (JavaScript) writes them. Without this,
 * Java sends 8 as 8.0 and a phone number such as 9876543210 as 9.87654321E9.
 */
@Component
public class JsJsonModule extends SimpleModule {

    private static final DateTimeFormatter ISO = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'").withZone(ZoneOffset.UTC);

    public JsJsonModule() {
        super("js-json");
        addSerializer(Double.class, new JsNumber());
        addSerializer(Double.TYPE, new JsNumber());
        addSerializer(Date.class, new ValueSerializer<Date>() {
            @Override
            public void serialize(Date value, JsonGenerator out, SerializationContext context) {
                out.writeString(iso(value.toInstant()));
            }
        });
        addSerializer(Instant.class, new ValueSerializer<Instant>() {
            @Override
            public void serialize(Instant value, JsonGenerator out, SerializationContext context) {
                out.writeString(iso(value));
            }
        });
        addSerializer(ObjectId.class, new ValueSerializer<ObjectId>() {
            @Override
            public void serialize(ObjectId value, JsonGenerator out, SerializationContext context) {
                out.writeString(value.toHexString());
            }
        });
    }

    public static String iso(Instant instant) {
        return ISO.format(instant);
    }

    /** The text JavaScript would print for this number. */
    public static String number(double value) {
        if (!Double.isFinite(value)) {
            return "null";
        }
        if (value == 0) {
            return "0";
        }
        double size = Math.abs(value);
        BigDecimal exact = new BigDecimal(Double.toString(value)).stripTrailingZeros();
        if (size >= 1e-6 && size < 1e21) {
            return exact.toPlainString();
        }
        String digits = exact.unscaledValue().abs().toString();
        int exponent = digits.length() - 1 - exact.scale();
        String mantissa = digits.length() == 1 ? digits : digits.charAt(0) + "." + digits.substring(1);
        return (value < 0 ? "-" : "") + mantissa + "e" + (exponent < 0 ? "-" : "+") + Math.abs(exponent);
    }

    private static final class JsNumber extends ValueSerializer<Double> {
        @Override
        public void serialize(Double value, JsonGenerator out, SerializationContext context) {
            out.writeRawValue(number(value));
        }
    }
}
