import { readFile, readdir, writeFile } from "node:fs/promises";
import { extname, resolve } from "node:path";

const backgroundDirectory = resolve("public/assets/images");
const manifestPath = resolve("public/assets/backgrounds.json");
const publicPagePath = resolve("public/index.html");
const supportedExtensions = new Set([".avif", ".gif", ".jpeg", ".jpg", ".png", ".svg", ".webp"]);

const entries = await readdir(backgroundDirectory, { withFileTypes: true });
const images = entries
    .filter((entry) => entry.isFile() && supportedExtensions.has(extname(entry.name).toLowerCase()))
    .map((entry) => ({
        name: entry.name
            .replace(/\.[^.]+$/, "")
            .replace(/[-_]+/g, " ")
            .replace(/\b\w/g, (letter) => letter.toUpperCase()),
        src: `/assets/images/${encodeURIComponent(entry.name)}`,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

await writeFile(manifestPath, `${JSON.stringify(images, null, 2)}\n`);

const packageJson = JSON.parse(await readFile(resolve("package.json"), "utf8"));
const publicPage = await readFile(publicPagePath, "utf8");
const versionedPage = publicPage.replace(/(<span data-package-version>)v[^<]+(<\/span>)/g, `$1v${packageJson.version}$2`);
await writeFile(publicPagePath, versionedPage);

console.log(`Public metadata: v${packageJson.version}; ${images.length} background image(s)`);
