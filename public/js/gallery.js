import asciiam from "../libs/asciiam.esm.js?v=f9d36768bfca";

const root = document.querySelector("[data-preset-gallery]");

if (root) {
    const cards = [...root.querySelectorAll("[data-preset-card]")];
    const search = root.querySelector("#preset-search");
    const filters = [...root.querySelectorAll("[data-gallery-filter]")];
    const status = root.querySelector(".gallery-status");
    const active = new Map();
    const leaveTimers = new Map();
    const visible = new Set();
    const maximumActive = 6;
    let activeFilter = "all";

    const parseOptions = (card) => JSON.parse(atob(card.dataset.options));
    const setPreviewState = (card, value) => {
        card.querySelector("[data-preset-preview]").dataset.state = value;
    };
    const destroyPreview = (card) => {
        const instance = active.get(card);
        if (!instance) return;
        instance.destroy();
        active.delete(card);
        setPreviewState(card, "paused");
    };
    const enforceLimit = () => {
        while (active.size >= maximumActive) {
            const candidate = [...active.keys()].find((card) => !visible.has(card)) || active.keys().next().value;
            if (!candidate) break;
            destroyPreview(candidate);
        }
    };
    const createPreview = (card, asciiam) => {
        if (active.has(card) || card.hidden || card.dataset.previewable !== "true") {
            if (card.dataset.previewable !== "true") setPreviewState(card, "image required");
            return;
        }
        enforceLimit();
        const preview = card.querySelector("[data-preset-preview]");
        const options = {
            ...parseOptions(card),
            quality: "ultra",
            renderer: "auto",
            showStats: false,
            respectReducedMotion: true,
        };
        setPreviewState(card, "starting");
        try {
            const instance = new asciiam(preview, options);
            active.set(card, instance);
            instance.start();
            setPreviewState(card, instance.getRendererInfo().backend === "webgl2" ? "GPU" : "CPU fallback");
        } catch {
            setPreviewState(card, "preview error");
        }
    };

    try {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                const card = entry.target;
                clearTimeout(leaveTimers.get(card));
                if (entry.isIntersecting) {
                    visible.add(card);
                    createPreview(card, asciiam);
                } else {
                    visible.delete(card);
                    leaveTimers.set(card, setTimeout(() => destroyPreview(card), 1200));
                }
            });
        }, { rootMargin: "180px 0px", threshold: 0.02 });
        cards.forEach((card) => observer.observe(card));
        cards.filter((card) => !card.hidden && card.dataset.previewable === "true").slice(0, 3).forEach((card) => {
            visible.add(card);
            createPreview(card, asciiam);
        });
    } catch {
        cards.forEach((card) => setPreviewState(card, "renderer unavailable"));
        status.textContent = "The preview renderer could not be loaded. Preset copying remains available.";
    }

    const applyFilter = () => {
        const query = search.value.trim().toLocaleLowerCase("en");
        const matches = cards.map((card) => {
            const categoryMatches = activeFilter === "all" || card.dataset.category === activeFilter;
            const queryMatches = !query || `${card.dataset.name} ${card.dataset.mode}`.toLocaleLowerCase("en").includes(query);
            return categoryMatches && queryMatches;
        });
        const update = () => cards.forEach((card, index) => {
            card.hidden = !matches[index];
            if (card.hidden) destroyPreview(card);
        });
        if (document.startViewTransition) document.startViewTransition(update);
        else update();
        const count = matches.filter(Boolean).length;
        status.textContent = `${count} preset${count === 1 ? "" : "s"} shown. Up to ${maximumActive} visible previews render concurrently.`;
    };
    filters.forEach((button) => button.addEventListener("click", () => {
        activeFilter = button.dataset.galleryFilter;
        filters.forEach((candidate) => candidate.setAttribute("aria-pressed", String(candidate === button)));
        applyFilter();
    }));
    search.addEventListener("input", applyFilter);
    cards.forEach((card) => {
        card.querySelector("[data-copy-preset]").addEventListener("click", async (event) => {
            const source = `const options = ${JSON.stringify(parseOptions(card), null, 2)};`;
            if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(source);
            else {
                const textarea = document.createElement("textarea");
                textarea.value = source;
                document.body.append(textarea);
                textarea.select();
                document.execCommand("copy");
                textarea.remove();
            }
            const button = event.currentTarget;
            button.textContent = "Copied";
            setTimeout(() => { button.textContent = "Copy configuration"; }, 1200);
        });
    });
    applyFilter();
}
