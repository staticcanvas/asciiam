import { readFile, readdir, stat, writeFile, mkdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { extname, resolve } from "node:path";

const utilityDirectory = resolve("docs/static/webutil");
const backgroundDirectory = resolve(utilityDirectory, "assets/images");
const thumbnailDirectory = resolve(utilityDirectory, "assets/thumbnails");
const manifestPath = resolve(utilityDirectory, "assets/backgrounds.json");
const utilityPagePath = resolve(utilityDirectory, "index.html");
const supportedExtensions = new Set([".avif", ".gif", ".jpeg", ".jpg", ".png", ".svg", ".webp"]);
const friendlyNames = Object.freeze({
    "44833-road-166543.jpg": "Forest Road",
    "bird-silhouette.svg": "Bird Silhouette",
    "catlinedigital-cauldron-28104_512.gif": "Animated Cauldron",
    "domitian-tunnel-5122424_1920.jpg": "Domitian Tunnel",
    "earth-landmask-256-slow.gif": "Rotating Earth",
    "kranich17-paving-stones-7655820_1920.jpg": "Paving Stones",
    "mxj_files-glasses-27527_512.gif": "Animated Glasses",
    "pexels-asphalt-1867667_1920.jpg": "Asphalt Texture",
    "pexels-bertellifotografia-38760198.jpg": "Night Heron",
    "pexels-clive-kim-2523249-6307488.jpg": "Volcano at Night",
    "pexels-merlin-10874572.jpg": "Iridescent Texture",
    "pexels-merlin-10874575.jpg": "Prismatic Scales",
    "pexels-ritam-karmakar-616573342-31064522.jpg": "Dragonfly",
    "pexels-steve-30018097.jpg": "Violet Reflections",
    "pexels-thales13-38600221.jpg": "Blue Droplets",
    "valiphotos-road-1072821_1920.jpg": "Autumn Forest Road",
    "vilkasss-ai-generated-9599760.jpg": "ASCII Portrait",
    "wal_172619-bridge-6755233_1920.jpg": "Riverside Bridge",
});

await mkdir(thumbnailDirectory, { recursive: true });

/** Returns the first available ImageMagick executable without invoking a shell. */
function imageMagickCommand() {
    for (const command of ["magick", "convert"]) {
        const result = spawnSync(command, ["-version"], { stdio: "ignore" });
        if (!result.error && result.status === 0) return command;
    }
    return null;
}

const imageMagick = imageMagickCommand();

/** Creates or reuses one bounded static preview for an image-library source. */
async function ensureThumbnail(fileName) {
    const source = resolve(backgroundDirectory, fileName);
    const thumbnailName = `${fileName}.webp`;
    const thumbnail = resolve(thumbnailDirectory, thumbnailName);
    let current = false;
    try {
        const [sourceStat, thumbnailStat] = await Promise.all([stat(source), stat(thumbnail)]);
        current = thumbnailStat.mtimeMs >= sourceStat.mtimeMs;
    } catch {}
    if (!current && imageMagick) {
        const input = extname(fileName).toLowerCase() === ".gif" ? `${source}[0]` : source;
        const result = spawnSync(imageMagick, [
            input,
            "-auto-orient",
            "-thumbnail", "320x180^",
            "-gravity", "center",
            "-extent", "320x180",
            "-strip",
            "-quality", "72",
            thumbnail,
        ], { stdio: "inherit" });
        if (result.error || result.status !== 0) return null;
    }
    try {
        await stat(thumbnail);
        return `./assets/thumbnails/${encodeURIComponent(thumbnailName)}`;
    } catch {
        return null;
    }
}

const entries = await readdir(backgroundDirectory, { withFileTypes: true });
const sourceEntries = entries
    .filter((entry) => entry.isFile() && supportedExtensions.has(extname(entry.name).toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));
const images = await Promise.all(sourceEntries.map(async (entry) => {
    const thumbnail = await ensureThumbnail(entry.name);
    return {
        name: friendlyNames[entry.name] || entry.name
            .replace(/\.[^.]+$/, "")
            .replace(/[-_]+/g, " ")
            .replace(/\b\w/g, (letter) => letter.toUpperCase()),
        src: `./assets/images/${encodeURIComponent(entry.name)}`,
        ...(thumbnail ? { thumbnail } : {}),
    };
}));

await writeFile(manifestPath, `${JSON.stringify(images, null, 2)}\n`);

const packageJson = JSON.parse(await readFile(resolve("package.json"), "utf8"));
const utilityPage = await readFile(utilityPagePath, "utf8");
const versionedPage = utilityPage.replace(/(<span data-package-version>)v[^<]+(<\/span>)/g, `$1v${packageJson.version}$2`);
await writeFile(utilityPagePath, versionedPage);

console.log(`Public metadata: v${packageJson.version}; ${images.length} background image(s); ${images.filter((image) => image.thumbnail).length} thumbnail(s)`);
