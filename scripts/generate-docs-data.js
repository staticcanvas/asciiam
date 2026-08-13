import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import asciiam from "../src/asciiam.js";

const packageMetadata = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const docsData = new URL("../docs/data/", import.meta.url);
const docsLibrary = new URL("../docs/static/libs/", import.meta.url);
const docsBranding = new URL("../docs/static/branding/", import.meta.url);
const docsImages = new URL("../docs/static/images/", import.meta.url);

const sparseModes = new Set(["matrix", "snow", "sparkle", "fire", "starfield", "orbit"]);
const revealModes = new Set(["fadeIn", "fadeOut", "typewriter"]);
const spatialModes = new Set(["ripple", "vortex", "plasma", "orbit", "hoverZone", "clickZone"]);
/** Maps a mode to the gallery filter that describes its rendering model. */
const categoryFor = (mode) => {
    if (mode === "image") return "image";
    if (sparseModes.has(mode)) return "particles";
    if (revealModes.has(mode)) return "reveals";
    if (spatialModes.has(mode)) return "spatial";
    return "fields";
};

const presets = Object.entries(asciiam.presets).map(([name, options]) => ({
    name,
    title: name.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/^./, (character) => character.toUpperCase()),
    mode: options.mode || "wave",
    category: categoryFor(options.mode || "wave"),
    previewable: options.mode !== "image" || Boolean(options.image),
    options,
}));

await Promise.all([
    mkdir(docsData, { recursive: true }),
    mkdir(docsLibrary, { recursive: true }),
    mkdir(docsBranding, { recursive: true }),
    mkdir(docsImages, { recursive: true }),
]);
await Promise.all([
    writeFile(new URL("presets.json", docsData), `${JSON.stringify({ version: packageMetadata.version, builtInModeCount: asciiam.BUILT_IN_MODES.length, presets }, null, 2)}\n`),
    cp(new URL("../src/asciiam.js", import.meta.url), new URL("asciiam.esm.js", docsLibrary)),
    cp(new URL("../src/asciiam.js", import.meta.url), new URL("asciiam.mjs", docsLibrary)),
    cp(new URL("../public/assets/branding/asciiam-logo.svg", import.meta.url), new URL("asciiam-logo.svg", docsBranding)),
    cp(new URL("../public/assets/images/domitian-tunnel-5122424_1920.jpg", import.meta.url), new URL("domitian-tunnel-5122424_1920.jpg", docsImages)),
]);

console.log(`Documentation data: v${packageMetadata.version}; ${presets.length} preset(s)`);
