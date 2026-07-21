import { CDN_URL } from "./constants";
import type { SingBoxRuleSet } from "./sing_box_types";

const META_BASE = "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/sing/geo";
const SKK_BASE = "https://ruleset.skk.moe/sing-box";
const PROJECT_BASE = `${CDN_URL}/gh/powerfullz/override-rules@dist/ruleset/sing-box`;

function binary(tag: string, url: string): SingBoxRuleSet {
    return { type: "remote", tag, format: "binary", url, update_interval: "1d" };
}

function source(tag: string, url: string): SingBoxRuleSet {
    return { type: "remote", tag, format: "source", url, update_interval: "1d" };
}

const geositeNames = [
    "category-ai-!cn",
    "bilibili",
    "youtube",
    "telegram",
    "xbox",
    "github",
    "netflix",
    "twitch",
    "spotify",
    "bahamut",
    "pikpak",
    "twitter",
    "google-play@cn",
    "microsoft@cn",
    "apple",
    "microsoft",
    "google",
    "gfw",
] as const;

const geoipNames = ["private", "telegram", "netflix", "cn"] as const;

export const singBoxRuleSets: SingBoxRuleSet[] = [
    binary(
        "ADBlock",
        "https://raw.githubusercontent.com/217heidai/adblockfilters/main/rules/adblocksingbox.srs"
    ),
    source("SogouInput", `${SKK_BASE}/non_ip/sogouinput.json`),
    source("StaticResources", `${SKK_BASE}/domainset/cdn.json`),
    source("CDNResources", `${SKK_BASE}/non_ip/cdn.json`),
    ...[
        "TikTok",
        "EHentai",
        "SteamFix",
        "GoogleFCM",
        "AdditionalFilter",
        "AdditionalCDNResources",
        "Crypto",
        "Weibo",
    ].map((tag) => binary(tag, `${PROJECT_BASE}/${tag}.srs`)),
    ...geositeNames.map((tag) => binary(`geosite-${tag}`, `${META_BASE}/geosite/${tag}.srs`)),
    ...geoipNames.map((tag) => binary(`geoip-${tag}`, `${META_BASE}/geoip/${tag}.srs`)),
];
