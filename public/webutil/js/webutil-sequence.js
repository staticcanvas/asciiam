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
        transition: step.transition?.type === "morph"
            ? { type: "morph", duration: Number(step.transition.duration) > 0 ? Number(step.transition.duration) : 0.8, easing: step.transition.easing || "easeInOut" }
            : { type: "cut", duration: 0, easing: "linear" },
    }));
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
