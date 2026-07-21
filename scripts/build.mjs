import * as esbuild from "esbuild";
import * as fs from "node:fs";

const commonOptions = {
    bundle: true,
    platform: "neutral",
    format: "iife",
    target: "ES2025",
    legalComments: "none",
    charset: "utf8",
};

function options(entryPoint, outfile, minify = false) {
    const source = fs.readFileSync(entryPoint, "utf8");
    const bannerMatch = source.match(/\/\*![\s\S]*?\*\//);
    return {
        ...commonOptions,
        entryPoints: [entryPoint],
        outfile,
        minify,
        ...(minify ? { drop: ["debugger"] } : {}),
        banner: { js: bannerMatch ? bannerMatch[0] : "" },
    };
}

Promise.all([
    esbuild.build(options("src/main.ts", "convert.js")),
    esbuild.build(options("src/main.ts", "convert.min.js", true)),
    esbuild.build(options("src/main_sing_box.ts", "convert.sing-box.js")),
    esbuild.build(options("src/main_sing_box.ts", "convert.sing-box.min.js", true)),
]).catch((err) => {
    console.error(err);
    process.exit(1);
});
