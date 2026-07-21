import fs from "node:fs";
import path from "node:path";

const RULE_NAMES = [
    "TikTok",
    "EHentai",
    "SteamFix",
    "FirebaseCloudMessaging",
    "AdditionalFilter",
    "AdditionalCDNResources",
    "Crypto",
    "Weibo",
] as const;

const OUTPUT_NAMES: Record<(typeof RULE_NAMES)[number], string> = {
    FirebaseCloudMessaging: "GoogleFCM",
    TikTok: "TikTok",
    EHentai: "EHentai",
    SteamFix: "SteamFix",
    AdditionalFilter: "AdditionalFilter",
    AdditionalCDNResources: "AdditionalCDNResources",
    Crypto: "Crypto",
    Weibo: "Weibo",
};

const FIELD_MAP: Record<string, string> = {
    DOMAIN: "domain",
    "DOMAIN-SUFFIX": "domain_suffix",
    "DOMAIN-KEYWORD": "domain_keyword",
    "DOMAIN-REGEX": "domain_regex",
    "IP-CIDR": "ip_cidr",
    "IP-CIDR6": "ip_cidr",
};

function addValue(groups: Map<string, string[]>, field: string, value: string): void {
    const values = groups.get(field) ?? [];
    if (!values.includes(value)) values.push(value);
    groups.set(field, values);
}

function convertRuleFile(filePath: string): { version: number; rules: Record<string, string[]>[] } {
    const groups = new Map<string, string[]>();
    const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
    lines.forEach((rawLine, index) => {
        const line = rawLine.trim();
        if (!line || line.startsWith("#")) return;
        const [kind, rawValue] = line.split(",", 2);
        const value = rawValue?.trim();
        if (!kind || !value) {
            throw new Error(`${filePath}:${index + 1}: malformed rule: ${line}`);
        }
        if (kind === "PROCESS-NAME") {
            addValue(groups, value.includes(".") ? "package_name" : "process_name", value);
            return;
        }
        const field = FIELD_MAP[kind];
        if (!field) throw new Error(`${filePath}:${index + 1}: unsupported rule type: ${kind}`);
        if (field === "domain_regex") {
            try {
                new RegExp(value);
            } catch (error) {
                throw new Error(
                    `${filePath}:${index + 1}: invalid regular expression: ${String(error)}`
                );
            }
        }
        addValue(groups, field, value);
    });
    return {
        version: 2,
        rules: [...groups.entries()].map(([field, values]) => ({ [field]: values })),
    };
}

const outputDirectory = path.resolve("generated-rulesets/sing-box");
fs.mkdirSync(outputDirectory, { recursive: true });
for (const name of RULE_NAMES) {
    const source = path.resolve(`ruleset/${name}.list`);
    const output = path.join(outputDirectory, `${OUTPUT_NAMES[name]}.json`);
    fs.writeFileSync(output, `${JSON.stringify(convertRuleFile(source), null, 2)}\n`, "utf8");
}
