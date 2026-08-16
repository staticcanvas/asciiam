/**
 * @jest-environment node
 */

import { afterEach, describe, expect, it } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';
import { highlightJavaScript } from '../docs/static/webutil/js/webutil-code.js';
import { normalizeSequenceDraft, serializeSequenceDraft } from '../docs/static/webutil/js/webutil-sequence.js';

const projectFile = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

function createDemo(includedImages = [], url = 'https://demo.test/webutil/') {
  const dom = new JSDOM(projectFile('docs/static/webutil/index.html'), {
    runScripts: 'outside-only',
    url,
    virtualConsole: new VirtualConsole(),
  });
  const { window } = dom;
  const stage = window.document.getElementById('stage');
  const backgroundTarget = window.document.querySelector('[data-ascii-target="background"]');
  Object.defineProperties(stage, {
    clientWidth: { configurable: true, value: 320 },
    clientHeight: { configurable: true, value: 180 },
  });
  Object.defineProperties(backgroundTarget, {
    clientWidth: { configurable: true, value: 320 },
    clientHeight: { configurable: true, value: 180 },
  });
  window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  window.requestAnimationFrame = () => 1;
  window.cancelAnimationFrame = () => {};
  window.ResizeObserver = class {
    observe() {}
    disconnect() {}
  };
  window.IntersectionObserver = class {
    observe() {}
    disconnect() {}
  };
  window.HTMLElement.prototype.showPopover = function showPopover() {};
  window.HTMLElement.prototype.hidePopover = function hidePopover() {};
  window.HTMLCanvasElement.prototype.getContext = () => ({
    font: '14px monospace',
    setTransform() {},
    clearRect() {},
    fillRect() {},
    fillText() {},
    save() {},
    restore() {},
    drawImage() {},
    measureText() { return { width: (Number.parseFloat(this.font) || 14) * 0.57 }; },
    createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ addColorStop() {} }),
    getImageData: () => ({ data: new Uint8ClampedArray(4) }),
  });
  window.fetch = async (resource) =>
    Response.json(String(resource) === './assets/backgrounds.json' ? includedImages : []);
  window.eval(projectFile('docs/static/webutil/libs/asciiam.js'));
  window.__webutilModules = { highlightJavaScript, normalizeSequenceDraft, serializeSequenceDraft };
  const utilityScript = projectFile('docs/static/webutil/js/webutil.js')
    .replace(/import \{ highlightJavaScript \}[^\n]+\n/, 'const { highlightJavaScript } = window.__webutilModules;\n')
    .replace(/import \{ normalizeSequenceDraft, serializeSequenceDraft \}[^\n]+\n/, 'const { normalizeSequenceDraft, serializeSequenceDraft } = window.__webutilModules;\n');
  window.eval(`(() => {\n${utilityScript}\n})();`);
  return dom;
}

let activeDom = null;
afterEach(() => {
  activeDom?.window.close();
  activeDom = null;
});

describe('demo toolbar quality-of-life controls', () => {
  it('loads JSON-safe configurations transferred from documentation examples', () => {
    const options = { mode: 'clickZone', color: '#C04FFF', interactionRadius: 260 };
    const encoded = Buffer.from(JSON.stringify(options), 'utf8').toString('base64url');
    activeDom = createDemo([], `https://demo.test/webutil/?config=${encodeURIComponent(encoded)}`);
    const { document } = activeDom.window;

    expect(document.getElementById('modeToolbarStatus').textContent).toBe('clickZone');
    expect(document.getElementById('color').value.toUpperCase()).toBe('#C04FFF');
    expect(document.getElementById('interactionRadius').value).toBe('260');
    expect(document.getElementById('presetDirtyIndicator').textContent).toBe('Docs example');
  });

  it('renders included image manifest entries as selectable defaults', async () => {
    activeDom = createDemo([
      { name: 'Bird Silhouette', src: './assets/images/bird-silhouette.svg', thumbnail: './assets/thumbnails/bird.webp' },
      { name: 'Hawk Silhouette', src: './assets/images/hawk-silhouette.svg', thumbnail: './assets/thumbnails/hawk.webp' },
    ]);
    await new Promise((resolve) => setImmediate(resolve));
    const { document } = activeDom.window;

    expect(document.querySelectorAll('#localImages .image-select')).toHaveLength(2);
    expect(document.getElementById('localImageSection').hidden).toBe(false);
    expect(document.getElementById('imageStatus').textContent).toBe(
      '2 included images ready. Select one to apply it.'
    );
    expect([...document.querySelectorAll('#localImages img')].map((image) => image.src)).toEqual([
      'https://demo.test/webutil/assets/thumbnails/bird.webp',
      'https://demo.test/webutil/assets/thumbnails/hawk.webp',
    ]);
  });

  it('keeps documentation image handoff paths in generated code', async () => {
    const source = './assets/images/bird-silhouette.svg';
    activeDom = createDemo(
      [{ name: 'Bird Silhouette', src: source, thumbnail: './assets/thumbnails/bird.webp' }],
      `https://demo.test/webutil/?image=${encodeURIComponent(source)}`
    );
    await new Promise((resolve) => setImmediate(resolve));
    const { document } = activeDom.window;

    expect(document.getElementById('usageCodePopover').textContent).toContain(`"image": "${source}"`);
    expect(document.getElementById('usageCodePopover').textContent).not.toContain('./your-image.png');
    expect(document.querySelector('.image-select[aria-pressed="true"]')).not.toBeNull();
  });

  it('does not decode original media when a gallery thumbnail is unavailable', async () => {
    activeDom = createDemo([{ name: 'Large GIF', src: './assets/images/large.gif' }]);
    await new Promise((resolve) => setImmediate(resolve));
    const { document } = activeDom.window;

    expect(document.querySelector('#localImages img')).toBeNull();
    expect(document.querySelector('.image-card__placeholder').textContent).toBe('Preview unavailable');
  });

  it('tracks dirty state and supports undo and redo', () => {
    activeDom = createDemo();
    const { document, Event } = activeDom.window;
    const speed = document.getElementById('speed');
    const indicator = document.getElementById('presetDirtyIndicator');
    const undo = document.getElementById('undoSettingsBtn');
    const redo = document.getElementById('redoSettingsBtn');

    expect(indicator.textContent).toBe('heroWave');
    expect(undo.disabled).toBe(true);

    speed.value = '2';
    speed.dispatchEvent(new Event('input', { bubbles: true }));

    expect(indicator.textContent).toBe('Modified');
    expect(undo.disabled).toBe(false);
    undo.click();
    expect(speed.value).toBe('1');
    expect(redo.disabled).toBe(false);

    redo.click();
    expect(speed.value).toBe('2');
  });

  it('uses one toolbar tab stop and arrow keys skip disabled controls', () => {
    activeDom = createDemo();
    const { document, KeyboardEvent } = activeDom.window;
    const controls = [...document.querySelectorAll('.ctrl-bar > .ctrl-pill')];
    const preset = document.getElementById('presetTriggerBtn');

    expect(controls.filter((control) => control.tabIndex === 0)).toEqual([preset]);
    preset.focus();
    preset.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));

    expect(document.activeElement.textContent).toContain('Quality');
    expect(controls.filter((control) => control.tabIndex === 0)).toEqual([document.activeElement]);
  });

  it('keeps authoring and quality controls direct and moves workspace controls into Advanced', () => {
    activeDom = createDemo();
    const { document } = activeDom.window;
    const primaryLabels = [...document.querySelectorAll('.ctrl-bar > .ctrl-pill')].map((control) =>
      control.textContent.trim().replace(/\s+/g, ' ')
    );
    const advanced = document.getElementById('moreAdvancedActions');
    const workspace = document.getElementById('moreWorkspaceActions');

    expect(primaryLabels).toHaveLength(15);
    expect(primaryLabels.join(' ')).toContain('Preset');
    expect(primaryLabels.join(' ')).toContain('Quality');
    expect(primaryLabels.join(' ')).toContain('Sequence');
    expect(primaryLabels.join(' ')).toContain('Mode');
    expect(primaryLabels.join(' ')).toContain('Charset');
    expect(primaryLabels.join(' ')).toContain('Motion');
    expect(primaryLabels.join(' ')).toContain('Align');
    expect(primaryLabels.join(' ')).toContain('Color');
    expect(primaryLabels.join(' ')).toContain('Backdrop');
    expect(primaryLabels.join(' ')).toContain('Advanced');
    expect(primaryLabels.join(' ')).toContain('Image');
    expect(primaryLabels.join(' ')).toContain('3D');
    expect(primaryLabels.join(' ')).toContain('Chart');
    expect(primaryLabels.join(' ')).toContain('Reset');
    expect(primaryLabels.join(' ')).toContain('Code');
    expect(primaryLabels.indexOf('Image none')).toBeLessThan(primaryLabels.indexOf('3D none'));
    expect(primaryLabels.indexOf('3D none')).toBeLessThan(primaryLabels.indexOf('Code'));
    expect(advanced).toBeNull();
    expect(document.getElementById('qualityTriggerBtn').parentElement.classList.contains('ctrl-bar')).toBe(true);
    expect(workspace.querySelectorAll(':scope > .ctrl-pill')).toHaveLength(3);
    expect(
      document.getElementById('pop-more').contains(document.getElementById('pop-quality'))
    ).toBe(false);
    expect([...document.querySelector('.stage-top-actions').children].map((item) => item.id)).toEqual([
      'documentationBtn', 'aboutTriggerBtn', 'exportPictureTriggerBtn', ''
    ]);
    expect(document.getElementById('pop-more').contains(document.getElementById('pop-about'))).toBe(
      false
    );
  });

  it('surfaces live values, contextual reveal direction, and clear action groups', () => {
    activeDom = createDemo();
    const { document, Event } = activeDom.window;
    const revealGroup = document.getElementById('revealDirectionGroup');
    const fadeInButton = document.querySelector('[data-mode="fadeIn"]');

    expect(document.getElementById('qualityToolbarStatus').textContent).toBe('ultra · CPU');
    expect(document.getElementById('modeToolbarStatus').textContent).toBe('wave');
    expect(document.getElementById('motionToolbarStatus').textContent).toBe('1.0×');
    expect(revealGroup.hidden).toBe(true);

    fadeInButton.click();
    expect(revealGroup.hidden).toBe(false);
    expect(document.getElementById('motionToolbarStatus').textContent).toBe('Center');

    const direction = document.getElementById('revealDirection');
    direction.value = 'right-to-left';
    direction.dispatchEvent(new Event('change', { bubbles: true }));
    expect(document.getElementById('motionToolbarStatus').textContent).toBe('R→L');
    expect(document.getElementById('motionTriggerBtn').getAttribute('aria-label')).toBe(
      'Motion, R→L'
    );
    ['top-to-bottom', 'bottom-to-top', 'diagonal', 'edges'].forEach((value) => {
      expect(direction.querySelector(`option[value="${value}"]`)).not.toBeNull();
    });

    expect(document.querySelectorAll('.ctrl-bar__separator')).toHaveLength(2);
    expect(document.getElementById('themeToggleBtn').classList).toContain('ctrl-pill--utility');
    expect(document.querySelector('.ctrl-pill--code').classList).toContain('ctrl-pill--primary');
  });

  it('offers transition-focused and coined animation modes', () => {
    activeDom = createDemo();
    const { document } = activeDom.window;
    ['irisIn', 'irisOut', 'dissolveIn', 'dissolveOut', 'lumaFold', 'riftLace', 'echoBloom'].forEach((mode) => {
      const button = document.querySelector(`[data-mode="${mode}"]`);
      expect(button).not.toBeNull();
      button.click();
      expect(document.getElementById('modeToolbarStatus').textContent).toBe(mode);
    });
  });

  it('lets developers select automatic, WebGL2, or Canvas 2D rendering', () => {
    activeDom = createDemo();
    const { document, Event } = activeDom.window;
    const renderer = document.getElementById('renderer');

    expect([...renderer.options].map((option) => option.value)).toEqual([
      'auto',
      'webgl2',
      'canvas2d',
    ]);
    expect(document.getElementById('rendererStatus').textContent).toContain('fallback');
    renderer.value = 'canvas2d';
    renderer.dispatchEvent(new Event('change', { bubbles: true }));

    expect(document.getElementById('rendererStatus').textContent).toContain('CPU renderer active');
    expect(document.getElementById('qualityToolbarStatus').textContent).toBe('ultra · CPU');
    expect(document.getElementById('usageCodePopover').textContent).toContain(
      '"renderer": "canvas2d"'
    );
  });

  it('controls logical grid resolution independently of the quality tier', () => {
    activeDom = createDemo();
    const { document, Event } = activeDom.window;
    const resolution = document.getElementById('resolutionScale');

    const automaticGrid = document.getElementById('resolutionGridStatus').textContent;
    const automaticCells = automaticGrid.match(/(\d+)×(\d+)/).slice(1).map(Number);
    expect(resolution.value).toBe('1');
    expect(document.getElementById('resolutionScaleVal').textContent).toBe('100%');
    resolution.value = '1.5';
    resolution.dispatchEvent(new Event('input', { bubbles: true }));

    expect(document.getElementById('resolutionScaleVal').textContent).toBe('150%');
    const detailedGrid = document.getElementById('resolutionGridStatus').textContent;
    const detailedCells = detailedGrid.match(/(\d+)×(\d+)/).slice(1).map(Number);
    expect(detailedGrid).toMatch(/cells · 150%/);
    expect(detailedCells[0]).toBeGreaterThan(automaticCells[0]);
    expect(detailedCells[1]).toBeGreaterThan(automaticCells[1]);
    expect(document.getElementById('usageCodePopover').textContent).toContain('"resolutionScale": 1.5');

    document.getElementById('resetSettingsBtn').click();
    expect(resolution.value).toBe('1');
    expect(document.getElementById('resolutionGridStatus').textContent).toContain('100% logical resolution');
  });

  it('resets image and 3D model resources when app settings are reset to default', async () => {
    const source = './assets/images/bird-silhouette.svg';
    activeDom = createDemo(
      [{ name: 'Bird Silhouette', src: source, thumbnail: './assets/thumbnails/bird.webp' }],
      `https://demo.test/webutil/?image=${encodeURIComponent(source)}`
    );
    await new Promise((resolve) => setImmediate(resolve));
    const { document, Event } = activeDom.window;

    const meshPrimitive = document.getElementById('meshPrimitive');
    meshPrimitive.value = 'torus';
    meshPrimitive.dispatchEvent(new Event('change', { bubbles: true }));
    expect(document.getElementById('modelStatus').textContent).toContain('torus primitive active');
    expect(document.querySelector('.image-select[aria-pressed="true"]')).not.toBeNull();

    document.getElementById('resetSettingsBtn').click();

    expect(meshPrimitive.value).toBe('');
    expect(document.getElementById('modelStatus').textContent).toBe('No model loaded.');
    expect(document.querySelector('.image-select[aria-pressed="true"]')).toBeNull();
    expect(document.getElementById('imageStatus').textContent).toContain('ready');
  });

  it('caps utility frame-rate controls to the 0–540 fps range with auto and default 60', () => {
    activeDom = createDemo();
    const { document, Event } = activeDom.window;
    const cap = document.getElementById('targetFPS');

    expect(cap.min).toBe('0');
    expect(cap.max).toBe('540');
    expect(cap.value).toBe('60');
    cap.value = '0';
    cap.dispatchEvent(new Event('input', { bubbles: true }));
    expect(document.getElementById('targetFPSVal').textContent).toBe('Auto');

    cap.value = '120';
    cap.dispatchEvent(new Event('input', { bubbles: true }));
    expect(document.getElementById('targetFPSVal').textContent).toBe('120 fps');
    expect(document.getElementById('usageCodePopover').textContent).toContain('"targetFPS": 120');
  });

  it('routes cache-sensitive live controls through setOption', () => {
    activeDom = createDemo();
    const { document, Event } = activeDom.window;
    const script = projectFile('docs/static/webutil/js/webutil.js');

    expect(script).not.toMatch(/anim\.opts\.(color|edgeFade|speed|trail|pulse|cursor|showStats|colorAnimation|colorFromImage)\s*=(?!=)/);

    const color = document.getElementById('color');
    color.value = '#ff0000';
    color.dispatchEvent(new Event('input', { bubbles: true }));
    expect(document.getElementById('usageCodePopover').textContent).toContain('"color": "#ff0000"');

    const edgeFade = document.getElementById('edgeFade');
    edgeFade.value = '0.4';
    edgeFade.dispatchEvent(new Event('input', { bubbles: true }));
    expect(document.getElementById('usageCodePopover').textContent).toContain('"edgeFade": 0.4');
  });

  it('controls backdrop opacity from zero to one with exact input', () => {
    activeDom = createDemo();
    const { document, Event } = activeDom.window;
    const enabled = document.getElementById('backdropEnable');
    const range = document.getElementById('backdropOpacity');
    const number = document.getElementById('backdropOpacityNumber');
    const value = document.getElementById('backdropOpacityVal');
    const placement = document.getElementById('backdropPlacement');

    expect(range.min).toBe('0');
    expect(range.max).toBe('1');
    expect(range.step).toBe('0.01');
    enabled.checked = true;
    enabled.dispatchEvent(new Event('change', { bubbles: true }));

    number.value = '0';
    number.dispatchEvent(new Event('input', { bubbles: true }));
    expect(range.value).toBe('0');
    expect(value.textContent).toBe('0.00');
    expect(document.getElementById('usageCodePopover').textContent).toContain('"opacity": 0');

    range.value = '1';
    range.dispatchEvent(new Event('input', { bubbles: true }));
    expect(number.value).toBe('1.00');
    expect(value.textContent).toBe('1.00');
    expect(document.getElementById('usageCodePopover').textContent).toContain('"opacity": 1');

    placement.value = 'over';
    placement.dispatchEvent(new Event('change', { bubbles: true }));
    expect(document.getElementById('usageCodePopover').textContent).toContain('"placement": "over"');

    number.value = '1.5';
    number.dispatchEvent(new Event('change', { bubbles: true }));
    expect(number.value).toBe('1.00');
    expect(range.value).toBe('1');
  });

  it('offers the vortex mode and preset through the live controls', () => {
    activeDom = createDemo();
    const { document } = activeDom.window;
    const vortexButton = document.querySelector('[data-mode="vortex"]');

    expect(vortexButton).not.toBeNull();
    expect(document.querySelector('#preset option[value="vortexFlow"]')).not.toBeNull();
    vortexButton.click();
    expect(vortexButton.getAttribute('aria-pressed')).toBe('true');
    expect(document.getElementById('modeToolbarStatus').textContent).toBe('vortex');
    expect(document.getElementById('usageCodePopover').textContent).toContain('"mode": "vortex"');
  });

  it('offers the plasma mode and preset through the live controls', () => {
    activeDom = createDemo();
    const { document } = activeDom.window;
    const plasmaButton = document.querySelector('[data-mode="plasma"]');

    expect(plasmaButton).not.toBeNull();
    expect(document.querySelector('#preset option[value="plasmaField"]')).not.toBeNull();
    plasmaButton.click();
    expect(plasmaButton.getAttribute('aria-pressed')).toBe('true');
    expect(document.getElementById('modeToolbarStatus').textContent).toBe('plasma');
    expect(document.getElementById('usageCodePopover').textContent).toContain('"mode": "plasma"');
  });

  it('offers the remaining animation inventory through modes and presets', () => {
    activeDom = createDemo();
    const { document } = activeDom.window;
    const expected = [
      ['fire', 'risingEmbers'],
      ['starfield', 'deepSpace'],
      ['glitch', 'signalGlitch'],
      ['typewriter', 'terminalType'],
      ['orbit', 'orbitalFlow'],
      ['hoverZone', 'hoverField'],
      ['clickZone', 'clickPulse'],
    ];

    expected.forEach(([mode, preset]) => {
      const button = document.querySelector(`[data-mode="${mode}"]`);
      expect(button).not.toBeNull();
      expect(document.querySelector(`#preset option[value="${preset}"]`)).not.toBeNull();
      button.click();
      expect(button.getAttribute('aria-pressed')).toBe('true');
      expect(document.getElementById('modeToolbarStatus').textContent).toBe(mode);
      expect(document.getElementById('usageCodePopover').textContent).toContain(
        `"mode": "${mode}"`
      );
    });
  });

  it('exposes expanded character sets and nine alignment anchors', () => {
    activeDom = createDemo();
    const { document } = activeDom.window;
    const characterSet = document.getElementById('charSet');
    const options = [...characterSet.options].map((option) => option.value);
    expect(options).toEqual(expect.arrayContaining([
      'asciiExtended', 'minimal', 'technical', 'geometric', 'circuit', 'waves', 'terminal'
    ]));

    const alignments = [...document.querySelectorAll('[data-align]')].map((button) => button.dataset.align);
    expect(alignments).toEqual([
      'top-left', 'top', 'top-right', 'left', 'center', 'right', 'bottom-left', 'bottom', 'bottom-right'
    ]);
  });

  it('opens a gallery preset through the web utility query parameter', () => {
    activeDom = createDemo([], 'https://demo.test/?preset=deepSpace');
    const { document } = activeDom.window;

    expect(document.getElementById('preset').value).toBe('deepSpace');
    expect(document.querySelector('[data-mode="starfield"]').getAttribute('aria-pressed')).toBe(
      'true'
    );
    expect(document.getElementById('presetDirtyIndicator').textContent).toBe('deepSpace');
    expect(document.getElementById('usageCodePopover').textContent).toContain(
      '"mode": "starfield"'
    );
  });

  it('keeps the global mode when a preset changes and exposes no image-only effect menu', () => {
    activeDom = createDemo();
    const { document, Event } = activeDom.window;
    const ripple = document.querySelector('[data-mode="ripple"]');
    const preset = document.getElementById('preset');

    ripple.click();
    preset.value = 'deepSpace';
    preset.dispatchEvent(new Event('change', { bubbles: true }));

    expect(document.getElementById('modeToolbarStatus').textContent).toBe('ripple');
    expect(document.querySelector('[data-mode="ripple"]').getAttribute('aria-pressed')).toBe('true');
    expect(document.getElementById('imageMaskMode')).toBeNull();
    expect(document.querySelector('[data-mode="image"]')).toBeNull();
  });

  it('configures an incoming morph transition in the sequence editor', () => {
    activeDom = createDemo();
    const { document, Event } = activeDom.window;
    document.getElementById('addSequenceStepBtn').click();
    document.getElementById('addSequenceStepBtn').click();
    const secondStep = document.querySelectorAll('.sequence-step')[1];
    const transition = secondStep.querySelector('select[aria-label="Step 2 transition"]');
    const duration = secondStep.querySelector('input[aria-label="Step 2 morph duration in seconds"]');

    transition.value = 'morph';
    transition.dispatchEvent(new Event('change', { bubbles: true }));
    duration.value = '1.2';
    duration.dispatchEvent(new Event('change', { bubbles: true }));

    expect(duration.hidden).toBe(false);
    expect(document.getElementById('usageCodePopover').textContent).toContain('"type": "morph"');
    expect(document.getElementById('usageCodePopover').textContent).toContain('"duration": 1.2');
  });

  it('renders hero and splash ASCII as media slots and moves one canvas between them', () => {
    activeDom = createDemo();
    const { document } = activeDom.window;
    const heroButton = document.querySelector('[data-preview-type="hero-card"]');
    const splashButton = document.querySelector('[data-preview-type="splash"]');

    heroButton.click();
    expect(document.querySelector('[data-ascii-target="hero-card"] > canvas')).not.toBeNull();
    expect(document.querySelector('.preview-hero-card .hero-card-content')).not.toBeNull();
    expect(document.querySelector('.hero-card-reveal-layer')).toBeNull();

    splashButton.click();
    expect(document.querySelector('[data-ascii-target="splash"] > canvas')).not.toBeNull();
    expect(document.querySelector('[data-ascii-target="hero-card"] > canvas')).toBeNull();
  });

  it('configures an image animation color range and includes it in generated code', () => {
    activeDom = createDemo();
    const { document, Event } = activeDom.window;
    const toggle = document.getElementById('imageColorRangeToggle');
    const min = document.getElementById('imageColorRangeMin');
    const max = document.getElementById('imageColorRangeMax');

    toggle.checked = true;
    toggle.dispatchEvent(new Event('change', { bubbles: true }));
    min.value = '#800000';
    min.dispatchEvent(new Event('change', { bubbles: true }));
    max.value = '#ff8080';
    max.dispatchEvent(new Event('change', { bubbles: true }));
    document.querySelector('[data-mode="ripple"]').click();

    expect(toggle.getAttribute('aria-checked')).toBe('true');
    expect(document.getElementById('imageColorRangeControls').hidden).toBe(false);
    expect(document.getElementById('usageCodePopover').textContent).toContain(
      '"imageAnimationRange"'
    );
    expect(document.getElementById('usageCodePopover').textContent).toContain('"min": "#800000"');
  });

  it('exposes independent horizontal and vertical image scaling', () => {
    activeDom = createDemo();
    const { document, Event } = activeDom.window;
    const horizontal = document.getElementById('imageScaleX');
    const vertical = document.getElementById('imageScaleY');

    horizontal.value = '1.75';
    horizontal.dispatchEvent(new Event('input', { bubbles: true }));
    vertical.value = '0.65';
    vertical.dispatchEvent(new Event('input', { bubbles: true }));

    expect(document.getElementById('imageScaleXVal').textContent).toBe('1.75×');
    expect(document.getElementById('imageScaleYVal').textContent).toBe('0.65×');
  });

  it('exposes animated-image playback and sampling-rate controls', () => {
    activeDom = createDemo();
    const { document, Event } = activeDom.window;
    const playback = document.getElementById('animateImageFramesToggle');
    const frameRate = document.getElementById('imageFrameRate');

    playback.checked = false;
    playback.dispatchEvent(new Event('change', { bubbles: true }));
    frameRate.value = '18';
    frameRate.dispatchEvent(new Event('input', { bubbles: true }));

    expect(playback.getAttribute('aria-checked')).toBe('false');
    expect(document.getElementById('imageFrameRateVal').textContent).toBe('18 fps');
  });

  it('limits local models to GLB and exports dedicated 3D transform controls', () => {
    activeDom = createDemo();
    const { document, Event } = activeDom.window;
    expect(document.getElementById('modelInput').accept).toBe('.glb,model/gltf-binary');
    expect(document.getElementById('modelUrl').type).toBe('url');

    const primitive = document.getElementById('meshPrimitive');
    primitive.value = 'torus';
    primitive.dispatchEvent(new Event('change', { bubbles: true }));
    const scale = document.getElementById('meshScale');
    scale.value = '1.5';
    scale.dispatchEvent(new Event('input', { bubbles: true }));
    const fov = document.getElementById('meshFov');
    fov.value = '75';
    fov.dispatchEvent(new Event('input', { bubbles: true }));
    const autoRotate = document.getElementById('meshAutoRotateToggle');
    autoRotate.checked = false;
    autoRotate.dispatchEvent(new Event('change', { bubbles: true }));

    const source = document.getElementById('usageCodePopover').textContent;
    expect(document.getElementById('meshScaleVal').textContent).toBe('1.50×');
    expect(document.getElementById('meshFovVal').textContent).toBe('75°');
    expect(autoRotate.getAttribute('aria-checked')).toBe('false');
    expect(source).toContain('"meshTransform"');
    expect(source).toContain('"meshCamera"');
    expect(source).toContain('"meshAutoRotate": false');

    const rotation = document.getElementById('meshRotationY');
    rotation.value = '45';
    rotation.dispatchEvent(new Event('input', { bubbles: true }));
    document.getElementById('meshFlipXBtn').click();
    expect(document.getElementById('meshRotationYVal').textContent).toBe('45°');
    expect(document.getElementById('meshFlipXBtn').getAttribute('aria-pressed')).toBe('true');
    expect(document.getElementById('usageCodePopover').textContent).toContain('"rotation"');
  });

  it('rotates and flips sampled images through source controls', () => {
    activeDom = createDemo();
    const { document, Event } = activeDom.window;
    const rotation = document.getElementById('imageRotation');
    rotation.value = '30';
    rotation.dispatchEvent(new Event('input', { bubbles: true }));
    const flip = document.getElementById('imageFlipXToggle');
    flip.checked = true;
    flip.dispatchEvent(new Event('change', { bubbles: true }));

    expect(document.getElementById('imageRotationVal').textContent).toBe('30°');
    expect(flip.getAttribute('aria-checked')).toBe('true');
  });

  it('keeps compact stats by default and explicitly enables extended diagnostics', () => {
    activeDom = createDemo();
    const { document, Event } = activeDom.window;
    const stats = document.getElementById('stats');
    const fpsToggle = document.getElementById('statsToggle');
    const extendedToggle = document.getElementById('extendedStatsToggle');

    expect(fpsToggle.checked).toBe(false);
    expect(extendedToggle.checked).toBe(false);
    expect(stats.dataset.extended).toBe('false');

    extendedToggle.checked = true;
    extendedToggle.dispatchEvent(new Event('change', { bubbles: true }));

    expect(fpsToggle.checked).toBe(true);
    expect(fpsToggle.getAttribute('aria-checked')).toBe('true');
    expect(extendedToggle.getAttribute('aria-checked')).toBe('true');
    expect(stats.dataset.extended).toBe('true');
    expect(stats.style.display).toBe('block');
    expect(document.getElementById('usageCodePopover').textContent).toContain('"extendedStats": true');
  });

  it('exposes silhouette-aware SVG luminance mapping', () => {
    activeDom = createDemo();
    const { document, Event } = activeDom.window;
    const luminance = document.getElementById('imageLuminance');

    expect(luminance.value).toBe('auto');
    luminance.value = 'invert';
    luminance.dispatchEvent(new Event('change', { bubbles: true }));

    expect(luminance.value).toBe('invert');
  });

  it('renders safe, classified syntax tokens with the JetBrains Mono code font', () => {
    activeDom = createDemo();
    const { document } = activeDom.window;
    const code = document.getElementById('usageCodePopover');
    const fontLink = document.querySelector("link[href*='family=JetBrains+Mono']");

    expect(fontLink.href).toContain('family=JetBrains+Mono');
    expect(code.querySelectorAll('.token-keyword').length).toBeGreaterThan(0);
    expect(code.querySelectorAll('.token-property').length).toBeGreaterThan(0);
    expect(code.querySelectorAll('.token-string').length).toBeGreaterThan(0);
    expect(code.querySelectorAll('.token-number').length).toBeGreaterThan(0);
    expect(code.querySelector('.token-')).toBeNull();
    expect(code.textContent).toContain('<=>?@');
    expect(code.innerHTML).toContain('&lt;');
  });

  it('flips the foreground gradient stop direction', () => {
    activeDom = createDemo();
    const { document, Event } = activeDom.window;
    const colorMode = document.getElementById('colorMode');
    colorMode.value = 'gradient';
    colorMode.dispatchEvent(new Event('change', { bubbles: true }));
    const before = [...document.querySelectorAll('#gradStopsContainer .grad-stop-input')].map(
      (input) => input.value
    );

    document.getElementById('flipGradientBtn').click();
    const after = [...document.querySelectorAll('#gradStopsContainer .grad-stop-input')].map(
      (input) => input.value
    );

    expect(after).toEqual(before.reverse());
    expect(document.getElementById('usageCodePopover').textContent).toContain(
      `"stops": [\n      "${after[0]}"`
    );
  });

  it('builds, reorders, times, and plays an animation sequence', () => {
    activeDom = createDemo();
    const { document, Event } = activeDom.window;
    const add = document.getElementById('addSequenceStepBtn');

    add.click();
    document.querySelector('[data-mode="fadeOut"]').click();
    add.click();
    document.querySelector('[data-mode="fadeIn"]').click();
    add.click();

    const steps = () => [...document.querySelectorAll('#sequenceList .sequence-step')];
    expect(steps()).toHaveLength(3);
    expect(document.getElementById('sequenceToolbarStatus').textContent).toBe('3 steps');

    const duration = steps()[0].querySelector('input[type="number"]');
    duration.value = '5';
    duration.dispatchEvent(new Event('change', { bubbles: true }));
    const stagger = steps()[1].querySelectorAll('input[type="number"]')[1];
    stagger.value = '1.5';
    stagger.dispatchEvent(new Event('change', { bubbles: true }));

    steps()[2].querySelector('button[aria-label="Move node 3 earlier"]').click();
    expect(steps()[1].querySelector('select').value).toBe('fadeIn');

    document.getElementById('playSequenceBtn').click();
    expect(document.getElementById('sequenceStatus').textContent).toContain('Playing step 1');
    expect(steps()[0].getAttribute('aria-current')).toBe('step');

    const source = document.getElementById('usageCodePopover').textContent;
    expect(source).toContain('anim.setSequence');
    expect(source).toContain('"duration": 5');
    expect(source).toContain('"delay": 1.5');
    expect(source).toContain('"repeat": true');
    expect(source).toContain('anim.on("sequenceStepStart"');
    expect(source).toContain('anim.playSequence()');
  });

  it('edits image changes as ordered sequence nodes', async () => {
    activeDom = createDemo([
      { name: 'Bird', src: './assets/images/bird.svg', thumbnail: './assets/thumbnails/bird.webp' },
      { name: 'Hawk', src: './assets/images/hawk.svg', thumbnail: './assets/thumbnails/hawk.webp' },
    ]);
    await new Promise((resolve) => setImmediate(resolve));
    const { document, Event } = activeDom.window;

    document.getElementById('addSequenceStepBtn').click();
    const node = document.querySelector('#sequenceList .sequence-step');
    const sourceSelect = node.querySelector('[aria-label="Step 1 image source"]');

    expect([...sourceSelect.options].map((option) => option.textContent)).toEqual([
      'Retain current image', 'Clear image', 'Bird', 'Hawk'
    ]);
    sourceSelect.value = './assets/images/hawk.svg';
    sourceSelect.dispatchEvent(new Event('change', { bubbles: true }));

    expect(node.dataset.source).toBe('image');
    expect(document.getElementById('usageCodePopover').textContent).toContain(
      '"image": "./assets/images/hawk.svg"'
    );

    sourceSelect.value = '__clear__';
    sourceSelect.dispatchEvent(new Event('change', { bubbles: true }));
    expect(node.dataset.source).toBe('clear');
    expect(document.getElementById('usageCodePopover').textContent).toContain('"image": null');
  });

  it('keeps About concise and routes detailed guidance to documentation', () => {
    activeDom = createDemo();
    const { document } = activeDom.window;
    const headings = [...document.querySelectorAll('#pop-about h2')].map((heading) =>
      heading.textContent.trim()
    );

    expect(headings).toEqual(
      expect.arrayContaining(['Product overview', 'Configuration and runtime reference'])
    );
    expect(document.querySelectorAll('.about-reference-card')).toHaveLength(3);
    expect(document.querySelector('.about-export-table')).toBeNull();
    expect(document.querySelector('.about-control-table')).toBeNull();
    expect(document.getElementById('pop-about').textContent).toContain('WebGL2');
    expect(document.getElementById('pop-about').textContent).toContain('Canvas 2D');
    expect(document.querySelector('.about-hero-title').textContent).toBe(
      'ASCII media renderer'
    );
    expect(document.getElementById('pop-about').textContent).toContain(
      'npm install @staticcanvas/asciiam'
    );
    expect(document.getElementById('pop-about').textContent).not.toContain('git clone');
    expect(document.querySelector('#pop-about a[href="../"]')).not.toBeNull();
    expect(
      document.querySelector('#pop-about a[href="../guides/web-utility/"]')
    ).not.toBeNull();
    expect(document.querySelector('#pop-about a[href="../gallery/"]')).not.toBeNull();
    expect(document.querySelector('#pop-about a[href="../api/"]')).not.toBeNull();
  });

  it('opens About with Ctrl or Command+A without overriding editable fields', () => {
    activeDom = createDemo();
    const { document, KeyboardEvent } = activeDom.window;
    const about = document.getElementById('pop-about');
    const input = document.getElementById('savedPresetName');
    let openCount = 0;
    about.showPopover = () => {
      openCount += 1;
    };

    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'a', ctrlKey: true, bubbles: true })
    );
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'A', metaKey: true, bubbles: true })
    );
    expect(openCount).toBe(2);

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', ctrlKey: true, bubbles: true }));
    expect(openCount).toBe(2);
    expect(document.getElementById('aboutTriggerBtn').getAttribute('aria-keyshortcuts')).toBe(
      'Control+A Meta+A'
    );
  });
});
