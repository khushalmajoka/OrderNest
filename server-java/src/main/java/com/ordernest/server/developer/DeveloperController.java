package com.ordernest.server.developer;

import java.util.Map;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ordernest.server.common.QueryText;
import com.ordernest.server.security.DeveloperOnly;

/** The developer's own pages. Everyone else is told the address does not exist. */
@RestController
@RequestMapping("/api/developer")
class DeveloperController {

    private final UsageReport usage;
    private final CompletenessReport completeness;
    private final ShopList shops;
    private final ShopScopes scopes;

    DeveloperController(UsageReport usage, CompletenessReport completeness, ShopList shops, ShopScopes scopes) {
        this.usage = usage;
        this.completeness = completeness;
        this.shops = shops;
        this.scopes = scopes;
    }

    @DeveloperOnly
    @GetMapping("/usage")
    Map<String, Object> usage(HttpServletRequest request) {
        return usage.build(QueryText.of(request, "days"), scopes.read(QueryText.of(request, "shop")));
    }

    @DeveloperOnly
    @GetMapping("/completeness")
    Map<String, Object> completeness(HttpServletRequest request) {
        return completeness.build(scopes.read(QueryText.of(request, "shop")));
    }

    @DeveloperOnly
    @GetMapping("/shops")
    Map<String, Object> shops() {
        return shops.build();
    }
}
