package com.ordernest.server.web;

import jakarta.servlet.Filter;

import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.web.filter.UrlHandlerFilter;

import com.ordernest.server.config.AppSettings;

import tools.jackson.databind.ObjectMapper;

/** The filters every request passes, in the order the Node server applies them. */
@Configuration
class WebFilters {

    @Bean
    FilterRegistrationBean<Filter> fixedHeaders() {
        return at(new FixedHeadersFilter(), 0);
    }

    @Bean
    FilterRegistrationBean<Filter> corsRules(AppSettings settings) {
        return at(new CorsRulesFilter(settings.corsOrigins()), 1);
    }

    @Bean
    FilterRegistrationBean<Filter> jsonBody(ObjectMapper mapper) {
        return at(new JsonBodyFilter(mapper), 2);
    }

    // "/api/staff/" means the same as "/api/staff", as on the Node server
    @Bean
    FilterRegistrationBean<Filter> trailingSlash() {
        return at(UrlHandlerFilter.trailingSlashHandler("/**").wrapRequest().build(), 3);
    }

    private static FilterRegistrationBean<Filter> at(Filter filter, int position) {
        FilterRegistrationBean<Filter> registration = new FilterRegistrationBean<>(filter);
        registration.setOrder(Ordered.HIGHEST_PRECEDENCE + position);
        return registration;
    }
}
