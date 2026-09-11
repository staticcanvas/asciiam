/**
 * @file asciiam-animations.js
 * @description Centralized animation engine helpers, presets, and scene initializers for the Asciiam documentation site.
 * @module asciiam-animations
 * @author Asciiam Maintainers
 * @license MIT
 */

import asciiam from "../libs/asciiam.esm.js?v=__ASSET_REVISION__";

const HERO_RAMP = '  .\'`,^:";~+_(){}[]<>!?ilI|/\\tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$';
const LOGO_URL = new URL("../branding/asciiam-logo.svg", import.meta.url).href;

/**
 * Resolves relative logo URLs to absolute root-relative ESM URLs across subpages.
 * @param {string} url Input image URL or path string.
 * @returns {string} Fully resolved image URL.
 */
function resolveImageUrl(url) {
    if (!url || url === "./branding/asciiam-logo.svg" || url === "branding/asciiam-logo.svg" || url.endsWith("/branding/asciiam-logo.svg")) {
        return LOGO_URL;
    }
    return url;
}

/**
 * @typedef {Object} HeroAnimationOptions
 * @property {string} [mode="current"] Primary mode algorithm for the hero stage.
 * @property {string} [color="#4FA8FF"] Fallback ASCII text color.
 * @property {string} [charSet] Printable ASCII character set ramp.
 * @property {string} [imageUrl] Optional background image URL to sample.
 * @property {boolean} [showStats=false] Whether to attach live FPS diagnostic counters.
 */

/**
 * @typedef {Object} HeroCompactAnimationOptions
 * @property {string} [mode="fadeIn"] Animation mode for page hero header background.
 * @property {string} [color="#4FA8FF"] Primary ASCII glyph color.
 * @property {string} [charSet=" 01"] Character ramp string.
 */

/**
 * Initializes the main splash page hero stage ASCII animation (Animation 1 from context-source -> animations-list.md).
 *
 * @param {HTMLElement} stageElement The DOM element acting as the canvas container.
 * @param {HeroAnimationOptions} [options={}] Configuration overrides for the hero animation.
 * @returns {asciiam|null} The initialized asciiam engine instance, or null if unsupported.
 */
export function initHeroAnimation(stageElement, options = {}) {
    if (!stageElement || !asciiam.isSupported()) return null;
    const hero = stageElement.closest("[data-asciiam-hero]");
    const rawUrl = options.imageUrl || options.image || hero?.dataset?.imageUrl || LOGO_URL;
    const imageUrl = resolveImageUrl(rawUrl);

    const anim = new asciiam(stageElement, {
        mode: "current",
        quality: "high",
        targetFPS: 60,
        resolutionScale: 1,
        renderer: "auto",
        charSet: options.charSet || HERO_RAMP,
        align: "center",
        color: options.color || "#4FA8FF",
        speed: 1,
        edgeFade: 0,
        trail: 0.34,
        showStats: false,
        extendedStats: false,
        pulse: null,
        cursor: null,
        image: imageUrl,
        imageScale: 1.4,
        imageScaleX: 1,
        imageScaleY: 1,
        imageFov: 0.9,
        imageRotation: 0,
        imageFlipX: false,
        imageFlipY: false,
        imageLuminance: "auto",
        animateImageFrames: true,
        imageFrameRate: 12,
        fit: "cover",
        colorFromImage: true,
        imageChars: options.charSet || HERO_RAMP,
        animateImageMask: true,
        backdrop: {
            enabled: true,
            opacity: 0.9,
            color: "#0a0c10",
            placement: "over",
            gradient: {
                type: "cubic",
                angle: 45,
                steps: 4,
                stops: ["#000000", "#061718", "#081421", "#160c1d"],
            },
        },
        ...options,
    });

    const stats = hero?.querySelector("[data-hero-stats]");
    if (stats) anim.attachStats(stats);

    anim.on("rendererFallback", ({ backend }) => {
        if (stats) stats.textContent = `${backend} fallback active`;
    });

    anim.start();
    window.addEventListener("pagehide", () => anim.destroy(), { once: true });
    return anim;
}

/**
 * Initializes ASCII background animation for page header hero panels (.hero.hero-compact)
 * using a single-step sequence with repeat disabled and renderer stop on completion.
 *
 * @param {HTMLElement} heroElement Header element (.hero.hero-compact).
 * @param {HeroCompactAnimationOptions} [options={}] Configuration overrides.
 * @returns {asciiam|null} The initialized asciiam instance, or null if unsupported.
 */
export function initHeroCompactAnimation(heroElement, options = {}) {
    if (!heroElement || !asciiam.isSupported()) return null;
    const stageContainer = heroElement.querySelector("[data-hero-compact-stage]") || heroElement.querySelector(".hero-bg") || heroElement;
    const rawUrl = options.image || heroElement.dataset?.imageUrl || LOGO_URL;
    const imageUrl = resolveImageUrl(rawUrl);

    const anim = new asciiam(stageContainer, {
        mode: "fadeIn",
        loop: false,
        quality: "high",
        targetFPS: 60,
        resolutionScale: 2,
        renderer: "auto",
        charSet: options.charSet || " 01",
        align: "center",
        color: options.color || "#4FA8FF",
        speed: 1,
        edgeFade: 0,
        trail: 0.34,
        showStats: false,
        extendedStats: false,
        pulse: null,
        cursor: null,
        revealDirection: "center",
        image: imageUrl,
        imageScale: 0.5,
        imageScaleX: 2.05,
        imageScaleY: 0.9,
        imageFov: 0.9,
        imageRotation: 0,
        imageFlipX: false,
        imageFlipY: false,
        imageLuminance: "auto",
        animateImageFrames: false,
        imageFrameRate: 12,
        fit: "cover",
        colorFromImage: false,
        imageChars: options.charSet || " 01",
        animateImageMask: false,
        backdrop: {
            enabled: true,
            opacity: 0.9,
            color: "#0a0c10",
            placement: options.backdrop?.placement || "behind",
            gradient: {
                type: "cubic",
                angle: 45,
                steps: 4,
                stops: ["#000000", "#061718", "#081421", "#160c1d"],
            },
        },
        ...options,
    });

    anim.setSequence([
        {
            id: "step-1786727252129-1",
            mode: options.mode || "fadeIn",
            duration: 5,
            delay: 0,
            repeat: false,
            options: {
                loop: false,
                animateImageFrames: false,
                animateImageMask: false,
            },
            transition: {
                type: "cut",
                duration: 0,
                easing: "linear",
            },
        },
    ], { loop: false });

    anim.on("sequenceStepStart", ({ index, step }) => {
        console.log("started", index, step.mode);
    });

    anim.on("sequenceStepComplete", ({ index, step }) => {
        console.log("completed", index, step.mode);
        anim.stop();
    });

    anim.playSequence();
    window.addEventListener("pagehide", () => anim.destroy(), { once: true });
    return anim;
}

/**
 * Automatically attaches ASCII background animations to all .hero.hero-compact elements on the page.
 *
 * @returns {asciiam[]} Array of initialized compact hero animation instances.
 */
export function initAllHeroCompactElements() {
    const compactHeroes = document.querySelectorAll("header.hero.hero-compact, .hero.hero-compact");
    const instances = [];
    compactHeroes.forEach((element) => {
        const instance = initHeroCompactAnimation(element);
        if (instance) instances.push(instance);
    });
    return instances;
}

/**
 * Initializes interactive mini-example cards on the documentation homepage.
 *
 * @param {HTMLElement} exampleBox The parent container holding example canvases.
 * @returns {{ examples: asciiam[], destroy: Function }} An object containing initialized instances and a cleanup function.
 */
export function initExampleCards(exampleBox) {
    if (!exampleBox || !asciiam.isSupported()) return { examples: [], destroy: () => {} };

    const examples = [];
    let isDisposed = false;

    /**
     * Helper to retrieve a canvas element for a specific example key.
     * @param {string} kind Example identifier key.
     * @returns {HTMLCanvasElement|null}
     */
    const canvasFor = (kind) => exampleBox.querySelector(`[data-example-canvas="${kind}"]`);

    /**
     * Helper to mark an example card as failed or unavailable.
     * @param {string} kind Example identifier key.
     */
    const markError = (kind) => {
        const canvas = canvasFor(kind);
        const cell = canvas?.closest(".hero-example-cell");
        if (!cell) return;
        cell.dataset.state = "error";
        const caption = cell.querySelector("figcaption");
        if (caption) caption.textContent = `${kind} unavailable`;
    };

    /**
     * Instantiates an asciiam card animation.
     * @param {string} kind Example identifier key.
     * @param {Object} config Specific configuration options.
     * @returns {asciiam|null}
     */
    const createCard = (kind, config) => {
        const canvas = canvasFor(kind);
        if (!canvas) return null;
        const instance = new asciiam(canvas, {
            quality: "performance",
            renderer: "auto",
            maxDPR: 1,
            targetFPS: 24,
            fontSize: 9,
            density: 0.88,
            edgeFade: 0.16,
            respectReducedMotion: true,
            ...config,
        });
        examples.push(instance);
        return instance;
    };

    // Card 1: Mode animation
    const modeInstance = createCard("mode", {
        mode: "plasma",
        color: "#4FA8FF",
        speed: 0.7,
        charSet: " .:+*#%@",
        gradient: {
            type: "radial",
            center: [0.4, 0.4],
            radius: 0.9,
            stops: ["#4FA8FF", "#C04FFF", "#4FFFF3"],
            steps: 3,
        },
    });
    modeInstance?.start();

    // Card 2: Sequence animation
    const sequenceExample = createCard("sequence", {
        mode: "wave",
        color: "#72F1B8",
        charSet: " 01/\\*+",
        speed: 1,
    });
    sequenceExample?.setSequence([
        { mode: "wave", duration: 2.4, options: { align: "top-left", speed: 1.2 } },
        { mode: "irisOut", duration: 1.8, repeat: false, options: { align: "center" } },
        { mode: "orbit", duration: 2.6, options: { align: "center", orbitDensity: 0.035 } },
    ], { loop: true });
    sequenceExample?.playSequence();

    // Card 3: Image animation
    const imageExample = createCard("image", {
        mode: "wave",
        color: "#E8EEF7",
        charSet: " .:-=+*#%@",
        imageChars: " .:-=+*#%@",
        colorFromImage: true,
        fit: "cover",
        imageScale: 1,
        imageFov: 0.78,
        animateImageMask: true,
        speed: 0.65,
    });
    imageExample?.setImage(exampleBox.dataset.exampleImage)
        .then(() => { if (!isDisposed) imageExample.start(); })
        .catch(() => markError("image"));

    // Card 4: 3D Mesh animation (High fidelity grid detail)
    const meshExample = createCard("mesh", {
        mode: "mesh",
        color: "#C04FFF",
        charSet: " .:+*#%@",
        fontSize: 5,
        density: 0.35,
        resolutionScale: 1.6,
        meshStyle: "wireframe",
        meshProjection: "perspective",
        meshAutoRotate: true,
        meshRotationSpeed: [0.15, 0.45, 0.08],
    });
    meshExample?.setModel(exampleBox.dataset.exampleModel)
        .then(() => { if (!isDisposed) meshExample.start(); })
        .catch(() => markError("mesh"));

    /**
     * Disposes all running card animation instances.
     */
    const destroy = () => {
        isDisposed = true;
        examples.forEach((instance) => instance.destroy());
    };

    window.addEventListener("pagehide", destroy, { once: true });
    return { examples, destroy };
}

/**
 * Initializes the 8-element interactive showcase grid on the homepage.
 *
 * @param {HTMLElement} container Parent container element holding the 8 showcase cards.
 * @returns {{ instances: asciiam[], destroy: Function }} Object containing instances and cleanup.
 */
export function initShowcaseCards(container) {
    if (!container || !asciiam.isSupported()) return { instances: [], destroy: () => {} };

    const instances = [];
    const configs = [
        {
            kind: "vortex",
            options: {
                mode: "vortex",
                color: "#4FA8FF",
                speed: 0.8,
                fontSize: 7,
                density: 0.6,
                gradient: { type: "radial", center: [0.5, 0.5], radius: 0.8, stops: ["#4FFFF3", "#C04FFF"], steps: 2 },
            },
        },
        {
            kind: "matrix",
            options: {
                mode: "matrix",
                color: "#3CF07A",
                speed: 1.2,
                fontSize: 8,
                density: 0.7,
                charSet: " 01アイウエオカキクケコ",
            },
        },
        {
            kind: "fire",
            options: {
                mode: "fire",
                color: "#FF7B54",
                speed: 1.0,
                fontSize: 7,
                density: 0.6,
                fireDensity: 0.04,
                charSet: " .:-=+*#%@",
            },
        },
        {
            kind: "starfield",
            options: {
                mode: "starfield",
                color: "#78B7FF",
                speed: 1.1,
                fontSize: 7,
                density: 0.65,
                starfieldDensity: 0.025,
            },
        },
        {
            kind: "compositing",
            options: {
                mode: "current",
                fontSize: 7,
                density: 0.6,
                layers: [
                    { mode: "current", opacity: 0.5, color: "#005fff" },
                    { mode: "wave", opacity: 0.4, speed: 1.2, color: "#00ffff" },
                    { mode: "sparkle", opacity: 0.35, color: "#ffffff" },
                ],
            },
        },
        {
            kind: "ripple",
            options: {
                mode: "ripple",
                color: "#72F1B8",
                speed: 0.7,
                fontSize: 7,
                density: 0.6,
                edgeFade: 0.25,
            },
        },
        {
            kind: "glitch",
            options: {
                mode: "glitch",
                color: "#C04FFF",
                speed: 0.9,
                fontSize: 8,
                density: 0.7,
                glitchIntensity: 0.35,
                charSet: " 01<>/\\|#@",
            },
        },
        {
            kind: "torus3d",
            options: {
                mode: "mesh",
                color: "#4FFFF3",
                meshPrimitive: "torus",
                meshStyle: "wireframe",
                meshProjection: "perspective",
                meshAutoRotate: true,
                meshRotationSpeed: [0.2, 0.5, 0.15],
                fontSize: 6,
                density: 0.45,
                resolutionScale: 1.5,
            },
        },
    ];

    configs.forEach(({ kind, options }) => {
        const canvas = container.querySelector(`[data-showcase-canvas="${kind}"]`);
        if (!canvas) return;
        const anim = new asciiam(canvas, {
            quality: "performance",
            renderer: "auto",
            maxDPR: 1,
            targetFPS: 30,
            respectReducedMotion: true,
            ...options,
        });
        anim.start();
        instances.push(anim);
    });

    const destroy = () => instances.forEach((anim) => anim.destroy());
    window.addEventListener("pagehide", destroy, { once: true });
    return { instances, destroy };
}

/**
 * Factory utility to initialize a preset animation on any DOM element.
 *
 * @param {HTMLElement|string} target Container element or selector string.
 * @param {string} [presetName="heroWave"] Named preset configuration.
 * @param {Object} [overrides={}] Custom options to merge.
 * @returns {asciiam|null} The created animation instance.
 */
export function createPresetAnimation(target, presetName = "heroWave", overrides = {}) {
    if (!target || !asciiam.isSupported()) return null;
    const presets = asciiam.PRESETS || {};
    const baseOptions = presets[presetName] ? presets[presetName]() : { mode: "wave" };
    const instance = new asciiam(target, {
        ...baseOptions,
        ...overrides,
    });
    instance.start();
    return instance;
}

export default {
    initHeroAnimation,
    initHeroCompactAnimation,
    initAllHeroCompactElements,
    initExampleCards,
    initShowcaseCards,
    createPresetAnimation,
};
