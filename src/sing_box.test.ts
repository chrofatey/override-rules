import assert from "node:assert/strict";
import test from "node:test";
import { buildFeatureFlags } from "./args";
import { transformFunction } from "./main_sing_box";
import { buildSingBoxConfig } from "./sing_box";
import type { SingBoxConfig } from "./sing_box_types";

const baseConfig: SingBoxConfig = {
    certificate: { store: "system" },
    outbounds: [
        { type: "socks", tag: "香港 A", server: "127.0.0.1", server_port: 1080 },
        { type: "socks", tag: "香港 B", server: "127.0.0.1", server_port: 1081 },
        {
            type: "socks",
            tag: "落地 A",
            server: "127.0.0.1",
            server_port: 1082,
            detour: "前置代理",
        },
    ],
};

test("builds native Sing-Box selectors while preserving unrelated top-level fields", () => {
    const output = buildSingBoxConfig(
        structuredClone(baseConfig),
        buildFeatureFlags({ threshold: "1" })
    );
    assert.deepEqual(output.certificate, { store: "system" });
    assert.ok(
        output.outbounds?.some(
            (outbound) => outbound.type === "direct" && outbound.tag === "direct"
        )
    );
    assert.ok(
        output.outbounds?.some(
            (outbound) => outbound.type === "urltest" && outbound.tag === "香港节点"
        )
    );
    assert.ok(output.outbounds?.some((outbound) => outbound.tag === "前置代理"));
    assert.ok(output.outbounds?.some((outbound) => outbound.tag === "落地节点"));
});

test("is idempotent for generated outbounds", () => {
    const flags = buildFeatureFlags({ threshold: "1", full: "true", tun: "true" });
    const first = buildSingBoxConfig(structuredClone(baseConfig), flags);
    const second = buildSingBoxConfig(structuredClone(first), flags);
    assert.deepEqual(second, first);
});

test("uses reject actions only when blocking flags are enabled", () => {
    const enabled = buildSingBoxConfig(
        structuredClone(baseConfig),
        buildFeatureFlags({ threshold: "1", adblock: "true", sogoublock: "true" })
    );
    const disabled = buildSingBoxConfig(
        structuredClone(baseConfig),
        buildFeatureFlags({ threshold: "1", adblock: "false", sogoublock: "false" })
    );
    assert.ok(
        enabled.route?.rules.some((rule) => rule.rule_set === "ADBlock" && rule.action === "reject")
    );
    assert.ok(
        enabled.route?.rules.some(
            (rule) => rule.rule_set === "SogouInput" && rule.action === "reject"
        )
    );
    assert.ok(
        !disabled.route?.rules.some((rule) =>
            ["ADBlock", "SogouInput"].includes(String(rule.rule_set))
        )
    );
});

test("includes endpoint tags in generated strategy groups", () => {
    const output = buildSingBoxConfig(
        {
            endpoints: [{ type: "wireguard", tag: "日本 WireGuard" }],
        },
        buildFeatureFlags({ threshold: "1" })
    );
    const japan = output.outbounds?.find((outbound) => outbound.tag === "日本节点");
    assert.deepEqual(japan?.outbounds, ["日本 WireGuard"]);
    assert.deepEqual(output.endpoints, [{ type: "wireguard", tag: "日本 WireGuard" }]);
});

test("transforms an upstream Sub-Store sing-box response without backend changes", () => {
    const response = transformFunction({ status: 200, body: JSON.stringify(baseConfig) });
    const output = JSON.parse(String(response.body)) as SingBoxConfig;
    assert.equal(response.status, 200);
    assert.deepEqual(output.certificate, { store: "system" });
    assert.ok(output.outbounds?.some((outbound) => outbound.tag === "香港节点"));
});
