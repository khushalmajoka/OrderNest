package com.ordernest.server.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
class SecurityConfig {

    @Bean
    SecurityFilterChain filterChain(HttpSecurity http, TokenService tokens) throws Exception {
        return http
                // tokens in a header, no cookies: no sessions and no CSRF risk
                .csrf(csrf -> csrf.disable())
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .requestCache(cache -> cache.disable())
                .logout(logout -> logout.disable())
                // headers and CORS are set by our own filters, to match the Node server
                .headers(headers -> headers.disable())
                .addFilterBefore(new TokenFilter(tokens), UsernamePasswordAuthenticationFilter.class)
                // Who may do what is decided in AccessInterceptor, which refuses
                // every handler that is not marked @Public.
                .authorizeHttpRequests(a -> a.anyRequest().permitAll())
                .build();
    }

    // Stops Spring from creating a default user with a generated password.
    @Bean
    UserDetailsService noUsers() {
        return name -> {
            throw new UsernameNotFoundException(name);
        };
    }

    // The same password fingerprints as the Node server (bcrypt, cost 10).
    @Bean
    BCryptPasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(10);
    }
}
