package com.ordernest.server.common;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

class CustomerNameTest {

    private static final String LETTERS = "Customer name can only have letters. Type the real name, or leave it empty.";
    private static final String NOT_REAL = "That does not look like a real name. Type the real name, or leave it empty.";

    // what the Node server answers for each of these
    @Test
    void sameVerdictsAsTheNodeServer() {
        assertEquals(null, CustomerName.problem(""), "");
        assertEquals(null, CustomerName.problem("  "), "  ");
        assertEquals(null, CustomerName.problem("Ravi"), "Ravi");
        assertEquals(NOT_REAL, CustomerName.problem("N"), "N");
        assertEquals(NOT_REAL, CustomerName.problem("na"), "na");
        assertEquals(NOT_REAL, CustomerName.problem("N.A."), "N.A.");
        assertEquals(NOT_REAL, CustomerName.problem("xx"), "xx");
        assertEquals(NOT_REAL, CustomerName.problem("aaa"), "aaa");
        assertEquals(NOT_REAL, CustomerName.problem("Aa"), "Aa");
        assertEquals(null, CustomerName.problem("Om"), "Om");
        assertEquals(LETTERS, CustomerName.problem("123"), "123");
        assertEquals(LETTERS, CustomerName.problem("Ravi2"), "Ravi2");
        assertEquals(null, CustomerName.problem("Ravi Kumar"), "Ravi Kumar");
        assertEquals(null, CustomerName.problem("O’Brien"), "O’Brien");
        assertEquals(null, CustomerName.problem("M/s Sharma & Sons"), "M/s Sharma & Sons");
        assertEquals(null, CustomerName.problem("(ravi)"), "(ravi)");
        assertEquals(NOT_REAL, CustomerName.problem(".."), "..");
        assertEquals(null, CustomerName.problem("राम"), "राम");
        assertEquals(NOT_REAL, CustomerName.problem("ग्राहक"), "ग्राहक");
        assertEquals(NOT_REAL, CustomerName.problem("पता नहीं"), "पता नहीं");
        assertEquals(NOT_REAL, CustomerName.problem("  walk-in  "), "  walk-in  ");
        assertEquals(NOT_REAL, CustomerName.problem("Dont Know"), "Dont Know");
        assertEquals(null, CustomerName.problem("\u00a0Isha\u00a0"), "\u00a0Isha\u00a0");
        assertEquals(null, CustomerName.problem("José"), "José");
        assertEquals(NOT_REAL, CustomerName.problem("abc"), "abc");
        assertEquals(null, CustomerName.problem("Abcde"), "Abcde");
    }
}
