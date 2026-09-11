/**
 * @file webutil-sequence.js
 * @description Sequence step normalizer and serializer module for the Web Utility timeline editor.
 * @module webutil-sequence
 */

/**
 * Normalizes serializable sequence input array for visual editing in the Web Utility timeline UI.
 *
 * @param {Object[]} steps Raw sequence step objects.
 * @returns {Object[]} Normalized sequence steps.
 */
export function normalizeSequenceDraft(steps) {
    if (!Array.isArray(steps)) return [];
    return steps.map((step, index) => ({
        id: step.id || `step-${index + 1}`,
        mode: step.mode || "wave",
        duration: Number(step.duration) > 0 ? Number(step.duration) : 5,
        delay: Number(step.delay) > 0 ? Number(step.delay) : 0,
        repeat: step.repeat === true,
        image: Object.prototype.hasOwnProperty.call(step, "image") ? step.image : undefined,
        options: step.options && typeof step.options === "object" ? { ...step.options } : {},
        transition: normalizeTransition(step.transition),
    }));
}

/**
 * Mirrors asciiam's own `setSequence()` transition normalization (src/asciiam.js) so the
 * editor round-trips exactly what the engine will actually do with a step: 'cut' (instant),
 * 'blend' (the original whole-canvas crossfade), or 'morph' (real per-cell transition, with
 * its 'dissolve' | 'scramble' | 'flow' style and wavefront spread).
 *
 * @param {Object} [transition] Raw transition input.
 * @returns {Object} Normalized transition.
 */
function normalizeTransition(transition) {
    const type = transition?.type;
    if (type !== "blend" && type !== "morph") return { type: "cut", duration: 0, easing: "linear" };
    const normalized = {
        type,
        duration: Number(transition.duration) > 0 ? Number(transition.duration) : 0.8,
        easing: ["linear", "easeIn", "easeOut", "easeInOut"].includes(transition.easing) ? transition.easing : "easeInOut",
    };
    if (type === "morph") {
        normalized.style = ["dissolve", "scramble", "flow"].includes(transition.style) ? transition.style : "dissolve";
        const spread = Number(transition.spread);
        normalized.spread = Number.isFinite(spread) ? Math.max(0.02, Math.min(0.9, spread)) : 0.22;
    }
    return normalized;
}

/**
 * Removes editor-only transient state while retaining explicit image source assignments.
 *
 * @param {Object[]} steps Editor sequence steps.
 * @returns {Object[]} Clean serializable sequence steps.
 */
export function serializeSequenceDraft(steps) {
    return steps.map((step) => {
        const serialized = {
            id: step.id,
            mode: step.mode,
            duration: step.duration,
            delay: step.delay,
            repeat: step.repeat,
            options: { ...step.options },
            transition: { ...step.transition },
        };
        if (step.image !== undefined) serialized.image = step.image;
        return serialized;
    });
}
