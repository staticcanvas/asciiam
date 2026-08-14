import asciiam from "../libs/asciiam.esm.js";

const hero = document.querySelector("[data-asciiam-hero]");
const stage = hero?.querySelector("[data-asciiam-stage]");

if (hero && stage && asciiam.isSupported()) {
    const anim = new asciiam(stage, {
        mode: "ripple",
        quality: "balanced",
        renderer: "auto",
        charSet: "  \\//**kk",
        align: "top-left",
        color: "#C04FFF",
        speed: 1,
        edgeFade: 0.55,
        trail: 0.4,
        showStats: true,
        pulse: {
            amplitude: 0.5,
            speed: 0.8,
        },
        cursor: {
            enabled: true,
            radius: 160,
            strength: 0.7,
        },
        image: hero.dataset.imageUrl,
        imageScale: 0.5,
        imageFov: 0.65,
        fit: "cover",
        colorFromImage: true,
        imageChars: "  \\//**kk",
        animateImageMask: true,
        gradient: {
            type: "radial",
            angle: 45,
            steps: 5,
            stops: ["#4fa8ff", "#c04fff", "#ff4f8b", "#ff9d5c", "#4ffff3"],
            animate: false,
        },
    });

    anim.setSequence([
        {
            id: "step-1786547801812-1",
            mode: "orbit",
            duration: 10,
            delay: 0,
            options: {},
        },
        {
            id: "step-1786547816180-2",
            mode: "fadeIn",
            duration: 10,
            delay: 0,
            options: {},
        },
    ], { loop: false });

    const stats = hero.querySelector("[data-hero-stats]");
    if (stats) anim.attachStats(stats);
    anim.on("sequenceStepStart", ({ index, step }) => {
        console.log("started", index, step.mode);
    });
    anim.on("sequenceStepComplete", ({ index, step }) => {
        console.log("completed", index, step.mode);
    });
    anim.on("rendererFallback", ({ backend }) => {
        if (stats) stats.textContent = `${backend} fallback active`;
    });
    anim.playSequence();
    window.addEventListener("pagehide", () => anim.destroy(), { once: true });
}

const exampleBox = hero?.querySelector("[data-hero-examples]");
if (exampleBox && asciiam.isSupported()) {
    const examples = [];
    let disposed = false;
    const canvasFor = (kind) => exampleBox.querySelector(`[data-example-canvas="${kind}"]`);
    const createExample = (kind, options) => {
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
            ...options,
        });
        examples.push(instance);
        return instance;
    };
    const markError = (kind) => {
        const canvas = canvasFor(kind);
        const cell = canvas?.closest(".hero-example-cell");
        if (!cell) return;
        cell.dataset.state = "error";
        const caption = cell.querySelector("figcaption");
        if (caption) caption.textContent = `${kind} unavailable`;
    };

    const modeExample = createExample("mode", {
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
    modeExample?.start();

    const sequenceExample = createExample("sequence", {
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

    const imageExample = createExample("image", {
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
        .then(() => {
            if (!disposed) imageExample.start();
        })
        .catch(() => markError("image"));

    const meshExample = createExample("mesh", {
        mode: "mesh",
        color: "#C04FFF",
        charSet: " .:+*#%@",
        meshStyle: "wireframe",
        meshProjection: "perspective",
        meshAutoRotate: true,
        meshRotationSpeed: [0.12, 0.42, 0.06],
    });
    meshExample?.setModel(exampleBox.dataset.exampleModel)
        .then(() => {
            if (!disposed) meshExample.start();
        })
        .catch(() => markError("mesh"));

    window.addEventListener("pagehide", () => {
        disposed = true;
        examples.forEach((instance) => instance.destroy());
    }, { once: true });
}
