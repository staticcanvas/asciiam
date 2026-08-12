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
      'docs/content/guides/web-utility.md',
      'docs/content/gallery/_index.md',
      'docs/content/api/_index.md',
      'docs/content/changelog.md',
      'docs/content/version.md',
      'public/docs/index.html',
      'public/docs/gallery/index.html',
      'public/docs/api/index.html',
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
