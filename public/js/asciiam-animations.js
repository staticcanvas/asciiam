/**
 * @file asciiam-animations.js
 * @description Centralized animation engine helpers, presets, and scene initializers for the Asciiam documentation site.
 * @module asciiam-animations
 * @author Asciiam Maintainers
 * @license MIT
 */

import asciiam from "../libs/asciiam.esm.js";

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

    // Card 4: 3D Mesh animation
    const meshExample = createCard("mesh", {
        mode: "mesh",
        color: "#C04FFF",
        charSet: " .:+*#%@",
        meshStyle: "wireframe",
        meshProjection: "perspective",
        meshAutoRotate: true,
        meshRotationSpeed: [0.12, 0.42, 0.06],
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
    createPresetAnimation,
};
