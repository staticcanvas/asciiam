/**
 * @file generate-asset-manifest.js
 * @description Walks the organized source tree at docs/assets/ (images by format,
 * meshes separately), stages each file into the served locations the Web Utility
 * playground and docs site already expect, and writes JSON manifests so adding or
 * replacing a file there is the only step needed — no script edits, no manual
 * wiring in the playground, splash, or gallery.
 * @module generate-asset-manifest
 */

import { copyFile, mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { extname, resolve } from "node:path";

const assetsRoot = resolve("docs/assets");
const imageSourceDirs = ["jpg", "png", "webp", "gifs", "svg"].map((format) => resolve(assetsRoot, "images", format));
const meshSourceDirectory = resolve(assetsRoot, "meshes");

const utilityDirectory = resolve("docs/static/webutil");
const utilityImagesDirectory = resolve(utilityDirectory, "assets/images");
const utilityMeshesDirectory = resolve(utilityDirectory, "assets/meshes");
const thumbnailDirectory = resolve(utilityDirectory, "assets/thumbnails");
const imageManifestPath = resolve(utilityDirectory, "assets/backgrounds.json");
const meshManifestPath = resolve(utilityDirectory, "assets/meshes.json");
const utilityPagePath = resolve(utilityDirectory, "index.html");

const docsImagesDirectory = resolve("docs/static/images");
// Convention, not configuration: a source file with one of these exact names is also
// staged into docs/static/images/, reachable from *any* page (gallery, splash, webutil)
// at the site-root-absolute path /images/<name> — unlike the per-page-relative
// ./assets/images/<name> used elsewhere in this file. Used today by the docs splash
// hero background and the imageReveal built-in preset. Replace the file (same name, any
// images/* subfolder) to change what either one shows — nothing else needs editing.
const sharedImageNames = new Set(["domitian-tunnel-5122424_1920.jpg", "vilkasss-ai-generated-9599760.jpg"]);

const supportedImageExtensions = new Set([".avif", ".gif", ".jpeg", ".jpg", ".png", ".svg", ".webp"]);

// Only needed for source filenames that don't already read naturally once
// auto-title-cased (toFriendlyName's fallback below) — a well-named new file needs
// no entry here at all.
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
    "classic-laptop-2k.glb": "Classic Laptop",
});

/**
 * Derives a display name from a source filename: an explicit override when one
 * exists, otherwise the filename with its extension stripped, separators turned
 * into spaces, and each word capitalized.
 *
 * @param {string} fileName - source file's base name, including extension
 * @returns {string} human-readable display name
 */
function toFriendlyName(fileName) {
    return friendlyNames[fileName] || fileName
        .replace(/\.[^.]+$/, "")
        .replace(/[-_]+/g, " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

/**
 * Locates whichever ImageMagick executable is on PATH, without invoking a shell.
 *
 * @returns {string|null} `"magick"` or `"convert"`, or `null` if neither is available
 */
function imageMagickCommand() {
    for (const command of ["magick", "convert"]) {
        const result = spawnSync(command, ["-version"], { stdio: "ignore" });
        if (!result.error && result.status === 0) return command;
    }
    return null;
}

const imageMagick = imageMagickCommand();

/**
 * Creates or reuses one bounded 320x180 WebP preview for an image-library source.
 *
 * @param {string} sourcePath - absolute path to the source image
 * @param {string} fileName - source file's base name, used to derive the thumbnail's name
 * @returns {Promise<string|null>} a relative URL to the thumbnail, or `null` if one couldn't be produced
 */
async function ensureThumbnail(sourcePath, fileName) {
    const thumbnailName = `${fileName}.webp`;
    const thumbnail = resolve(thumbnailDirectory, thumbnailName);
    let current = false;
    try {
        const [sourceStat, thumbnailStat] = await Promise.all([stat(sourcePath), stat(thumbnail)]);
        current = thumbnailStat.mtimeMs >= sourceStat.mtimeMs;
    } catch {}
    if (!current && imageMagick) {
        const input = extname(fileName).toLowerCase() === ".gif" ? `${sourcePath}[0]` : sourcePath;
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

/**
 * Lists the files directly inside a directory, tolerating a directory that doesn't
 * exist yet (an empty `images/*` subfolder before its first asset is added).
 *
 * @param {string} directory - absolute directory path
 * @param {(name: string) => boolean} [filter] - keep only file names this returns true for
 * @returns {Promise<string[]>} matching file names, unsorted
 */
async function listFiles(directory, filter = () => true) {
    let entries;
    try {
        entries = await readdir(directory, { withFileTypes: true });
    } catch {
        return [];
    }
    return entries.filter((entry) => entry.isFile() && filter(entry.name)).map((entry) => entry.name);
}

await Promise.all([
    mkdir(utilityImagesDirectory, { recursive: true }),
    mkdir(utilityMeshesDirectory, { recursive: true }),
    mkdir(thumbnailDirectory, { recursive: true }),
    mkdir(docsImagesDirectory, { recursive: true }),
]);

const imageFiles = [];
for (const directory of imageSourceDirs) {
    const names = await listFiles(directory, (name) => supportedImageExtensions.has(extname(name).toLowerCase()));
    for (const name of names) imageFiles.push({ directory, name });
}
imageFiles.sort((a, b) => a.name.localeCompare(b.name));

const images = await Promise.all(imageFiles.map(async ({ directory, name }) => {
    const sourcePath = resolve(directory, name);
    await copyFile(sourcePath, resolve(utilityImagesDirectory, name));
    const thumbnail = await ensureThumbnail(sourcePath, name);
    return {
        name: toFriendlyName(name),
        src: `./assets/images/${encodeURIComponent(name)}`,
        ...(thumbnail ? { thumbnail } : {}),
    };
}));
await writeFile(imageManifestPath, `${JSON.stringify(images, null, 2)}\n`);

await Promise.all(
    imageFiles
        .filter((file) => sharedImageNames.has(file.name))
        .map((file) => copyFile(resolve(file.directory, file.name), resolve(docsImagesDirectory, file.name))),
);

const meshNames = (await listFiles(meshSourceDirectory, (name) => extname(name).toLowerCase() === ".glb")).sort();
const meshes = await Promise.all(meshNames.map(async (name) => {
    await copyFile(resolve(meshSourceDirectory, name), resolve(utilityMeshesDirectory, name));
    return { name: toFriendlyName(name), src: `./assets/meshes/${encodeURIComponent(name)}` };
}));
await writeFile(meshManifestPath, `${JSON.stringify(meshes, null, 2)}\n`);

const packageJson = JSON.parse(await readFile(resolve("package.json"), "utf8"));
const utilityPage = await readFile(utilityPagePath, "utf8");
const versionedPage = utilityPage.replace(/(<span data-package-version>)v[^<]+(<\/span>)/g, `$1v${packageJson.version}$2`);
await writeFile(utilityPagePath, versionedPage);

console.log(`Public metadata: v${packageJson.version}; ${images.length} image(s); ${images.filter((image) => image.thumbnail).length} thumbnail(s); ${meshes.length} mesh(es)`);
