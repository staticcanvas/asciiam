import { readFile, readdir, stat, writeFile, mkdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { extname, resolve } from "node:path";

const utilityDirectory = resolve("docs/static/webutil");
const backgroundDirectory = resolve(utilityDirectory, "assets/images");
const thumbnailDirectory = resolve(utilityDirectory, "assets/thumbnails");
const manifestPath = resolve(utilityDirectory, "assets/backgrounds.json");
const utilityPagePath = resolve(utilityDirectory, "index.html");
const supportedExtensions = new Set([".avif", ".gif", ".jpeg", ".jpg", ".png", ".svg", ".webp"]);

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
        name: entry.name
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
