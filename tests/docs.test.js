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
      'public/docs/index.html',
      'public/docs/index.json',
      'public/docs/examples/index.html',
      'public/docs/attributions/index.html',
      'public/docs/gallery/index.html',
      'public/docs/api/index.html',
    ].forEach((path) => expect(projectFile(path).length).toBeGreaterThan(100));
  });

  it('exposes standard labels, every guide, and local Lucide navigation icons', () => {
    const config = projectFile('docs/hugo.toml');
    const base = projectFile('docs/layouts/_default/baseof.html');
    const icons = projectFile('docs/layouts/partials/lucide-icon.html');

    expect(config).toContain('name = "Getting started"');
    expect(config).toContain('name = "API reference"');
    expect(config).toContain('name = "Version and compatibility"');
    expect(config).toContain('name = "Usage examples"');
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
    expect(base).toContain('{{ if not .IsHome }}');
    expect(icons).toContain('Local Lucide icon subset');
    expect(icons).toContain('class="nav-icon lucide"');
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
    expect(data.examples.map((example) => example.id)).toEqual(expect.arrayContaining([
      'spatial-gradient', 'hover-zone', 'click-zone', 'sequence', 'image-source', 'complete'
    ]));
    expect(data.examples.find((example) => example.id === 'complete').options).toEqual(expect.objectContaining({
      quality: 'balanced', fontLevels: 5, alphaLevels: 32, useGlyphAtlas: false, imageMaskMode: 'waveSweep'
    }));
    expect(layout).toContain('data-example-editor');
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
    expect(attributions).toContain('planned core glTF/GLB input boundary');
    expect(resources).toContain('Assets requiring compression extensions will be rejected');
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
    const builtHome = projectFile('public/docs/index.html');
    const builtApi = projectFile('public/docs/api/index.html');

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
    const builtApi = projectFile('public/docs/api/index.html');
    const builtChangelog = projectFile('public/docs/changelog/index.html');

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
    const homeScript = projectFile('docs/static/js/home.js');
    const generator = projectFile('scripts/generate-docs-data.js');
    const stylesheet = projectFile('docs/static/css/docs.css');

    expect(home).toContain('data-asciiam-hero');
    expect(home).toContain('data-asciiam-stage');
    expect(home).toContain('js/home.js');
    expect(homeScript).toContain('mode: "ripple"');
    expect(homeScript).not.toContain('imageMaskMode');
    expect(homeScript).toContain('step-1786547801812-1');
    expect(homeScript).toContain('anim.on("sequenceStepStart"');
    expect(homeScript).toContain('anim.on("sequenceStepComplete"');
    expect(homeScript).toContain('anim.playSequence()');
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
