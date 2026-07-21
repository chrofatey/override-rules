import { countriesMeta, PROXY_GROUPS, SPEEDTEST_URL } from "./constants";
import { buildProxyGroups } from "./proxy_groups";
import { buildBaseLists } from "./selectors";
import { getActiveCountryNames, parseCountries, parseLowCost } from "./node_parser";
import { singBoxRuleSets } from "./sing_box_rule_sets";
import type { FeatureFlags, ProxyNode } from "./types";
import type {
    SingBoxConfig,
    SingBoxInbound,
    SingBoxOutbound,
    SingBoxRouteRule,
} from "./sing_box_types";

const DIRECT = "direct";
const MANAGED_STATIC_TAGS = new Set([
    ...Object.values(PROXY_GROUPS),
    ...Object.keys(countriesMeta).map((country) => `${country}节点`),
]);

function warn(message: string): void {
    try {
        console.log(`[powerfullz 的 Sing-Box 文件脚本] ${message}`);
    } catch {
        // Some embedded runtimes do not expose console.
    }
}

function normalizeMember(tag: string): string | null {
    if (tag === "DIRECT") return DIRECT;
    if (tag === "REJECT" || tag === "REJECT-DROP") return null;
    return tag;
}

function routeTo(ruleSet: string, outbound: string): SingBoxRouteRule {
    return { rule_set: ruleSet, action: "route", outbound };
}

function buildRouteRules(flags: FeatureFlags): SingBoxRouteRule[] {
    const rules: SingBoxRouteRule[] = [
        { action: "sniff" },
        { protocol: "dns", action: "hijack-dns" },
    ];
    if (!flags.quicEnabled) {
        rules.push({
            type: "logical",
            mode: "and",
            rules: [{ network: "udp" }, { port: 443 }],
            action: "reject",
            method: "drop",
        });
    }
    rules.push({ port: 22, action: "route", outbound: PROXY_GROUPS.SSH });
    if (flags.adBlockEnabled) {
        rules.push(
            { rule_set: "ADBlock", action: "reject" },
            { rule_set: "AdditionalFilter", action: "reject" }
        );
    }
    if (flags.sogouBlockEnabled) {
        rules.push({ rule_set: "SogouInput", action: "reject" });
    }
    rules.push(
        {
            domain_suffix: ["truthsocial.com"],
            action: "route",
            outbound: PROXY_GROUPS.TRUTH_SOCIAL,
        },
        routeTo("StaticResources", PROXY_GROUPS.STATIC_RESOURCES),
        routeTo("CDNResources", PROXY_GROUPS.STATIC_RESOURCES),
        routeTo("AdditionalCDNResources", PROXY_GROUPS.STATIC_RESOURCES),
        routeTo("geosite-category-ai-!cn", PROXY_GROUPS.AI_SERVICE),
        routeTo("geosite-bilibili", PROXY_GROUPS.BILIBILI),
        routeTo("geosite-youtube", PROXY_GROUPS.YOUTUBE),
        routeTo("geosite-telegram", PROXY_GROUPS.TELEGRAM),
        routeTo("geosite-xbox", PROXY_GROUPS.XBOX),
        routeTo("geosite-github", PROXY_GROUPS.GITHUB),
        routeTo("geosite-netflix", PROXY_GROUPS.NETFLIX),
        routeTo("geosite-twitch", PROXY_GROUPS.TWITCH),
        routeTo("geosite-spotify", PROXY_GROUPS.SPOTIFY),
        routeTo("geosite-bahamut", PROXY_GROUPS.BAHAMUT),
        routeTo("geosite-pikpak", PROXY_GROUPS.PIKPAK),
        routeTo("geosite-twitter", PROXY_GROUPS.TWITTER),
        routeTo("Weibo", PROXY_GROUPS.WEIBO),
        routeTo("EHentai", PROXY_GROUPS.EHENTAI),
        routeTo("TikTok", PROXY_GROUPS.TIKTOK),
        routeTo("SteamFix", DIRECT),
        routeTo("GoogleFCM", DIRECT),
        routeTo("geosite-google-play@cn", DIRECT),
        routeTo("geosite-microsoft@cn", DIRECT),
        routeTo("geosite-apple", PROXY_GROUPS.APPLE),
        routeTo("geosite-microsoft", PROXY_GROUPS.MICROSOFT),
        routeTo("geosite-google", PROXY_GROUPS.GOOGLE),
        routeTo("Crypto", PROXY_GROUPS.CRYPTO),
        routeTo("geosite-gfw", PROXY_GROUPS.SELECT),
        routeTo("geoip-private", DIRECT),
        routeTo("geoip-telegram", PROXY_GROUPS.TELEGRAM),
        routeTo("geoip-netflix", PROXY_GROUPS.NETFLIX),
        routeTo("geoip-cn", DIRECT)
    );
    return rules;
}

function buildDns(flags: FeatureFlags): Record<string, unknown> {
    const servers: Array<Record<string, unknown>> = [
        { type: "udp", tag: "local-dns", server: "223.5.5.5" },
        {
            type: "https",
            tag: "remote-dns",
            server: "dns.cloudflare.com",
            path: "/dns-query",
            domain_resolver: "local-dns",
            detour: PROXY_GROUPS.SELECT,
        },
    ];
    const rules: Array<Record<string, unknown>> = [
        { rule_set: "geoip-private", action: "route", server: "local-dns" },
        { rule_set: "geosite-microsoft@cn", action: "route", server: "local-dns" },
        { rule_set: "geosite-google-play@cn", action: "route", server: "local-dns" },
    ];
    if (flags.fakeIPEnabled) {
        servers.push({
            type: "fakeip",
            tag: "fakeip-dns",
            inet4_range: "198.18.0.0/15",
            ...(flags.ipv6Enabled ? { inet6_range: "fc00::/18" } : {}),
        });
        rules.push({ query_type: ["A", "AAAA"], action: "route", server: "fakeip-dns" });
    }
    return {
        servers,
        rules,
        final: "remote-dns",
        strategy: flags.ipv6Enabled ? "prefer_ipv4" : "ipv4_only",
        reverse_mapping: true,
    };
}

function buildTunInbound(): SingBoxInbound {
    return {
        type: "tun",
        tag: "tun-in",
        interface_name: "sing-box",
        address: ["172.19.0.1/30", "fdfe:dcba:9876::1/126"],
        mtu: 1500,
        auto_route: true,
        strict_route: true,
        stack: "system",
        route_exclude_address: [
            "100.64.0.0/10",
            "fd7a:115c:a1e0::/48",
            "192.168.0.0/16",
            "fd00::/8",
        ],
    };
}

export function buildSingBoxConfig(config: SingBoxConfig, flags: FeatureFlags): SingBoxConfig {
    const inputOutbounds = Array.isArray(config.outbounds) ? config.outbounds : [];
    const inputEndpoints = Array.isArray(config.endpoints) ? config.endpoints : [];
    const protocolOutbounds = inputOutbounds.filter(
        (outbound) =>
            outbound?.tag &&
            outbound.tag !== DIRECT &&
            !(
                MANAGED_STATIC_TAGS.has(outbound.tag) &&
                ["selector", "urltest"].includes(outbound.type)
            )
    );
    const protocolNodes = [...protocolOutbounds, ...inputEndpoints];
    if (protocolNodes.length === 0) {
        throw new Error(
            "[powerfullz 的 Sing-Box 文件脚本] 错误：配置中缺少有效的代理 outbounds/endpoints"
        );
    }

    const nodes: ProxyNode[] = protocolNodes.map((node) => ({
        ...node,
        name: node.tag,
        ...(node.detour ? { "dialer-proxy": node.detour } : {}),
    }));
    const landingNodes = nodes.filter((node) => node["dialer-proxy"] === PROXY_GROUPS.FRONT_PROXY);
    const nonLandingNodes = nodes.filter(
        (node) => node["dialer-proxy"] !== PROXY_GROUPS.FRONT_PROXY
    );
    const landing = landingNodes.length > 0 && nonLandingNodes.length > 0;
    const classifiedNodes = landing ? nonLandingNodes : nodes;
    const countryNodes = parseCountries(classifiedNodes);
    const lowCostNodes = parseLowCost(classifiedNodes);
    const countryNames = getActiveCountryNames(countryNodes, flags.countryThreshold);
    const lists = buildBaseLists({
        landing,
        lowCostNodes,
        countryNames,
        nonLandingNodes,
        regexFilter: false,
    });
    if (flags.regexFilter)
        warn("regex=true 在 Sing-Box 动态输出中会被忽略，节点已按 tag 显式枚举。");
    if (flags.groupType === 2)
        warn("Sing-Box 没有 load-balance outbound，grouptype=2 已降级为 urltest。");

    const clashGroups = buildProxyGroups({
        regexFilter: false,
        groupType: flags.groupType,
        countryNames,
        countryNodes,
        lowCostNodes,
        landing,
        landingNodes,
        ...lists,
    }).filter(
        (group) => group.name !== PROXY_GROUPS.AD_BLOCK && group.name !== PROXY_GROUPS.SOGOU_INPUT
    );
    const allNodeTags = protocolNodes.map((node) => node.tag);
    const strategyOutbounds: SingBoxOutbound[] = clashGroups.map((group) => {
        const members = (group.proxies ?? allNodeTags)
            .map(normalizeMember)
            .filter((tag): tag is string => Boolean(tag));
        if (group.type === "select") {
            return { type: "selector", tag: group.name, outbounds: members };
        }
        return {
            type: "urltest",
            tag: group.name,
            outbounds: members,
            url: group.url ?? SPEEDTEST_URL,
            interval: "1m",
            tolerance: group.tolerance ?? 20,
        };
    });
    strategyOutbounds.push({
        type: "selector",
        tag: PROXY_GROUPS.GLOBAL,
        outbounds: strategyOutbounds.map((outbound) => outbound.tag),
    });

    const generatedTags = new Set([DIRECT, ...strategyOutbounds.map((outbound) => outbound.tag)]);
    for (const node of protocolNodes) {
        if (generatedTags.has(node.tag)) {
            throw new Error(
                `[powerfullz 的 Sing-Box 文件脚本] 错误：输入节点 tag 与生成策略冲突：${node.tag}`
            );
        }
    }

    const inbounds = (Array.isArray(config.inbounds) ? config.inbounds : []).filter(
        (inbound) => inbound.tag !== "tun-in" && !(flags.fullConfig && inbound.tag === "mixed-in")
    );
    if (flags.fullConfig) {
        inbounds.push({ type: "mixed", tag: "mixed-in", listen: "0.0.0.0", listen_port: 7890 });
    }
    if (flags.tunEnabled) inbounds.push(buildTunInbound());

    return {
        ...config,
        ...(flags.fullConfig ? { log: { level: "info", timestamp: true } } : {}),
        inbounds,
        outbounds: [...protocolOutbounds, { type: "direct", tag: DIRECT }, ...strategyOutbounds],
        endpoints: inputEndpoints,
        dns: buildDns(flags),
        route: {
            ...(config.route ?? {}),
            rules: buildRouteRules(flags),
            rule_set: singBoxRuleSets,
            final: PROXY_GROUPS.FINAL,
            auto_detect_interface: true,
            default_domain_resolver: "local-dns",
        },
        ...(flags.fullConfig
            ? {
                  experimental: {
                      ...(config.experimental ?? {}),
                      cache_file: { enabled: true, store_fakeip: flags.fakeIPEnabled },
                      clash_api: { external_controller: "127.0.0.1:9090" },
                  },
              }
            : {}),
    };
}
