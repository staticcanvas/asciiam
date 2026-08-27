/**
 * @file home.js
 * @description Main entry script for the Asciiam documentation homepage, mounting hero and card animations.
 * @module home
 */

import { initHeroAnimation, initExampleCards, initShowcaseCards } from "./asciiam-animations.js?v=23f89b7ff27c";

/**
 * Initializes homepage animations when the DOM is ready.
 * @function initHomePage
 * @returns {void}
 */
function initHomePage() {
    const hero = document.querySelector("[data-asciiam-hero]");
    const stage = hero?.querySelector("[data-asciiam-stage]");

    if (stage) {
        initHeroAnimation(stage);
    }

    const exampleBox = hero?.querySelector("[data-hero-examples]");
    if (exampleBox) {
        initExampleCards(exampleBox);
    }

    const showcaseBox = document.querySelector("[data-showcase-container]");
    if (showcaseBox) {
        initShowcaseCards(showcaseBox);
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initHomePage);
} else {
    initHomePage();
}
