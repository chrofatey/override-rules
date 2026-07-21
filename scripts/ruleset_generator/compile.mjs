import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const VERSION = "1.12.25";
const outputDirectory = path.resolve("generated-rulesets/sing-box");
const ARCHIVE_SHA256 = {
    "darwin-arm64": "a4a06d507f3f4d951490168d1372fce4c02db7211e88af9da13f93ed98068d5e",
    "linux-amd64": "a1ec76e2b6b139eb747a1b1ebee7d14b8d4be5a833596cad8070a31ef960301f",
};

function run(command, args) {
    const result = spawnSync(command, args, { encoding: "utf8", stdio: "pipe" });
    if (result.status !== 0) {
        throw new Error(`${command} ${args.join(" ")} failed:\n${result.stdout}${result.stderr}`);
    }
    return result.stdout;
}

async function download(url, target) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to download ${url}: HTTP ${response.status}`);
    fs.writeFileSync(target, Buffer.from(await response.arrayBuffer()));
}

async function resolveSingBox() {
    if (process.env.SING_BOX_BIN) return process.env.SING_BOX_BIN;
    const platform = { linux: "linux", darwin: "darwin" }[process.platform];
    const arch = { x64: "amd64", arm64: "arm64" }[process.arch];
    if (!platform || !arch) {
        throw new Error("Unsupported host; set SING_BOX_BIN to a Sing-Box 1.12+ executable");
    }
    const cacheDirectory = path.resolve(`.cache/sing-box-${VERSION}-${platform}-${arch}`);
    const binary = path.join(cacheDirectory, "sing-box");
    if (fs.existsSync(binary)) return binary;
    fs.mkdirSync(cacheDirectory, { recursive: true });
    const archiveName = `sing-box-${VERSION}-${platform}-${arch}.tar.gz`;
    const releaseBase = `https://github.com/SagerNet/sing-box/releases/download/v${VERSION}`;
    const archive = path.join(os.tmpdir(), archiveName);
    await download(`${releaseBase}/${archiveName}`, archive);
    const actual = crypto.createHash("sha256").update(fs.readFileSync(archive)).digest("hex");
    const expected = ARCHIVE_SHA256[`${platform}-${arch}`];
    if (actual !== expected) throw new Error(`Checksum mismatch for ${archiveName}`);
    run("tar", ["-xzf", archive, "--strip-components=1", "-C", cacheDirectory]);
    fs.chmodSync(binary, 0o755);
    return binary;
}

const singBox = await resolveSingBox();
function normalize(value) {
    if (Array.isArray(value)) {
        return value
            .map(normalize)
            .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
    }
    if (value && typeof value === "object") {
        return Object.fromEntries(
            Object.entries(value)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([key, item]) => [key, normalize(item)])
        );
    }
    return value;
}
function normalizeRules(rules) {
    return normalize(
        rules.map((rule) =>
            Object.fromEntries(
                Object.entries(rule).map(([key, value]) => [
                    key,
                    Array.isArray(value) ? value : [value],
                ])
            )
        )
    );
}
for (const fileName of fs
    .readdirSync(outputDirectory)
    .filter((name) => name.endsWith(".json") && !name.endsWith(".decompiled.json"))) {
    const source = path.join(outputDirectory, fileName);
    const output = source.replace(/\.json$/, ".srs");
    const roundTrip = source.replace(/\.json$/, ".decompiled.json");
    run(singBox, ["rule-set", "compile", "--output", output, source]);
    run(singBox, ["rule-set", "decompile", "--output", roundTrip, output]);
    const original = JSON.parse(fs.readFileSync(source, "utf8"));
    const decompiled = JSON.parse(fs.readFileSync(roundTrip, "utf8"));
    if (
        JSON.stringify(normalizeRules(original.rules)) !==
        JSON.stringify(normalizeRules(decompiled.rules))
    ) {
        throw new Error(`Rule-set round trip changed semantics: ${fileName}`);
    }
    fs.rmSync(roundTrip);
}
