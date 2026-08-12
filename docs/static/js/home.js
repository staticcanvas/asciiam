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
