package com.ordernest.server.auth;

import java.util.Map;

import com.ordernest.server.common.ApiException;

/** One answer for every way a code can fail, so nothing is given away. */
class WrongCode extends ApiException {

    WrongCode() {
        super(400, Map.of("error", "That code is not right or has expired. Please ask for a new one."));
    }
}
