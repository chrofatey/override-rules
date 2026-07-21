/*!
powerfullz 的 Substore Sing-Box 订阅转换脚本
https://github.com/powerfullz/override-rules
*/

import { buildFeatureFlags } from "./args";
import { buildSingBoxConfig } from "./sing_box";
import type { SingBoxConfig } from "./sing_box_types";
import type { ScriptArgs } from "./types";

declare const $arguments: ScriptArgs;

function getRawArgs(): ScriptArgs {
    try {
        return $arguments;
    } catch {
        return {};
    }
}

const flags = buildFeatureFlags(getRawArgs());

export function main(config: SingBoxConfig): SingBoxConfig {
    return buildSingBoxConfig(config, flags);
}

interface SubStoreResponse {
    body?: unknown;
    [key: string]: unknown;
}

function parseResponseBody(body: unknown): SingBoxConfig {
    const config = typeof body === "string" ? JSON.parse(body) : body;
    if (!config || Array.isArray(config) || typeof config !== "object") {
        throw new Error(
            "[powerfullz 的 Sing-Box 覆写脚本] 错误：响应内容不是 Sing-Box JSON 对象，请确认下载目标为 sing-box"
        );
    }
    return config as SingBoxConfig;
}

export function transformFunction(res: SubStoreResponse): SubStoreResponse {
    return {
        ...res,
        body: `${JSON.stringify(main(parseResponseBody(res?.body)), null, 2)}\n`,
    };
}

(globalThis as Record<string, unknown>).main = main;
(globalThis as Record<string, unknown>).transformFunction = transformFunction;
