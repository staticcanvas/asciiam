/**
 * @jest-environment node
 */

import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'node:fs';
import asciiam from '../src/asciiam.js';

const projectFile = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('Hugo documentation source', () => {
  it('generates gallery data from every included preset', () => {
    const data = JSON.parse(projectFile('docs/data/presets.json'));
    const packageManifest = JSON.parse(projectFile('package.json'));

    expect(data.version).toBe(packageManifest.version);
    expect(data.builtInModeCount).toBe(asciiam.BUILT_IN_MODES.length);
    expect(data.presets.map((preset) => preset.name)).toEqual(Object.keys(asciiam.presets));
    data.presets.forEach((preset) => {
      expect(preset.options).toEqual(asciiam.presets[preset.name]);
      expect(preset.category).toMatch(/^(fields|spatial|particles|reveals|image)$/);
    });
  });

  it('bounds live gallery contexts and exposes copy and utility actions', () => {
    const template = projectFile('docs/layouts/gallery/list.html');
    const script = projectFile('docs/static/js/gallery.js');

    expect(script).toContain('const maximumActive = 6');
    expect(script).toContain('IntersectionObserver');
    expect(script).toContain('instance.destroy()');
    expect(template).toContain('data-copy-preset');
    expect(template).toContain('?preset=');
  });

  it('renders four live splash cards with explicit options and model targets', () => {
    const template = projectFile('docs/layouts/index.html');
    const script = projectFile('docs/static/js/home.js') + projectFile('docs/static/js/asciiam-animations.js');
    const styles = projectFile('docs/static/css/docs.css');

    expect(template.match(/data-example-canvas=/g)).toHaveLength(4);
    expect(template).toContain('data-example-canvas="mode"');
    expect(template).toContain('data-example-canvas="sequence"');
    expect(template).toContain('data-example-canvas="image"');
    expect(template).toContain('data-example-canvas="mesh"');
    expect(template).toContain('classic_laptop_2k.gltf.zip.glb');
    expect(script).toContain('sequenceExample?.setSequence([');
    expect(script).toContain('{ loop: true }');
    expect(script).toContain('imageExample?.setImage(exampleBox.dataset.exampleImage)');
    expect(script).toContain('meshExample?.setModel(exampleBox.dataset.exampleModel)');
    expect(script).toContain('examples.forEach((instance) => instance.destroy())');
    expect(styles).toContain('grid-auto-flow: column');
  });

  it('uses the reclaimed splash width and transfers gallery media into the utility', () => {
    const template = projectFile('docs/layouts/index.html');
    const styles = projectFile('docs/static/css/docs.css');
    const utility = projectFile('docs/static/webutil/js/webutil.js');

    expect(template.match(/class="asset-media-card"/g)).toHaveLength(6);
    expect(template).toContain('?image=./assets/images/44833-road-166543.jpg');
    expect(template).toContain('?image=./assets/images/earth-landmask-256-slow.gif');
    expect(template).toContain('class="asset-media-type">JPG');
    expect(template).toContain('class="asset-media-type">GIF');
    expect(template).toContain('class="asset-media-type">SVG');
    expect(styles).toContain('max-width: 1680px');
    expect(styles).toContain('grid-template-columns: repeat(3, minmax(0, 1fr))');
    expect(utility).toContain('const requestedImageSource = queryParameters.get("image")');
    expect(utility).toContain('{ image: requestedImageSource, colorFromImage: true }');
  });

  it('contains the required documentation destinations and built output', () => {
    [
      'docs/content/getting-started.md',
      'docs/content/guides/integration.md',
      'docs/content/guides/rendering.md',
      'docs/content/guides/character-sets.md',
      'docs/content/guides/animations.md',
      'docs/content/guides/sequences.md',
      'docs/content/guides/images.md',
      'docs/content/guides/web-utility.md',
      'docs/content/examples/_index.md',
      'docs/content/gallery/_index.md',
      'docs/content/api/_index.md',
      'docs/content/changelog.md',
      'docs/content/version.md',
      'docs/content/attributions.md',
      'public/index.html',
      'public/index.json',
      'public/examples/index.html',
      'public/attributions/index.html',
      'public/gallery/index.html',
      'public/api/index.html',
      'public/webutil/index.html',
    ].forEach((path) => expect(projectFile(path).length).toBeGreaterThan(100));
  });

  it('exposes standard labels, every guide, and local Lucide navigation icons', () => {
    const config = projectFile('docs/hugo.toml');
    const base = projectFile('docs/layouts/_default/baseof.html');
    const icons = projectFile('docs/layouts/partials/lucide-icon.html');

    expect(config).toContain('name = "Start"');
    expect(config).toContain('name = "API reference"');
    expect(config).toContain('name = "Version and compatibility"');
    expect(config).toContain('name = "JSON builder"');
    expect(config).toContain('name = "Attributions"');
    [
      '/guides/rendering',
      '/guides/integration',
      '/guides/character-sets',
      '/guides/animations',
      '/guides/sequences',
      '/guides/images',
      '/guides/web-utility',
    ].forEach((pageRef) => expect(config).toContain(`pageRef = "${pageRef}"`));
    expect(base).toContain('class="nav-submenu"');
    expect(base).toContain('partial "lucide-icon.html"');
    expect(base).toContain('class="docs-splash"');
    expect(base).toContain('<span>Package status</span>');
    expect(base).not.toContain('<span>npm package</span>');
    expect(base).toContain('{{ if not .IsHome }}');
    expect(icons).toContain('Local Lucide icon subset');
    expect(icons).toContain('class="nav-icon lucide"');
  });

  it('keeps public documentation factual and free of promotional filler', () => {
    const documentation = [
      projectFile('README.md'),
      projectFile('docs/content/getting-started.md'),
      projectFile('docs/content/guides/animations.md'),
      projectFile('docs/content/guides/images.md'),
      projectFile('docs/content/guides/sequences.md'),
      projectFile('docs/content/guides/web-utility.md'),
      projectFile('docs/content/examples/_index.md'),
      projectFile('docs/content/api/_index.md'),
      projectFile('docs/content/version.md'),
    ].join('\n');

    expect(documentation).not.toMatch(/\b(seamless|powerful|robust|awesome|beautiful|cutting-edge|best-in-class|effortless|intuitive|world-class)\b/i);
    expect(documentation).not.toContain('every mode and option');
    expect(documentation).not.toContain('complete control surface');
    expect(documentation).not.toContain('package-version query');
    expect(documentation).not.toContain('pending-tasks.md');
    expect(projectFile('README.md')).toContain('Built-in modes including fluid dynamics');
    expect(projectFile('README.md')).toContain('| `mesh`');
    expect(projectFile('docs/content/version.md')).toContain('distributed as `@staticcanvas/asciiam`');
  });

  it('publishes documentation at the root and the application at a relative webutil route', () => {
    const buildScript = projectFile('scripts/build-docs.js');
    const utilityPartial = projectFile('docs/layouts/partials/web-utility-url.html');
    const builtHome = projectFile('public/index.html');
    const builtApi = projectFile('public/api/index.html');
    const builtUtility = projectFile('public/webutil/index.html');

    expect(buildScript).toContain("'../public'");
    expect(buildScript).not.toContain('public/docs');
    expect(utilityPartial).toContain('printf "%swebutil/"');
    expect(builtHome).toContain('href=webutil/>Web utility</a>');
    expect(builtApi).toContain('href=../webutil/>');
    expect(builtUtility).toContain('href="../">Documentation</a>');
    expect(builtUtility).not.toContain('./docs/');
  });

  it('revisions the Web Utility runtime graph as one deployable unit', () => {
    const sourcePage = projectFile('docs/static/webutil/index.html');
    const sourceScript = projectFile('docs/static/webutil/js/webutil.js');
    const builtPage = projectFile('public/webutil/index.html');
    const builtScript = projectFile('public/webutil/js/webutil.js');
    const buildScript = projectFile('scripts/build-docs.js');
    const pageRevision = builtPage.match(/libs\/asciiam\.js\?v=([a-f0-9]{12})/)?.[1];
    const scriptRevision = builtPage.match(/js\/webutil\.js\?v=([a-f0-9]{12})/)?.[1];
    const moduleRevisions = [...builtScript.matchAll(/\?v=([a-f0-9]{12})/g)].map((match) => match[1]);

    expect(sourcePage.match(/__ASSET_REVISION__/g)).toHaveLength(2);
    expect(sourceScript.match(/__ASSET_REVISION__/g)).toHaveLength(2);
    expect(pageRevision).toBeDefined();
    expect(scriptRevision).toBe(pageRevision);
    expect(moduleRevisions).toEqual([pageRevision, pageRevision]);
    expect(buildScript).toContain("createHash('sha256')");
    expect(builtPage).not.toContain('__ASSET_REVISION__');
    expect(builtScript).not.toContain('__ASSET_REVISION__');
  });

  it('provides standard search shortcuts, metadata, tags, and repository edit links', () => {
    const base = projectFile('docs/layouts/_default/baseof.html');
    const search = projectFile('docs/static/js/docs.js');
    const pageMeta = projectFile('docs/layouts/partials/page-meta.html');
    const content = [
      'docs/content/_index.md',
      'docs/content/getting-started.md',
      'docs/content/guides/_index.md',
      'docs/content/guides/rendering.md',
      'docs/content/guides/integration.md',
      'docs/content/guides/animations.md',
      'docs/content/guides/character-sets.md',
      'docs/content/guides/sequences.md',
      'docs/content/guides/images.md',
      'docs/content/guides/web-utility.md',
      'docs/content/examples/_index.md',
      'docs/content/gallery/_index.md',
      'docs/content/api/_index.md',
      'docs/content/changelog.md',
      'docs/content/version.md',
      'docs/content/attributions.md',
    ];

    content.forEach((path) => {
      const source = projectFile(path);
      expect(source).toMatch(/^---[\s\S]*\ndescription: .+/m);
      expect(source).toMatch(/^date: \d{4}-\d{2}-\d{2}$/m);
      expect(source).toMatch(/^lastmod: \d{4}-\d{2}-\d{2}$/m);
      expect(source).toMatch(/^tags: \[[^\]]+\]$/m);
      expect(source).toMatch(/^keywords: \[[^\]]+\]$/m);
    });
    expect(base).toContain('aria-keyshortcuts="Control+K Meta+K /"');
    expect(base).toContain('data-search-index');
    expect(base).toContain('partial "page-meta.html"');
    expect(search).toContain('const slashSearch = event.key === "/"');
    expect(search).toContain('!isEditing');
    expect(search).toContain('scoreDocument');
    expect(search).toContain('fetch(indexURL');
    expect(search).toContain('let indexPromise = null');
    expect(search).toContain('requestedVersion !== queryVersion');
    expect(search).toContain('const SEARCH_ALIASES');
    expect(search).toContain('appendHighlightedText');
    expect(search).toContain('tagElement.dataset.match');
    expect(search).not.toContain('.innerHTML =');
    expect(base).toContain('role="combobox"');
    expect(base).toContain('aria-autocomplete="list"');
    expect(projectFile('docs/static/css/docs.css')).toContain('min-height: 100svh');
    expect(pageMeta).toContain('/-/edit/');
    expect(pageMeta).toContain('/edit/');
    expect(pageMeta).toContain('$.Params.tags');
  });

  it('ships a single-instance live example editor and web-utility handoff', () => {
    const data = JSON.parse(projectFile('docs/data/examples.json'));
    const layout = projectFile('docs/layouts/examples/list.html');
    const script = projectFile('docs/static/js/examples.js');

    expect(data.examples[0]).toMatchObject({ id: 'minimum', options: {} });
    expect(data.examples).toHaveLength(32);
    expect(data.examples.map((example) => example.level)).toEqual(
      Array.from({ length: 32 }, (_, index) => String(index + 1).padStart(2, '0'))
    );
    expect(data.examples.map((example) => example.id)).toEqual(expect.arrayContaining([
      'spatial-gradient', 'hover-zone', 'click-zone', 'sequence', 'image-source',
      'quality-cap', 'image-range', 'orthographic-mesh', 'complete'
    ]));
    expect(data.examples.find((example) => example.id === 'complete').options).toEqual(expect.objectContaining({
      quality: 'balanced', fontLevels: 5, alphaLevels: 32, useGlyphAtlas: false, imageMaskMode: 'waveSweep'
    }));
    expect(layout).toContain('data-example-editor');
    expect(layout).toContain('len site.Data.examples.examples');
    expect(layout).toContain('data-example-utility');
    expect(script).toContain('instance?.destroy()');
    expect(script).toContain('JSON.parse(editor.value)');
    expect(script).toContain('config=${encodeURIComponent(encodeOptions(options))}');
    expect(script).not.toContain('new Function');
  });

  it('records icon, media, mesh, and format attribution sources', () => {
    const readme = projectFile('README.md');
    const notices = projectFile('THIRD_PARTY_NOTICES.md');
    const attributions = projectFile('docs/content/attributions.md');
    const resources = projectFile('resources.md');

    [readme, notices, attributions, resources].forEach((source) => {
      expect(source).toContain('Lucide');
      expect(source).toContain('SVG Repo');
    });
    expect(notices).toContain('23736/bird-shape');
    expect(attributions).toContain('PAT');
    expect(resources).toContain('Pexels');
    expect(resources).toContain('Pixabay');
    [readme, attributions, resources].forEach((source) => {
      expect(source).toContain('Poly Haven');
      expect(source).toContain('Khronos glTF Sample Assets');
      expect(source).toContain('glTF 2.0 specification');
    });
    expect(attributions).toContain('core glTF/GLB input boundary');
    expect(resources).toContain('Assets requiring compression extensions are rejected');
    expect(resources).toContain('Do not expose a decoder injection or loading hook');
    expect(resources).toContain('License and attribution requirements vary by model');
  });

  it('ships maintainer architecture and the documentation audit', () => {
    [
      'architecture/README.md',
      'architecture/runtime.md',
      'architecture/documentation.md',
      'architecture/maintenance.md',
      'architecture/webgl2-3d-feasibility.md',
      'project_docs_audit.md',
      'THIRD_PARTY_NOTICES.md',
      'LICENSE',
    ].forEach((path) => expect(projectFile(path).length).toBeGreaterThan(100));
  });

  it('ships the SOT-derived stylesheet through relocation-safe Hugo output', () => {
    const config = projectFile('docs/hugo.toml');
    const template = projectFile('docs/layouts/_default/baseof.html');
    const stylesheet = projectFile('docs/static/css/docs.css');
    const builtHome = projectFile('public/index.html');
    const builtApi = projectFile('public/api/index.html');

    expect(config).toContain('relativeURLs = true');
    expect(template).toContain('"css/docs.css" | relURL');
    expect(stylesheet).toContain('docs/static-sot-template.html');
    expect(stylesheet).toContain('@supports (color: oklch(0 0 0))');
    expect(stylesheet).toContain('--plasma: #428ef4');
    expect(stylesheet).toMatch(/\.shell > aside \{[\s\S]*overflow-y: auto/);
    expect(template).toContain('family=JetBrains+Mono');
    expect(template).toContain('family=Outfit');
    expect(template).toContain('family=Work+Sans');
    expect(stylesheet).toContain("--font-display: 'Outfit'");
    expect(stylesheet).toContain("--font-body: 'Work Sans'");
    expect(stylesheet).toContain("--font-mono: 'JetBrains Mono'");
    expect(stylesheet).toMatch(/pre \{[\s\S]*font-family: var\(--font-mono\)/);
    expect(builtHome).toMatch(/href=["']?\.\/css\/docs\.css["']?/);
    expect(builtApi).toMatch(/href=["']?\.\.\/css\/docs\.css["']?/);
  });

  it('keeps the readable navigation, application footer, and specialised references', () => {
    const base = projectFile('docs/layouts/_default/baseof.html');
    const footer = projectFile('docs/layouts/partials/site-footer.html');
    const apiLayout = projectFile('docs/layouts/api/list.html');
    const changelogLayout = projectFile('docs/layouts/changelog/single.html');
    const stylesheet = projectFile('docs/static/css/docs.css');
    const builtApi = projectFile('public/api/index.html');
    const builtChangelog = projectFile('public/changelog/index.html');

    expect(base).toContain('partial "site-footer.html"');
    expect(footer).toContain('Zero runtime dependencies');
    expect(footer).toContain('WebGL2 + Canvas 2D fallback');
    expect(apiLayout).toContain('class="api-paths"');
    expect(changelogLayout).toContain('class="release-summary"');
    expect(stylesheet).toMatch(/\.toc-panel nav a,[\s\S]*font-size: 14px/);
    expect(stylesheet).toMatch(/\.topbar button,[\s\S]*margin-block: 0/);
    expect(builtApi).toContain('class=api-paths');
    expect(builtApi).toContain('class=site-footer');
    expect(builtChangelog).toContain('class=release-summary');
    expect(builtChangelog).toContain('class="doc-content prose changelog-content"');
  });

  it('renders the start-page image sequence and complete footer treatment', () => {
    const home = projectFile('docs/layouts/index.html');
    const homeScript = projectFile('docs/static/js/home.js') + projectFile('docs/static/js/asciiam-animations.js');
    const generator = projectFile('scripts/generate-docs-data.js');
    const stylesheet = projectFile('docs/static/css/docs.css');

    expect(home).toContain('data-asciiam-hero');
    expect(home).toContain('data-asciiam-stage');
    expect(home).toContain('js/home.js');
    expect(homeScript).toContain('mode: "current"');
    expect(homeScript).toContain('mode: "fadeIn"');
    expect(homeScript).not.toContain('imageMaskMode');
    expect(homeScript).toContain('anim.start()');
    expect(generator).toContain('domitian-tunnel-5122424_1920.jpg');
    expect(stylesheet).toMatch(/\.topbar \{[\s\S]*border-bottom: 0/);
    expect(stylesheet).toMatch(/\.hero \{[\s\S]*border-bottom: 0/);
    expect(stylesheet).toMatch(/\.toc-panel nav a,[\s\S]*font-size: 17px/);
    expect(stylesheet).toMatch(/\.prose p,[\s\S]*font-size: 18px/);
    expect(stylesheet).toMatch(/pre \{[\s\S]*font-size: 17px/);
    expect(stylesheet).toContain('.footer-directory');
    expect(stylesheet).toContain('.footer-source');
  });
});
