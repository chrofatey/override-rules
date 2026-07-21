/*!
powerfullz 的 Sub-Store Sing-Box 文件转换脚本
https://github.com/powerfullz/override-rules
*/

import { buildFeatureFlags } from "./args";
import { buildSingBoxConfig } from "./sing_box";
import type { SingBoxConfig } from "./sing_box_types";
import type { ScriptArgs } from "./types";

declare const $arguments: ScriptArgs;
declare let $content: string | undefined;

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

function parseFileContent(content: string): SingBoxConfig {
    let config: unknown;
    try {
        config = JSON.parse(content);
    } catch {
        throw new Error("[powerfullz 的 Sing-Box 文件脚本] 错误：文件内容不是有效的 Sing-Box JSON");
    }
    if (!config || Array.isArray(config) || typeof config !== "object") {
        throw new Error("[powerfullz 的 Sing-Box 文件脚本] 错误：Sing-Box JSON 的根节点必须是对象");
    }
    return config as SingBoxConfig;
}

export function transformFileContent(content: string): string {
    return `${JSON.stringify(main(parseFileContent(content)), null, 2)}\n`;
}

if (typeof $content !== "undefined") {
    $content = transformFileContent($content);
}
