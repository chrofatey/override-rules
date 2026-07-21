export interface SingBoxOutbound {
    type: string;
    tag: string;
    detour?: string;
    [key: string]: unknown;
}

export interface SingBoxEndpoint {
    type: string;
    tag: string;
    [key: string]: unknown;
}

export interface SingBoxInbound {
    type: string;
    tag: string;
    [key: string]: unknown;
}

export interface SingBoxRuleSet {
    type: "remote";
    tag: string;
    format: "source" | "binary";
    url: string;
    update_interval: string;
}

export interface SingBoxRouteRule {
    type?: "logical";
    mode?: "and" | "or";
    rules?: SingBoxRouteRule[];
    action?: "route" | "reject" | "sniff" | "hijack-dns";
    outbound?: string;
    method?: "default" | "drop";
    [key: string]: unknown;
}

export interface SingBoxRoute {
    rules: SingBoxRouteRule[];
    rule_set: SingBoxRuleSet[];
    final: string;
    [key: string]: unknown;
}

export interface SingBoxConfig {
    outbounds?: SingBoxOutbound[];
    endpoints?: SingBoxEndpoint[];
    inbounds?: SingBoxInbound[];
    route?: SingBoxRoute;
    dns?: Record<string, unknown>;
    experimental?: Record<string, unknown>;
    log?: Record<string, unknown>;
    [key: string]: unknown;
}
