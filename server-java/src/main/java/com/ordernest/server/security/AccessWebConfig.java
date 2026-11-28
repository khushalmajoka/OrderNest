package com.ordernest.server.security;

import java.util.List;

import org.springframework.context.annotation.Configuration;
import org.springframework.core.MethodParameter;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/** Turns on the access checks, and lets controllers ask for Account or CurrentShop. */
@Configuration
class AccessWebConfig implements WebMvcConfigurer {

    private final AccessInterceptor access;

    AccessWebConfig(AccessInterceptor access) {
        this.access = access;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(access);
    }

    @Override
    public void addArgumentResolvers(List<HandlerMethodArgumentResolver> resolvers) {
        resolvers.add(fromRequest(Account.class, AccessInterceptor.ACCOUNT));
        resolvers.add(fromRequest(CurrentShop.class, AccessInterceptor.SHOP));
    }

    private static HandlerMethodArgumentResolver fromRequest(Class<?> type, String attribute) {
        return new HandlerMethodArgumentResolver() {
            @Override
            public boolean supportsParameter(MethodParameter parameter) {
                return parameter.getParameterType() == type;
            }

            @Override
            public Object resolveArgument(MethodParameter parameter, ModelAndViewContainer mav,
                    NativeWebRequest request, WebDataBinderFactory binder) {
                Object value = request.getAttribute(attribute, RequestAttributes.SCOPE_REQUEST);
                if (value == null) {
                    throw new IllegalStateException(type.getSimpleName() + " was asked for without the matching annotation");
                }
                return value;
            }
        };
    }
}
