package com.ordernest.server.ratelimit;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.METHOD)
public @interface RateLimited {
    Limit[] value();

    /** Counted before the login is checked (only the usage counter does this). */
    boolean beforeLogin() default false;
}
