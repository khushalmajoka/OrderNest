package com.ordernest.server.common;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.Date;
import java.util.LinkedHashMap;
import java.util.Map;

import org.bson.types.ObjectId;
import org.junit.jupiter.api.Test;

import tools.jackson.databind.json.JsonMapper;

class JsJsonModuleTest {

    @Test
    void numbersLookLikeJavaScript() {
        // expected texts are what Node prints for the same values
        assertEquals("8", JsJsonModule.number(8.0));
        assertEquals("0", JsJsonModule.number(-0.0));
        assertEquals("9876543210", JsJsonModule.number(9876543210.0));
        assertEquals("12345678.5", JsJsonModule.number(12345678.5));
        assertEquals("-0.25", JsJsonModule.number(-0.25));
        assertEquals("0.000001", JsJsonModule.number(1e-6));
        assertEquals("1e-7", JsJsonModule.number(1e-7));
        assertEquals("100000000000000000000", JsJsonModule.number(1e20));
        assertEquals("1e+21", JsJsonModule.number(1e21));
        assertEquals("1.5e+22", JsJsonModule.number(1.5e22));
        assertEquals("null", JsJsonModule.number(Double.NaN));
    }

    @Test
    void idsDatesAndNumbersInAnAnswer() {
        JsonMapper mapper = JsonMapper.builder().addModule(new JsJsonModule()).build();
        Map<String, Object> record = new LinkedHashMap<>();
        record.put("_id", new ObjectId("0123456789abcdef01234567"));
        record.put("total", 9876543210.0);
        record.put("at", new Date(1_767_225_600_000L));
        record.put("empty", null);
        assertEquals(
                "{\"_id\":\"0123456789abcdef01234567\",\"total\":9876543210,\"at\":\"2026-01-01T00:00:00.000Z\",\"empty\":null}",
                mapper.writeValueAsString(record));
    }
}
