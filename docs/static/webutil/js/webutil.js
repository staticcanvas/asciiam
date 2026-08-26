/**
 * @file webutil.js
 * @description Primary UI controller, state management, toolbar popovers, and interactive workbench script for the Asciiam Web Utility.
 * @module webutil
 */

import { highlightJavaScript } from "./webutil-code.js?v=__ASSET_REVISION__";
import { normalizeSequenceDraft, serializeSequenceDraft } from "./webutil-sequence.js?v=__ASSET_REVISION__";

const asciiam = window.asciiam;

/* ============================== demo wiring ============================== */
const stage = document.getElementById("stage");
const statsEl = document.getElementById("stats");
const settingsStorageKey = "asciiam:demo-settings:v1";
const savedPresetsStorageKey = "asciiam:saved-presets:v1";
const demoDefaults = Object.assign({}, asciiam.presets.heroWave, {
    quality: "ultra",
    targetFPS: 60,
    resolutionScale: 1,
    renderer: "auto",
    charSet: asciiam.CHARACTER_SETS.asciiExtended,
    imageChars: asciiam.CHARACTER_SETS.asciiExtended,
    align: "center",
    gradient: null,
    backdrop: null,
    trail: 0,
    pulse: null,
    cursor: null,
    showStats: false,
    extendedStats: false,
    colorAnimation: null,
    image: null,
    imageScale: 1,
    imageScaleX: 1,
    imageScaleY: 1,
    imageFov: 1,
    imageRotation: 0,
    imageFlipX: false,
    imageFlipY: false,
    imageLuminance: "auto",
    fit: "cover",
    imageAnimationRange: null,
    animateImageFrames: true,
    imageFrameRate: 12,
    revealDirection: "center",
    animateImageMask: true,
    colorFromImage: false,
    loop: true,
    minOpacity: 0.05,
    maxOpacity: 0.85,
    ambient: 0.35,
    bandWidth: 0.14,
    snowDensity: 0.02,
    sparkleDensity: 0.05,
    fireDensity: 0.035,
    starfieldDensity: 0.018,
    orbitDensity: 0.014,
    glitchIntensity: 0.32,
    typewriterDuration: 4.5,
    meshPrimitive: null,
    meshStyle: "wireframe",
    interactionRadius: 180,
    interactionDuration: 1.1,
    sequence: null,
    sequenceOptions: null,
});
let restoredSettings = null;
try {
    restoredSettings = JSON.parse(localStorage.getItem(settingsStorageKey));
} catch {
    restoredSettings = null;
}
const queryParameters = new URLSearchParams(location.search);
const requestedPresetName = queryParameters.get("preset");
const requestedImageSource = queryParameters.get("image")?.trim() || null;
const requestedPreset = requestedPresetName && Object.prototype.hasOwnProperty.call(asciiam.presets, requestedPresetName)
    ? asciiam.presets[requestedPresetName]
    : null;
let requestedConfig = null;
try {
    const encoded = queryParameters.get("config");
    if (encoded) {
        const normalized = encoded.replace(/-/g, "+").replace(/_/g, "/");
        const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
        const binary = atob(padded);
        const percentEncoded = Array.from(binary, (character) => `%${character.charCodeAt(0).toString(16).padStart(2, "0")}`).join("");
        const candidate = JSON.parse(decodeURIComponent(percentEncoded));
        if (candidate && !Array.isArray(candidate) && typeof candidate === "object") requestedConfig = candidate;
    }
} catch {
    requestedConfig = null;
}
const requestedImageOptions = requestedImageSource ? { image: requestedImageSource, colorFromImage: true } : {};
const initialOptions = Object.assign({}, demoDefaults, restoredSettings?.options || {}, requestedPreset || {}, requestedConfig || {}, requestedImageOptions);
const rawInitialFps = initialOptions.targetFPS;
initialOptions.targetFPS = rawInitialFps === null || rawInitialFps === undefined || rawInitialFps === 0 || rawInitialFps === "0" ? 0 : Math.min(540, Math.max(0, Number(rawInitialFps) || 60));
let activeImageSource = typeof initialOptions.image === "string" ? initialOptions.image : null;
const anim = new asciiam(document.querySelector('[data-ascii-target="background"]'), initialOptions);
let settingsReady = false;
let activePresetSnapshot = null;
let activePresetLabel = requestedImageSource ? "Docs media" : requestedConfig ? "Docs example" : requestedPreset ? requestedPresetName : restoredSettings?.options ? "Custom" : "heroWave";
let optionHistory = [];
let historyIndex = -1;
let historyTimer = null;
let historyReady = false;
let applyingHistory = false;
anim.attachStats(statsEl);
anim.start();
if (activeImageSource) {
    anim.setImage(activeImageSource).catch(() => {});
}
if (initialOptions.model) {
    anim.setModel(initialOptions.model).catch(() => {});
}

const previewButtons = [...document.querySelectorAll("[data-preview-type]")];
const previewScenes = [...document.querySelectorAll("[data-preview-scene]")];
function setPreviewType(type) {
    stage.dataset.preview = type;
    previewButtons.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.previewType === type)));
    previewScenes.forEach((scene) => {
        const isActive = scene.dataset.previewScene === type;
        scene.dataset.active = String(isActive);
        scene.setAttribute("aria-hidden", String(!isActive));
        scene.toggleAttribute("inert", !isActive);
    });
    anim.setTarget(document.querySelector(`[data-ascii-target="${type}"]`));
}
previewButtons.forEach((button) => button.addEventListener("click", () => setPreviewType(button.dataset.previewType)));
const heroCard = document.querySelector(".preview-hero-card");
document.querySelectorAll("[data-hero-card-variant]").forEach((button) => {
    button.addEventListener("click", () => {
        heroCard.dataset.heroVariant = button.dataset.heroCardVariant;
        document.querySelectorAll("[data-hero-card-variant]").forEach((candidate) => {
            candidate.setAttribute("aria-pressed", String(candidate === button));
        });
        anim.setTarget(document.querySelector('[data-ascii-target="hero-card"]'));
    });
});

/* ── Spatial origin buttons wiring ── */
function setAlignment(value) {
    anim.setOption("align", value);
    document.querySelectorAll("[data-align]").forEach((button) => {
        button.setAttribute("aria-pressed", String(button.dataset.align === value));
    });
    renderUsage();
}
document.querySelectorAll("[data-align]").forEach((button) => {
    button.onclick = () => setAlignment(button.dataset.align);
});

const modes = [
    "plain", "wave", "current", "ripple", "vortex", "plasma", "fadeIn", "fadeOut",
    "irisIn", "irisOut", "dissolveIn", "dissolveOut", "assemble", "breakApart", "lumaFold", "riftLace", "echoBloom",
    "matrix", "snow", "sparkle", "fire", "starfield", "glitch", "typewriter", "orbit",
    "hoverZone", "clickZone",
];
let sequenceImageLibrary = [];
const modeButtonsEl = document.getElementById("modeButtons");
function setActiveModeButton(mode) {
    [...modeButtonsEl.children].forEach((button) => {
        const isActive = button.dataset.mode === mode;
        button.setAttribute("aria-pressed", String(isActive));
    });
    const revealDirectionGroup = document.getElementById("revealDirectionGroup");
    if (revealDirectionGroup) revealDirectionGroup.hidden = !["fadeIn", "fadeOut", "dissolveIn", "dissolveOut", "assemble", "breakApart"].includes(mode);
    const interactionControls = document.getElementById("interactionControlsGroup");
    if (interactionControls) interactionControls.hidden = !["hoverZone", "clickZone"].includes(mode);
}

const chartEnabledToggle = document.getElementById("chartEnabledToggle");
if (chartEnabledToggle) {
    chartEnabledToggle.onchange = () => {
        anim.setOption("chartEnabled", chartEnabledToggle.checked);
        if (chartEnabledToggle.checked && !anim.opts.chartData) {
            applyChartDataFromInput();
        }
        renderUsage();
    };
}
const chartTypeEl = document.getElementById("chartType");
if (chartTypeEl) {
    chartTypeEl.onchange = () => {
        anim.setOption("chartType", chartTypeEl.value);
        renderUsage();
    };
}
const chartTitleEl = document.getElementById("chartTitle");
if (chartTitleEl) {
    chartTitleEl.oninput = () => {
        anim.setOption("chartTitle", chartTitleEl.value);
        renderUsage();
    };
}
const chartDataEl = document.getElementById("chartData");
function applyChartDataFromInput() {
    if (!chartDataEl) return;
    const raw = chartDataEl.value.split(",").map((v) => parseFloat(v.trim())).filter((v) => !isNaN(v));
    if (raw.length) {
        anim.setOption("chartData", raw);
        renderUsage();
    }
}
if (chartDataEl) {
    chartDataEl.oninput = applyChartDataFromInput;
}
const chartShowAxesToggle = document.getElementById("chartShowAxesToggle");
if (chartShowAxesToggle) {
    chartShowAxesToggle.onchange = () => {
        anim.setOption("chartShowAxes", chartShowAxesToggle.checked);
        renderUsage();
    };
}

// Chart labels — when set, merge into {label, value}[] data format
const chartLabelsEl = document.getElementById("chartLabels");
function applyChartLabelsFromInput() {
    if (!chartLabelsEl || !chartDataEl) return;
    const rawVals = chartDataEl.value.split(",").map((v) => parseFloat(v.trim())).filter((v) => !isNaN(v));
    const rawLabels = chartLabelsEl.value.split(",").map((l) => l.trim());
    if (rawVals.length === 0) return;
    if (rawLabels.length > 0 && rawLabels[0] !== "") {
        const merged = rawVals.map((val, i) => ({ value: val, label: rawLabels[i] ?? "" }));
        anim.setOption("chartData", merged);
    } else {
        anim.setOption("chartData", rawVals);
    }
    renderUsage();
}
if (chartLabelsEl) {
    chartLabelsEl.oninput = applyChartLabelsFromInput;
    // Override applyChartDataFromInput to also re-merge labels
    const origApply = applyChartDataFromInput;
    chartDataEl.oninput = () => {
        if (chartLabelsEl.value.trim()) {
            applyChartLabelsFromInput();
        } else {
            origApply();
        }
    };
}

// Scale range inputs
const chartScaleMinEl = document.getElementById("chartScaleMin");
const chartScaleMaxEl = document.getElementById("chartScaleMax");
if (chartScaleMinEl) {
    chartScaleMinEl.oninput = () => {
        const v = chartScaleMinEl.value.trim();
        anim.setOption("chartScaleMin", v === "" ? null : parseFloat(v));
        renderUsage();
    };
}
if (chartScaleMaxEl) {
    chartScaleMaxEl.oninput = () => {
        const v = chartScaleMaxEl.value.trim();
        anim.setOption("chartScaleMax", v === "" ? null : parseFloat(v));
        renderUsage();
    };
}

// Legend toggle
const chartShowLegendToggle = document.getElementById("chartShowLegendToggle");
if (chartShowLegendToggle) {
    chartShowLegendToggle.onchange = () => {
        anim.setOption("chartShowLegend", chartShowLegendToggle.checked);
        renderUsage();
    };
}

// Animate items stagger toggle
const chartAnimateItemsToggle = document.getElementById("chartAnimateItemsToggle");
if (chartAnimateItemsToggle) {
    chartAnimateItemsToggle.onchange = () => {
        anim.setOption("chartAnimateItems", chartAnimateItemsToggle.checked);
        renderUsage();
    };
}

// Per-series color palette
const chartColorsEl = document.getElementById("chartColors");
if (chartColorsEl) {
    chartColorsEl.oninput = () => {
        const raw = chartColorsEl.value.trim();
        const colors = raw ? raw.split(/\s+/).filter(Boolean) : null;
        anim.setOption("chartColors", colors && colors.length > 0 ? colors : null);
        renderUsage();
    };
}

// Chart sample data presets
const setChartPreset = (title, dataStr) => {
    if (chartTitleEl) chartTitleEl.value = title;
    if (chartDataEl) chartDataEl.value = dataStr;
    if (chartEnabledToggle) {
        chartEnabledToggle.checked = true;
        chartEnabledToggle.setAttribute("aria-checked", "true");
    }
    anim.setOption("chartTitle", title);
    anim.setOption("chartEnabled", true);
    applyChartDataFromInput();
};

document.getElementById("chartPresetGrowthBtn")?.addEventListener("click", () => setChartPreset("Revenue Growth", "15, 32, 48, 72, 95, 60, 84"));
document.getElementById("chartPresetLoadBtn")?.addEventListener("click", () => setChartPreset("Server Workload", "45, 88, 62, 91, 35, 76, 50"));
document.getElementById("chartPresetTempBtn")?.addEventListener("click", () => setChartPreset("Temperature", "20, 22, 25, 28, 31, 27, 23"));
document.getElementById("chartPresetFinancialBtn")?.addEventListener("click", () => setChartPreset("Stock Trend", "100, 110, 105, 125, 140, 135, 160"));

const chartTriggerBtn = document.getElementById("chartTriggerBtn");
if (chartTriggerBtn) {
    chartTriggerBtn.addEventListener("click", () => {
        if (!anim.opts.chartData) {
            if (chartTypeEl) anim.setOption("chartType", chartTypeEl.value);
            if (chartTitleEl) anim.setOption("chartTitle", chartTitleEl.value);
            if (chartLabelsEl && chartLabelsEl.value.trim()) {
                applyChartLabelsFromInput();
            } else {
                applyChartDataFromInput();
            }
            if (chartEnabledToggle) {
                chartEnabledToggle.checked = true;
                chartEnabledToggle.setAttribute("aria-checked", "true");
            }
            anim.setOption("chartEnabled", true);
            renderUsage();
        }
    });
}

const clearMediaBtn = document.getElementById("clearMediaBtn");
if (clearMediaBtn) {
    clearMediaBtn.onclick = () => {
        if (typeof anim.clearImage === "function") anim.clearImage();
        if (typeof anim.clearModel === "function") anim.clearModel();
        if (typeof anim.clearChart === "function") anim.clearChart();
        else {
            anim.setOption("chartData", null);
            anim.setOption("chartEnabled", false);
            anim.setOption("chartScaleMin", null);
            anim.setOption("chartScaleMax", null);
            anim.setOption("chartColors", null);
            anim.setOption("chartAnimateItems", false);
        }
        if (chartEnabledToggle) {
            chartEnabledToggle.checked = false;
            chartEnabledToggle.setAttribute("aria-checked", "false");
        }
        anim.setOption("imageEnabled", true);
        anim.setOption("meshEnabled", true);
        if (imageEnabledToggle) {
            imageEnabledToggle.checked = true;
            imageEnabledToggle.setAttribute("aria-checked", "true");
        }
        if (meshEnabledToggle) {
            meshEnabledToggle.checked = true;
            meshEnabledToggle.setAttribute("aria-checked", "true");
        }
        anim.setMode("wave");
        setActiveModeButton("wave");
        renderUsage();
    };
}

const sweepDurationEl = document.getElementById("sweepDuration");
const sweepDurationVal = document.getElementById("sweepDurationVal");
if (sweepDurationEl) {
    sweepDurationEl.oninput = () => {
        const val = parseFloat(sweepDurationEl.value);
        if (sweepDurationVal) sweepDurationVal.textContent = val.toFixed(1) + "s";
        anim.setOption("sweepDuration", val);
        renderUsage();
    };
}
const delayCurveEl = document.getElementById("delayCurve");
if (delayCurveEl) {
    delayCurveEl.onchange = () => {
        anim.setOption("delayCurve", delayCurveEl.value);
        renderUsage();
    };
}
modes.forEach((m) => {
    const b = document.createElement("button");
    b.className = "mode-btn";
    b.type = "button";
    b.textContent = m;
    b.dataset.mode = m;
    b.setAttribute("aria-pressed", String(m === "wave"));
    b.onclick = () => {
        // Image sampling is a source layer; mode changes only select
        // the global animation algorithm and retain the source.
        if (anim._sourceImage) {
            anim.opts.imageChars = anim.opts.charSet;
            anim._resampleImage();
        }
        anim.setMode(m);
        setActiveModeButton(m);
        renderUsage();
    };
    modeButtonsEl.appendChild(b);
});

/* ── Ordered animation sequence editor ── */
let sequenceDraft = normalizeSequenceDraft(initialOptions.sequence);
let sequenceStepCounter = sequenceDraft.length;
let sequenceLoop = initialOptions.sequenceOptions?.loop !== false;
const sequenceList = document.getElementById("sequenceList");
const sequenceStatus = document.getElementById("sequenceStatus");
const sequenceLoopToggle = document.getElementById("sequenceLoopToggle");
const playSequenceBtn = document.getElementById("playSequenceBtn");
const stopSequenceBtn = document.getElementById("stopSequenceBtn");

function serializableSequence() {
    return serializeSequenceDraft(sequenceDraft);
}

function setSequenceStatus(message, isError = false) {
    sequenceStatus.textContent = message;
    sequenceStatus.dataset.error = String(isError);
}

function updateSequenceButtons() {
    const state = anim.getSequenceState();
    playSequenceBtn.disabled = sequenceDraft.length === 0;
    playSequenceBtn.textContent = state.running ? "Pause" : state.index >= 0 ? "Resume" : "Play";
    stopSequenceBtn.disabled = state.index < 0;
    document.getElementById("sequenceToolbarStatus").textContent = sequenceDraft.length
        ? state.running ? `${state.index + 1}/${sequenceDraft.length}` : `${sequenceDraft.length} steps`
        : "off";
    [...sequenceList.children].forEach((item, index) => {
        if (index === state.index && state.index >= 0) item.setAttribute("aria-current", "step");
        else item.removeAttribute("aria-current");
    });
}

function configureSequence({ announce = true } = {}) {
    sequenceLoop = sequenceLoopToggle.checked;
    sequenceLoopToggle.setAttribute("aria-checked", String(sequenceLoop));
    if (sequenceDraft.length) {
        anim.setSequence(serializableSequence(), { loop: sequenceLoop, autoplay: false });
        if (announce) setSequenceStatus(`${sequenceDraft.length} animation${sequenceDraft.length === 1 ? "" : "s"} configured.`);
    } else {
        anim.clearSequence();
        if (announce) setSequenceStatus("Add an animation to begin.");
    }
    updateSequenceButtons();
    renderUsage();
}

function moveSequenceStep(index, direction) {
    const target = index + direction;
    if (target < 0 || target >= sequenceDraft.length) return;
    [sequenceDraft[index], sequenceDraft[target]] = [sequenceDraft[target], sequenceDraft[index]];
    renderSequenceEditor();
    configureSequence();
}

function renderSequenceEditor() {
    sequenceList.replaceChildren();
    sequenceLoopToggle.checked = sequenceLoop;
    sequenceLoopToggle.setAttribute("aria-checked", String(sequenceLoop));
    if (!sequenceDraft.length) {
        const empty = document.createElement("li");
        empty.className = "sequence-empty";
        empty.textContent = "No animations in this sequence.";
        sequenceList.appendChild(empty);
        updateSequenceButtons();
        return;
    }

    sequenceDraft.forEach((step, index) => {
        const item = document.createElement("li");
        item.className = "sequence-step";
        item.dataset.sequenceStep = step.id;
        item.dataset.source = typeof step.image === "string" ? "image" : step.image === null ? "clear" : "retain";

        const header = document.createElement("div");
        header.className = "sequence-step__header";
        const indexLabel = document.createElement("span");
        indexLabel.className = "sequence-step__index";
        indexLabel.textContent = `Node ${index + 1}`;
        const actions = document.createElement("div");
        actions.className = "sequence-step__actions";
        const up = document.createElement("button");
        up.className = "mode-btn";
        up.type = "button";
        up.textContent = "←";
        up.disabled = index === 0;
        up.setAttribute("aria-label", `Move node ${index + 1} earlier`);
        up.onclick = () => moveSequenceStep(index, -1);
        const down = document.createElement("button");
        down.className = "mode-btn";
        down.type = "button";
        down.textContent = "→";
        down.disabled = index === sequenceDraft.length - 1;
        down.setAttribute("aria-label", `Move node ${index + 1} later`);
        down.onclick = () => moveSequenceStep(index, 1);
        const remove = document.createElement("button");
        remove.className = "mode-btn";
        remove.type = "button";
        remove.textContent = "Remove";
        remove.setAttribute("aria-label", `Remove node ${index + 1}`);
        remove.onclick = () => {
            sequenceDraft.splice(index, 1);
            renderSequenceEditor();
            configureSequence();
        };
        actions.append(up, down, remove);
        header.append(indexLabel, actions);

        const grid = document.createElement("div");
        grid.className = "sequence-step__grid";
        const modeLabel = document.createElement("label");
        modeLabel.textContent = "Animation";
        const modeSelect = document.createElement("select");
        modeSelect.setAttribute("aria-label", `Step ${index + 1} animation`);
        modes.forEach((mode) => {
            const option = document.createElement("option");
            option.value = mode;
            option.textContent = mode;
            modeSelect.appendChild(option);
        });
        modeSelect.value = step.mode;
        modeSelect.onchange = () => {
            step.mode = modeSelect.value;
            configureSequence();
        };
        modeLabel.appendChild(modeSelect);

        const imageLabel = document.createElement("label");
        imageLabel.textContent = "Image source";
        const imageSelect = document.createElement("select");
        imageSelect.setAttribute("aria-label", `Step ${index + 1} image source`);
        imageSelect.append(new Option("Retain current image", ""), new Option("Clear image", "__clear__"));
        sequenceImageLibrary.forEach((image) => {
            imageSelect.appendChild(new Option(image.name || image.alt || image.src, image.image || image.src));
        });
        if (typeof step.image === "string" && ![...imageSelect.options].some((option) => option.value === step.image)) {
            imageSelect.appendChild(new Option("Configured image", step.image));
        }
        imageSelect.value = step.image === null ? "__clear__" : step.image || "";
        imageSelect.onchange = () => {
            step.image = imageSelect.value === "" ? undefined : imageSelect.value === "__clear__" ? null : imageSelect.value;
            item.dataset.source = typeof step.image === "string" ? "image" : step.image === null ? "clear" : "retain";
            configureSequence();
        };
        imageLabel.appendChild(imageSelect);

        const durationLabel = document.createElement("label");
        durationLabel.textContent = "Duration (s)";
        const durationInput = document.createElement("input");
        durationInput.type = "number";
        durationInput.min = "0.1";
        durationInput.step = "0.1";
        durationInput.value = String(step.duration);
        durationInput.onchange = () => {
            step.duration = Math.max(0.1, Number(durationInput.value) || 5);
            durationInput.value = String(step.duration);
            configureSequence();
        };
        durationLabel.appendChild(durationInput);

        const delayLabel = document.createElement("label");
        delayLabel.textContent = "Stagger (s)";
        const delayInput = document.createElement("input");
        delayInput.type = "number";
        delayInput.min = "0";
        delayInput.step = "0.1";
        delayInput.value = String(step.delay);
        delayInput.onchange = () => {
            step.delay = Math.max(0, Number(delayInput.value) || 0);
            delayInput.value = String(step.delay);
            configureSequence();
        };
        delayLabel.appendChild(delayInput);
        const repeatLabel = document.createElement("label");
        repeatLabel.className = "ui-switch";
        const repeatInput = document.createElement("input");
        repeatInput.className = "ui-switch__control";
        repeatInput.type = "checkbox";
        repeatInput.role = "switch";
        repeatInput.checked = step.repeat;
        repeatInput.setAttribute("aria-checked", String(step.repeat));
        repeatInput.setAttribute("aria-label", `Repeat step ${index + 1} animation within its duration`);
        repeatInput.onchange = () => {
            step.repeat = repeatInput.checked;
            repeatInput.setAttribute("aria-checked", String(step.repeat));
            configureSequence();
        };
        const repeatControl = document.createElement("span");
        repeatControl.className = "ui-switch__track";
        repeatControl.setAttribute("aria-hidden", "true");
        const repeatText = document.createElement("span");
        repeatText.className = "ui-switch__label";
        repeatText.textContent = "Repeat animation";
        repeatLabel.append(repeatInput, repeatControl, repeatText);
        const transitionLabel = document.createElement("label");
        transitionLabel.textContent = "Transition in";
        const transitionSelect = document.createElement("select");
        transitionSelect.setAttribute("aria-label", `Step ${index + 1} transition`);
        transitionSelect.append(new Option("Cut", "cut"), new Option("Morph", "morph"));
        transitionSelect.value = step.transition?.type || "cut";
        const morphDuration = document.createElement("input");
        morphDuration.type = "number";
        morphDuration.min = "0.1";
        morphDuration.step = "0.1";
        morphDuration.value = String(step.transition?.duration || 0.8);
        morphDuration.setAttribute("aria-label", `Step ${index + 1} morph duration in seconds`);
        morphDuration.hidden = transitionSelect.value !== "morph";
        transitionSelect.onchange = () => {
            step.transition = transitionSelect.value === "morph"
                ? { type: "morph", duration: Math.max(0.1, Number(morphDuration.value) || 0.8), easing: "easeInOut" }
                : { type: "cut", duration: 0, easing: "linear" };
            morphDuration.hidden = transitionSelect.value !== "morph";
            configureSequence();
        };
        morphDuration.onchange = () => {
            const duration = Math.max(0.1, Number(morphDuration.value) || 0.8);
            morphDuration.value = String(duration);
            step.transition = { type: "morph", duration, easing: "easeInOut" };
            configureSequence();
        };
        transitionLabel.append(transitionSelect, morphDuration);
        grid.append(modeLabel, imageLabel, durationLabel, delayLabel, repeatLabel, transitionLabel);

        const details = document.createElement("details");
        details.className = "sequence-step__options";
        const summary = document.createElement("summary");
        summary.textContent = "Step option overrides (JSON)";
        const optionsLabel = document.createElement("label");
        optionsLabel.textContent = "Options object";
        const optionsInput = document.createElement("textarea");
        optionsInput.spellcheck = false;
        optionsInput.value = JSON.stringify(step.options, null, 2);
        const error = document.createElement("span");
        error.className = "sequence-step__error";
        error.setAttribute("role", "alert");
        optionsInput.onchange = () => {
            try {
                const value = JSON.parse(optionsInput.value || "{}");
                if (!value || Array.isArray(value) || typeof value !== "object") throw new Error("Use a JSON object.");
                step.options = value;
                error.textContent = "";
                configureSequence();
            } catch (parseError) {
                error.textContent = parseError.message;
            }
        };
        optionsLabel.append(optionsInput, error);
        details.append(summary, optionsLabel);

        item.append(header, grid, details);
        sequenceList.appendChild(item);
    });
    updateSequenceButtons();
}

function syncSequenceEditorFromOpts() {
    const configured = Array.isArray(anim.opts.sequence) ? anim.opts.sequence : [];
    sequenceDraft = normalizeSequenceDraft(configured);
    sequenceStepCounter = sequenceDraft.length;
    sequenceLoop = anim.opts.sequenceOptions?.loop !== false;
    renderSequenceEditor();
}

document.getElementById("addSequenceStepBtn").onclick = () => {
    sequenceStepCounter += 1;
    sequenceDraft.push({
        id: `step-${Date.now()}-${sequenceStepCounter}`,
        mode: anim.opts.mode,
        duration: anim.opts.mode === "fadeIn" || anim.opts.mode === "fadeOut" ? 3 : 5,
        delay: 0,
        repeat: true,
        image: undefined,
        options: {},
        transition: { type: "cut", duration: 0, easing: "linear" },
    });
    renderSequenceEditor();
    configureSequence();
};
sequenceLoopToggle.onchange = () => configureSequence();
playSequenceBtn.onclick = () => {
    const state = anim.getSequenceState();
    if (state.running) anim.pauseSequence();
    else {
        if (!state.configured) configureSequence({ announce: false });
        anim.playSequence();
    }
    updateSequenceButtons();
};
stopSequenceBtn.onclick = () => {
    anim.stopSequence();
    setSequenceStatus("Sequence stopped.");
    updateSequenceButtons();
};
anim.on("sequenceStepStart", ({ index, step }) => {
    setActiveModeButton(step.mode);
    setSequenceStatus(`Playing step ${index + 1}: ${step.mode}.`);
    updateSequenceButtons();
    updateToolbarSummaries();
});
anim.on("sequencePause", () => {
    setSequenceStatus("Sequence paused.");
    updateSequenceButtons();
});
anim.on("sequenceComplete", () => {
    setSequenceStatus("Sequence complete.");
    updateSequenceButtons();
});
anim.on("sequenceInterrupt", () => {
    setSequenceStatus("Sequence interrupted by a manual mode change.");
    updateSequenceButtons();
});
renderSequenceEditor();

/* ── Compact toolbar information architecture ── */
function organizeToolbarOverflow() {
    const workspaceActions = document.getElementById("moreWorkspaceActions");
    const nestedPopovers = document.getElementById("moreNestedPopovers");
    const moveControl = (triggerId, destination) => {
        const trigger = document.getElementById(triggerId);
        if (!trigger) return;
        destination.appendChild(trigger);
        const popoverId = trigger.getAttribute("aria-controls");
        const popover = popoverId ? document.getElementById(popoverId) : null;
        if (popover) nestedPopovers.appendChild(popover);
    };

    ["themeToggleBtn", "undoSettingsBtn", "redoSettingsBtn"]
        .forEach((id) => moveControl(id, workspaceActions));
}
organizeToolbarOverflow();

/* ── WAI-ARIA toolbar roving focus ── */
const toolbar = document.querySelector(".ctrl-bar");
const toolbarControls = [...toolbar.querySelectorAll(":scope > .ctrl-pill")];
toolbar.setAttribute("aria-orientation", "horizontal");
function setToolbarTabStop(control) {
    toolbarControls.forEach((candidate) => { candidate.tabIndex = candidate === control ? 0 : -1; });
}
function ensureToolbarTabStop() {
    const current = toolbarControls.find((control) => control.tabIndex === 0 && !control.disabled);
    if (!current) {
        const firstEnabled = toolbarControls.find((control) => !control.disabled);
        if (firstEnabled) setToolbarTabStop(firstEnabled);
    }
}
toolbarControls.forEach((control, index) => {
    control.tabIndex = index === 0 ? 0 : -1;
    control.addEventListener("focus", () => setToolbarTabStop(control));
});
toolbar.addEventListener("keydown", (event) => {
    if (!event.target.classList.contains("ctrl-pill")) return;
    const enabled = toolbarControls.filter((control) => !control.disabled);
    const currentIndex = enabled.indexOf(event.target);
    if (currentIndex < 0) return;
    const rtl = getComputedStyle(toolbar).direction === "rtl";
    let nextIndex = null;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = enabled.length - 1;
    if (event.key === "ArrowRight") nextIndex = currentIndex + (rtl ? -1 : 1);
    if (event.key === "ArrowLeft") nextIndex = currentIndex + (rtl ? 1 : -1);
    if (nextIndex === null) return;
    event.preventDefault();
    nextIndex = (nextIndex + enabled.length) % enabled.length;
    setToolbarTabStop(enabled[nextIndex]);
    enabled[nextIndex].focus();
});

/* ── Popover positioning & aria-expanded sync ── */
document.querySelectorAll('.ctrl-pill[popovertarget], .stage-about-trigger[popovertarget]').forEach((pill) => {
    const targetId = pill.getAttribute('popovertarget');
    const popover = document.getElementById(targetId);
    if (!popover) return;
    popover.addEventListener('toggle', (e) => {
        if (e.newState === 'open' && !popover.classList.contains('ctrl-popover--modal') && !popover.classList.contains('ctrl-popover--fullscreen')) {
            const rect = pill.getBoundingClientRect();
            const popWidth = popover.offsetWidth || 320;
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const isTopAction = pill.closest('.stage-top-actions');

            if (popover.id === 'pop-sequence') {
                const gutter = viewportWidth <= 720 ? 'var(--space-sm)' : 'var(--space-md)';
                popover.style.left = gutter;
                popover.style.right = gutter;
                popover.style.bottom = `${viewportHeight - rect.top + 10}px`;
                popover.style.top = 'auto';
            } else if (isTopAction) {
                let left = rect.left;
                if (left + popWidth > viewportWidth - 16) {
                    left = Math.max(16, viewportWidth - popWidth - 16);
                }
                popover.style.left = `${left}px`;
                popover.style.top = `${rect.bottom + 8}px`;
                popover.style.bottom = 'auto';
                popover.style.right = 'auto';
                popover.style.maxHeight = `calc(100vh - ${rect.bottom + 24}px)`;
            } else {
                let left = rect.left;
                if (left + popWidth > viewportWidth - 16) {
                    left = Math.max(16, viewportWidth - popWidth - 16);
                }
                popover.style.left = `${left}px`;
                popover.style.bottom = `${viewportHeight - rect.top + 10}px`;
                popover.style.top = 'auto';
                popover.style.right = 'auto';
                popover.style.maxHeight = `calc(${rect.top - 24}px)`;
            }
        }
        pill.setAttribute('aria-expanded', String(e.newState === 'open'));
    });
});

/* ── Auto-show About Splash on first visit ── */
const hasVisited = localStorage.getItem("asciiam:visited");
if (!hasVisited) {
    const aboutPop = document.getElementById("pop-about");
    if (aboutPop && typeof aboutPop.showPopover === "function") {
        setTimeout(() => {
            try { aboutPop.showPopover(); } catch {}
        }, 400);
    }
    localStorage.setItem("asciiam:visited", "true");
}

function applyDemoOptions(options, presetName = "", referenceLabel = presetName || "Custom") {
    const activeMode = anim.opts.mode || "wave";
    const qualityName = options.quality || "ultra";
    Object.assign(anim.opts, demoDefaults, quality, options, { quality: qualityName });
    const rawOptFps = options.targetFPS;
    anim.opts.targetFPS = rawOptFps === null || rawOptFps === undefined || rawOptFps === 0 || rawOptFps === "0" ? 0 : Math.min(540, Math.max(0, Number(rawOptFps) || 60));

    activeImageSource = typeof options.image === "string" ? options.image : null;
    if (activeImageSource) {
        anim.setImage(activeImageSource).catch(() => {});
        const requestedIndex = typeof sequenceImageLibrary !== "undefined" && sequenceImageLibrary
            ? sequenceImageLibrary.findIndex((img) => new URL(img.image || img.src, location.href).href === new URL(activeImageSource, location.href).href)
            : -1;
        const localImagesEl = document.getElementById("localImages");
        if (requestedIndex >= 0 && localImagesEl) {
            const selectedButton = localImagesEl.querySelectorAll(".image-select")[requestedIndex];
            if (typeof markSelectedImage === "function") markSelectedImage(selectedButton);
        }
    } else {
        anim.clearImage();
        if (typeof markSelectedImage === "function") markSelectedImage(null);
        const imageInput = document.getElementById("imageInput");
        if (imageInput) imageInput.value = "";
        if (typeof setImageStatus === "function") {
            if (typeof sequenceImageLibrary !== "undefined" && sequenceImageLibrary && sequenceImageLibrary.length) {
                setImageStatus(`${sequenceImageLibrary.length} included image${sequenceImageLibrary.length === 1 ? "" : "s"} ready. Select one to apply it.`);
            } else {
                setImageStatus("No image loaded.");
            }
        }
    }

    if (options.meshPrimitive) {
        anim.setOption("meshPrimitive", options.meshPrimitive);
        if (typeof setModelStatus === "function") setModelStatus(`${options.meshPrimitive} primitive active.`);
    } else if (options.model) {
        anim.setModel(options.model).catch(() => {});
        if (typeof setModelStatus === "function") setModelStatus("Model loaded.");
    } else {
        anim.clearModel();
        const meshPrimEl = document.getElementById("meshPrimitive");
        if (meshPrimEl) meshPrimEl.value = "";
        const modelInput = document.getElementById("modelInput");
        if (modelInput) modelInput.value = "";
        const modelUrl = document.getElementById("modelUrl");
        if (modelUrl) modelUrl.value = "";
        if (typeof setModelStatus === "function") setModelStatus("No model loaded.");
    }

    if (options.chartData !== undefined) {
        anim.setOption("chartData", options.chartData);
        anim.setOption("chartEnabled", options.chartEnabled !== undefined ? options.chartEnabled : !!options.chartData);
    } else if (options.chartEnabled !== undefined) {
        anim.setOption("chartEnabled", options.chartEnabled);
    }
    if (options.imageEnabled !== undefined) anim.setOption("imageEnabled", options.imageEnabled);
    if (options.meshEnabled !== undefined) anim.setOption("meshEnabled", options.meshEnabled);

    const targetMode = presetName ? activeMode : (options.mode || activeMode);
    anim.opts.mode = targetMode === "image" ? "wave" : targetMode;
    const requestedRenderer = anim.opts.renderer || "auto";
    if (anim.getRendererInfo().requested !== requestedRenderer) anim.setRenderer(requestedRenderer);
    anim.setMode(anim.opts.mode);
    if (Array.isArray(anim.opts.sequence) && anim.opts.sequence.length) {
        anim.setSequence(anim.opts.sequence, anim.opts.sequenceOptions || {});
    } else {
        anim.clearSequence();
    }
    anim._buildFontCache();
    anim._resize();
    syncControlsFromOpts();
    document.getElementById("preset").value = presetName;
    if (!applyingHistory) {
        activePresetLabel = referenceLabel;
        activePresetSnapshot = getPersistableOptions();
    }
    renderUsage();
}

// Built-in presets share the same reset/apply path as local presets, so
// fields omitted by a preset cannot leak in from the previous selection.
document.getElementById("preset").onchange = (e) => {
    const name = e.target.value;
    if (!name) return;
    const cfg = asciiam.presets[name];
    applyDemoOptions(cfg, name);
};

document.getElementById("quality").onchange = (e) => {
    anim.setOption("quality", e.target.value);
    anim.setOption("targetFPS", Number(document.getElementById("targetFPS").value));
    document.getElementById("preset").value = "";
    renderUsage();
};
const targetFPS = document.getElementById("targetFPS");
targetFPS.oninput = (event) => {
    const value = Number(event.target.value);
    anim.setOption("targetFPS", value === 0 ? 0 : value);
    document.getElementById("targetFPSVal").textContent = value === 0 ? "Auto" : `${value} fps`;
    setRangeFill(event.target);
    document.getElementById("preset").value = "";
    renderUsage();
};
const resolutionScale = document.getElementById("resolutionScale");
function updateResolutionStatus() {
    const percent = Math.round((Number(anim.opts.resolutionScale) || 1) * 100);
    document.getElementById("resolutionScaleVal").textContent = `${percent}%`;
    document.getElementById("resolutionGridStatus").textContent = `${anim.cols}×${anim.rows} cells · ${percent}% logical resolution`;
}
resolutionScale.oninput = (event) => {
    anim.setOption("resolutionScale", Number(event.target.value));
    setRangeFill(event.target);
    updateResolutionStatus();
    document.getElementById("preset").value = "";
    renderUsage();
};
anim.on("resize", updateResolutionStatus);
function updateRendererControls(info = anim.getRendererInfo()) {
    document.getElementById("renderer").value = info.requested;
    document.getElementById("rendererStatus").textContent = info.backend === "webgl2"
        ? "WebGL2 GPU renderer active."
        : info.requested === "canvas2d"
          ? "Canvas 2D CPU renderer active."
          : "WebGL2 unavailable; Canvas 2D fallback active.";
    updateToolbarSummaries();
}
document.getElementById("renderer").onchange = (e) => {
    anim.setRenderer(e.target.value);
    renderUsage();
};
anim.on("rendererChange", (info) => updateRendererControls(info));
const customCharSet = document.getElementById("customCharSet");
const customCharSetGroup = document.getElementById("customCharSetGroup");
const customCharSetStatus = document.getElementById("customCharSetStatus");
function applyCharacterSet(cs) {
    anim.setOption("charSet", cs);
    anim.setOption("imageChars", cs);
    document.getElementById("preset").value = "";
    renderUsage();
}
document.getElementById("charSet").onchange = (e) => {
    const key = e.target.value;
    customCharSetGroup.hidden = key !== "custom";
    if (key === "custom") {
        customCharSet.focus();
        if ([...new Set(customCharSet.value)].length >= 2) applyCharacterSet(customCharSet.value);
        return;
    }
    applyCharacterSet(asciiam.CHARACTER_SETS[key]);
};
customCharSet.oninput = () => {
    const value = customCharSet.value;
    const distinct = [...new Set(value)].length;
    const valid = distinct >= 2;
    customCharSet.setAttribute("aria-invalid", String(!valid));
    customCharSetStatus.textContent = valid
        ? `${value.length} characters · ${distinct} distinct · applied live`
        : "At least two distinct characters are required.";
    if (valid) applyCharacterSet(value);
};

/* ── Range track fill helper ── */
function setRangeFill(input) {
    const min = parseFloat(input.min) || 0;
    const max = parseFloat(input.max) || 1;
    const val = parseFloat(input.value) || 0;
    const pct = ((val - min) / (max - min)) * 100;
    input.style.setProperty('--fill', pct.toFixed(1) + '%');
    // aria-valuetext for screen readers
    const label = input.getAttribute('data-aria-label') || input.id;
    input.setAttribute('aria-valuetext', `${label} ${input.value}`);
}
/* Initialise fills for all range sliders */
document.querySelectorAll('input[type="range"]').forEach(setRangeFill);
document.getElementById("speed").oninput = (e) => {
    anim.setOption("speed", parseFloat(e.target.value));
    document.getElementById("speedVal").textContent = e.target.value;
    setRangeFill(e.target);
    renderUsage();
};
document.getElementById("revealDirection").onchange = (e) => {
    anim.setOption("revealDirection", e.target.value);
    anim.start();
    renderUsage();
};
document.getElementById("edgeFade").oninput = (e) => {
    const val = parseFloat(e.target.value);
    anim.setOption("edgeFade", val);
    document.getElementById("edgeFadeVal").textContent = `${Math.round(val * 100)}%`;
    setRangeFill(e.target);
    renderUsage();
};
document.getElementById("trail").oninput = (e) => {
    const val = parseFloat(e.target.value);
    anim.setOption("trail", val);
    document.getElementById("trailVal").textContent = val.toFixed(2);
    setRangeFill(e.target);
    renderUsage();
};
const trailColorEl = document.getElementById("trailColor");
if (trailColorEl) {
    trailColorEl.oninput = (e) => {
        anim.setOption("trailColor", e.target.value);
        renderUsage();
    };
}
document.getElementById("pulse").oninput = (e) => {
    const amt = parseFloat(e.target.value);
    document.getElementById("pulseVal").textContent = amt.toFixed(2);
    anim.setOption("pulse", amt > 0 ? { amplitude: amt, speed: 0.8 } : null);
    setRangeFill(e.target);
    renderUsage();
};
document.getElementById("interactionRadius").oninput = (e) => {
    anim.setOption("interactionRadius", Number(e.target.value));
    document.getElementById("interactionRadiusVal").textContent = `${e.target.value}px`;
    setRangeFill(e.target);
    renderUsage();
};
document.getElementById("interactionDuration").oninput = (e) => {
    anim.setOption("interactionDuration", Number(e.target.value));
    document.getElementById("interactionDurationVal").textContent = `${Number(e.target.value).toFixed(2)}s`;
    setRangeFill(e.target);
    renderUsage();
};

/* ── Theme toggle logic ── */
function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("asciiam:theme", theme);
    const isLight = theme === "light";
    const sunIcon = document.getElementById("themeIconSun");
    const moonIcon = document.getElementById("themeIconMoon");
    if (sunIcon) sunIcon.style.display = isLight ? "inline-block" : "none";
    if (moonIcon) moonIcon.style.display = isLight ? "none" : "inline-block";

    const currentColor = String(anim.opts.color).toLocaleLowerCase("en");
    if (isLight && currentColor === "#4fa8ff") {
        anim.setOption("color", "#0066cc");
        document.getElementById("color").value = "#0066cc";
    } else if (!isLight && anim.opts.color === "#0066cc") {
        anim.setOption("color", "#4fa8ff");
        document.getElementById("color").value = "#4fa8ff";
    }
}
const savedTheme = localStorage.getItem("asciiam:theme") || (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
setTheme(savedTheme);
const themeBtn = document.getElementById("themeToggleBtn");
if (themeBtn) {
    themeBtn.onclick = () => {
        const current = document.documentElement.dataset.theme || "dark";
        setTheme(current === "dark" ? "light" : "dark");
        renderUsage();
    };
}

/* ── Dynamic Gradient Stop Color Swatches ── */
const defaultStopColors = ["#4FA8FF", "#C04FFF", "#FF4F8B", "#FF9D5C", "#4FFFF3", "#9D5CFF"];
function renderGradStops(count) {
    const container = document.getElementById("gradStopsContainer");
    if (!container) return;
    const currentInputs = [...container.querySelectorAll(".grad-stop-input")];
    const existingValues = currentInputs.map(input => input.value);
    container.replaceChildren();

    for (let i = 0; i < count; i++) {
        const colorVal = existingValues[i] || defaultStopColors[i % defaultStopColors.length];
        const input = document.createElement("input");
        input.type = "color";
        input.className = "grad-stop-input";
        input.id = `gradStop_${i}`;
        input.value = colorVal;
        input.setAttribute("aria-label", `Gradient stop color ${i + 1}`);
        input.oninput = syncColor;
        container.appendChild(input);
    }
}

function syncColor() {
    const mode = document.getElementById("colorMode").value;
    document.getElementById("colorSolidRow").style.display = mode === "solid" ? "flex" : "none";
    document.getElementById("colorGradRow").style.display = mode === "gradient" ? "flex" : "none";
    document.getElementById("gradOptionsRow").style.display = mode === "gradient" ? "flex" : "none";
    document.getElementById("gradAnimateRow").style.display = mode === "gradient" ? "flex" : "none";

    anim.setOption("gradient", null);
    anim.setOption("colorAnimation", null);

    if (mode === "gradient") {
        const stopInputs = [...document.querySelectorAll("#gradStopsContainer .grad-stop-input")];
        const stops = stopInputs.length ? stopInputs.map(input => input.value) : ["#4fa8ff", "#c04fff"];
        anim.setOption("gradient", {
            type: document.getElementById("gradType").value,
            angle: 45,
            steps: parseInt(document.getElementById("gradSteps").value, 10),
            stops: stops,
            animate: document.getElementById("gradAnimate").checked,
        });
    } else if (mode === "hueRotate") {
        anim.setOption("colorAnimation", { type: "hueRotate", speed: 40 });
    } else if (mode === "breathe") {
        anim.setOption("colorAnimation", { type: "breathe", speed: 0.6, colorA: "#4FA8FF", colorB: "#C04FFF" });
    }
    renderUsage();
}
document.getElementById("colorMode").onchange = syncColor;
document.getElementById("gradType").onchange = syncColor;
document.getElementById("flipGradientBtn").onclick = () => {
    const inputs = [...document.querySelectorAll("#gradStopsContainer .grad-stop-input")];
    const reversed = inputs.map((input) => input.value).reverse();
    inputs.forEach((input, index) => { input.value = reversed[index]; });
    syncColor();
};
document.getElementById("gradSteps").onchange = (e) => {
    const count = parseInt(e.target.value, 10) || 2;
    renderGradStops(count);
    syncColor();
};

/* ── Backdrop Layer Controls ── */
const defaultBackdropStopColors = ["#0A0C10", "#1A233A", "#173A63", "#4F2A68", "#164E63", "#3B1D28"];
function renderBackdropStops(count) {
    const container = document.getElementById("backdropStopsContainer");
    const existingValues = [...container.querySelectorAll(".backdrop-stop-input")].map((input) => input.value);
    container.replaceChildren();
    for (let index = 0; index < count; index++) {
        const input = document.createElement("input");
        input.type = "color";
        input.className = "backdrop-stop-input";
        input.id = `backdropStop_${index}`;
        input.value = existingValues[index] || defaultBackdropStopColors[index];
        input.setAttribute("aria-label", `Backdrop gradient stop ${index + 1}`);
        input.oninput = syncBackdrop;
        container.appendChild(input);
    }
}

function syncBackdrop() {
    const enabled = document.getElementById("backdropEnable").checked;
    const group = document.getElementById("backdropControlsGroup");
    if (group) group.style.display = enabled ? "block" : "none";

    if (!enabled) {
        anim.setOption("backdrop", null);
        renderUsage();
        return;
    }

    const opacity = Math.max(0, Math.min(1, Number(document.getElementById("backdropOpacity").value)));
    const color = document.getElementById("backdropColor").value || "#0a0c10";
    const placement = document.getElementById("backdropPlacement").value;
    const gradType = document.getElementById("backdropGradType").value;
    const colorsRow = document.getElementById("backdropGradColorsRow");
    if (colorsRow) colorsRow.style.display = gradType !== "none" ? "flex" : "none";

    let gradient = null;
    if (gradType !== "none") {
        const stops = [...document.querySelectorAll("#backdropStopsContainer .backdrop-stop-input")]
            .map((input) => input.value);
        gradient = {
            type: gradType,
            angle: Number(document.getElementById("backdropAngle").value),
            steps: Number(document.getElementById("backdropGradSteps").value),
            stops,
        };
    }

    anim.setOption("backdrop", {
        enabled: true,
        opacity: opacity,
        color: color,
        placement: placement,
        gradient: gradient
    });
    renderUsage();
}

document.getElementById("backdropEnable").onchange = (e) => {
    e.target.setAttribute("aria-checked", String(e.target.checked));
    syncBackdrop();
};
function applyBackdropOpacity(value) {
    const parsed = Number(value);
    const opacity = Number.isFinite(parsed) ? Math.max(0, Math.min(1, parsed)) : 0.5;
    const formatted = opacity.toFixed(2);
    const range = document.getElementById("backdropOpacity");
    const number = document.getElementById("backdropOpacityNumber");
    range.value = String(opacity);
    number.value = formatted;
    document.getElementById("backdropOpacityVal").textContent = formatted;
    setRangeFill(range);
    syncBackdrop();
}
document.getElementById("backdropOpacity").oninput = (e) => {
    applyBackdropOpacity(e.target.value);
};
document.getElementById("backdropOpacityNumber").oninput = (e) => {
    if (e.target.value !== "") applyBackdropOpacity(e.target.value);
};
document.getElementById("backdropOpacityNumber").onchange = (e) => applyBackdropOpacity(e.target.value);
document.getElementById("backdropColor").oninput = syncBackdrop;
document.getElementById("backdropPlacement").onchange = syncBackdrop;
document.getElementById("backdropGradType").onchange = syncBackdrop;
document.getElementById("backdropGradSteps").onchange = (event) => {
    renderBackdropStops(Number(event.target.value));
    syncBackdrop();
};
document.getElementById("backdropAngle").oninput = (event) => {
    document.getElementById("backdropAngleVal").textContent = `${event.target.value}°`;
    setRangeFill(event.target);
    syncBackdrop();
};
document.querySelectorAll(".backdrop-stop-input").forEach((input) => { input.oninput = syncBackdrop; });
document.getElementById("gradAnimate").onchange = syncColor;
document.getElementById("color").oninput = (e) => {
    anim.setOption("color", e.target.value);
    renderUsage();
};

document.getElementById("cursorToggle").onchange = (e) => {
    anim.setOption("cursor", { enabled: e.target.checked, radius: 160, strength: 0.7 });
    e.target.setAttribute('aria-checked', String(e.target.checked));
    renderUsage();
};

document.getElementById("statsToggle").onchange = (e) => {
    anim.setOption("showStats", e.target.checked);
    statsEl.style.display = e.target.checked ? "block" : "none";
    e.target.setAttribute('aria-checked', String(e.target.checked));
    renderUsage();
};
document.getElementById("extendedStatsToggle").onchange = (event) => {
    const enabled = event.target.checked;
    anim.setOption("extendedStats", enabled);
    event.target.setAttribute("aria-checked", String(enabled));
    statsEl.dataset.extended = String(enabled);
    if (enabled && !anim.opts.showStats) {
        anim.setOption("showStats", true);
        const statsToggle = document.getElementById("statsToggle");
        statsToggle.checked = true;
        statsToggle.setAttribute("aria-checked", "true");
        statsEl.style.display = "block";
    }
    renderUsage();
};

const colorFromImgEl = document.getElementById("colorFromImageToggle");
if (colorFromImgEl) {
    colorFromImgEl.onchange = (e) => {
        anim.setOption("colorFromImage", e.target.checked);
        e.target.setAttribute('aria-checked', String(e.target.checked));
    };
}

const imageStatus = document.getElementById("imageStatus");
const localImageSection = document.getElementById("localImageSection");
const localImages = document.getElementById("localImages");

function setImageStatus(message, isError = false) {
    imageStatus.textContent = message;
    imageStatus.dataset.error = String(isError);
}

function markSelectedImage(selectedButton) {
    document.querySelectorAll(".image-select[aria-pressed='true']").forEach((button) => button.setAttribute("aria-pressed", "false"));
    if (selectedButton) selectedButton.setAttribute("aria-pressed", "true");
}

async function useLibraryImage(image, button) {
    const cardButtons = [...button.closest(".image-card").querySelectorAll("button")];
    cardButtons.forEach((control) => { control.disabled = true; });
    setImageStatus(`Loading ${image.alt || image.name}…`);
    let capturedFrames = 0;
    const stopListening = anim.on("imageFramesReady", ({ frameCount }) => { capturedFrames = frameCount || 0; });
    try {
        anim.setOption("colorFromImage", true);
        if (colorFromImgEl) {
            colorFromImgEl.checked = true;
            colorFromImgEl.setAttribute('aria-checked', 'true');
        }
        anim.setOption("imageScale", 0.5);
        const scaleEl = document.getElementById("imageScale");
        if (scaleEl) {
            scaleEl.value = "0.5";
            document.getElementById("imageScaleVal").textContent = "0.50×";
            setRangeFill(scaleEl);
        }
        const source = image.image || image.src;
        const isGif = String(source || "").toLowerCase().endsWith(".gif");
        if (isGif) {
            anim.setOption("imageLuminance", "normal");
            const lumSelect = document.getElementById("imageLuminance");
            if (lumSelect) lumSelect.value = "normal";
        }
        anim.opts.imageChars = anim.opts.charSet;
        await anim.setImage(source);
        activeImageSource = source;
        document.getElementById("preset").value = "";
        markSelectedImage(button);
        renderUsage();
        setImageStatus(`${image.alt || image.name} selected.${capturedFrames ? ` ${capturedFrames} GIF frames captured.` : ""}`);
    } catch {
        setImageStatus("The image could not be loaded. Try another included file or upload.", true);
    } finally {
        stopListening();
        cardButtons.forEach((control) => { control.disabled = false; });
    }
}

function createImageCard(image) {
    const card = document.createElement("figure");
    card.className = "image-card";
    card.style.backgroundColor = image.color || "var(--panel)";

    const button = document.createElement("button");
    button.className = "image-select";
    button.type = "button";
    button.setAttribute("aria-pressed", "false");
    button.setAttribute("aria-label", `Use ${image.alt || image.name} as the background`);
    button.onclick = () => useLibraryImage(image, button);

    if (image.thumbnail) {
        const thumbnail = document.createElement("img");
        thumbnail.src = image.thumbnail;
        thumbnail.alt = "";
        thumbnail.width = 320;
        thumbnail.height = 180;
        thumbnail.loading = "lazy";
        thumbnail.decoding = "async";
        thumbnail.fetchPriority = "low";
        button.appendChild(thumbnail);
    } else {
        const placeholder = document.createElement("span");
        placeholder.className = "image-card__placeholder";
        placeholder.textContent = "Preview unavailable";
        button.appendChild(placeholder);
    }

    const caption = document.createElement("figcaption");
    caption.textContent = image.name;

    card.append(button, caption);
    return card;
}

function renderImageGrid(container, images) {
    const fragment = document.createDocumentFragment();
    images.forEach((image) => fragment.appendChild(createImageCard(image)));
    container.replaceChildren(fragment);
}

async function loadLocalImages() {
    try {
        const response = await fetch("./assets/backgrounds.json", { cache: "no-store" });
        if (!response.ok) throw new Error("manifest unavailable");
        const images = await response.json();
        if (Array.isArray(images) && images.length) {
            sequenceImageLibrary = images;
            renderImageGrid(localImages, images);
            renderSequenceEditor();
            localImageSection.hidden = false;
            const requestedURL = requestedImageSource ? new URL(requestedImageSource, location.href).href : null;
            const requestedIndex = requestedURL
                ? images.findIndex((image) => new URL(image.image || image.src, location.href).href === requestedURL)
                : -1;
            if (requestedIndex >= 0) {
                const selectedButton = localImages.querySelectorAll(".image-select")[requestedIndex];
                markSelectedImage(selectedButton);
                setImageStatus(`${images[requestedIndex].alt || images[requestedIndex].name} selected from documentation.`);
            } else {
                setImageStatus(`${images.length} included image${images.length === 1 ? "" : "s"} ready. Select one to apply it.`);
            }
        } else {
            setImageStatus("No included images are available. Upload an image to continue.");
        }
    } catch {
        setImageStatus("The included image library is unavailable. Upload an image to continue.", true);
    }
}

loadLocalImages();

const imageEnabledToggle = document.getElementById("imageEnabledToggle");
if (imageEnabledToggle) {
    imageEnabledToggle.onchange = () => {
        anim.setOption("imageEnabled", imageEnabledToggle.checked);
        renderUsage();
    };
}

const meshEnabledToggle = document.getElementById("meshEnabledToggle");
if (meshEnabledToggle) {
    meshEnabledToggle.onchange = () => {
        anim.setOption("meshEnabled", meshEnabledToggle.checked);
        renderUsage();
    };
}

const modelStatus = document.getElementById("modelStatus");
const meshPrimitive = document.getElementById("meshPrimitive");
const meshStyle = document.getElementById("meshStyle");
function setModelStatus(message, isError = false) {
    modelStatus.textContent = message;
    modelStatus.dataset.error = String(isError);
}
meshPrimitive.onchange = () => {
    const name = meshPrimitive.value;
    if (!name) {
        anim.opts.meshPrimitive = null;
        anim.clearModel();
        setModelStatus("No model loaded.");
    } else {
        anim.setOption("meshPrimitive", name);
        setModelStatus(`${name} primitive active.`);
    }
    renderUsage();
};
meshStyle.onchange = () => {
    anim.setOption("meshStyle", meshStyle.value);
    renderUsage();
};
document.getElementById("modelInput").onchange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".glb")) {
        setModelStatus("Local model upload requires a self-contained .glb file.", true);
        return;
    }
    meshPrimitive.value = "";
    anim.opts.meshPrimitive = null;
    setModelStatus(`Loading ${file.name}…`);
    try {
        await anim.setModel(file);
        setModelStatus(`${file.name} loaded · ${anim.getMeshInfo().vertexCount} vertices.`);
        renderUsage();
    } catch (error) {
        setModelStatus(error instanceof Error ? error.message : "The model could not be loaded.", true);
    }
};
const modelUrl = document.getElementById("modelUrl");
document.getElementById("loadModelUrlBtn").onclick = async () => {
    let url;
    try {
        url = new URL(modelUrl.value.trim(), document.baseURI);
    } catch {
        setModelStatus("Enter a valid glTF or GLB URL.", true);
        return;
    }
    if (!/\.(?:gltf|glb)$/i.test(url.pathname)) {
        setModelStatus("Remote model URLs must identify a .gltf or .glb file.", true);
        return;
    }
    meshPrimitive.value = "";
    anim.opts.meshPrimitive = null;
    setModelStatus(`Loading ${url.pathname.split("/").pop()}…`);
    try {
        await anim.setModel(url.href);
        setModelStatus(`${url.pathname.split("/").pop()} loaded · ${anim.getMeshInfo().vertexCount} vertices.`);
        renderUsage();
    } catch (error) {
        const detail = error instanceof Error ? error.message : "The remote model could not be loaded.";
        setModelStatus(`${detail} Check the model URL, sibling .bin paths, and CORS headers.`, true);
    }
};

const meshScaleControls = ["meshScaleX", "meshScaleY", "meshScaleZ"].map((id) => document.getElementById(id));
const meshRotationControls = ["meshRotationX", "meshRotationY", "meshRotationZ"].map((id) => document.getElementById(id));
function getMeshScale() {
    const scale = anim.opts.meshTransform?.scale;
    return [0, 1, 2].map((axis) => Number(scale?.[axis]) || 1);
}
function applyMeshScale(scale) {
    anim.setOption("meshTransform", { ...(anim.opts.meshTransform || {}), scale });
    scale.forEach((value, axis) => {
        meshScaleControls[axis].value = String(Math.abs(value));
        document.getElementById(`${meshScaleControls[axis].id}Val`).textContent = `${Math.abs(value).toFixed(2)}×`;
        document.getElementById(["meshFlipXBtn", "meshFlipYBtn", "meshFlipZBtn"][axis]).setAttribute("aria-pressed", String(value < 0));
        setRangeFill(meshScaleControls[axis]);
    });
    renderUsage();
}
function getMeshRotation() {
    const rotation = anim.opts.meshTransform?.rotation;
    return [0, 1, 2].map((axis) => Number(rotation?.[axis]) || 0);
}
function applyMeshRotation(rotation) {
    const fullTurn = Math.PI * 2;
    const normalized = rotation.map((radians) => ((radians + Math.PI) % fullTurn + fullTurn) % fullTurn - Math.PI);
    anim.setOption("meshTransform", { ...(anim.opts.meshTransform || {}), rotation: normalized });
    normalized.forEach((radians, axis) => {
        const degrees = Math.round(radians * 180 / Math.PI);
        meshRotationControls[axis].value = String(degrees);
        document.getElementById(`${meshRotationControls[axis].id}Val`).textContent = `${degrees}°`;
        setRangeFill(meshRotationControls[axis]);
    });
    renderUsage();
}
document.getElementById("meshScale").oninput = (event) => {
    const value = Number(event.target.value);
    document.getElementById("meshScaleVal").textContent = `${value.toFixed(2)}×`;
    setRangeFill(event.target);
    applyMeshScale(getMeshScale().map((current) => Math.sign(current) * value));
};
meshScaleControls.forEach((control, axis) => {
    control.oninput = () => {
        const scale = getMeshScale();
        scale[axis] = Math.sign(scale[axis]) * Number(control.value);
        applyMeshScale(scale);
    };
});
meshRotationControls.forEach((control, axis) => {
    control.oninput = () => {
        const rotation = getMeshRotation();
        rotation[axis] = Number(control.value) * Math.PI / 180;
        applyMeshRotation(rotation);
    };
});
document.getElementById("meshRotateLeftBtn").onclick = () => {
    const rotation = getMeshRotation();
    rotation[1] -= Math.PI / 2;
    applyMeshRotation(rotation);
};
document.getElementById("meshRotateRightBtn").onclick = () => {
    const rotation = getMeshRotation();
    rotation[1] += Math.PI / 2;
    applyMeshRotation(rotation);
};
document.getElementById("meshRotateUpBtn").onclick = () => {
    const rotation = getMeshRotation();
    rotation[0] -= Math.PI / 2;
    applyMeshRotation(rotation);
};
document.getElementById("meshRotateDownBtn").onclick = () => {
    const rotation = getMeshRotation();
    rotation[0] += Math.PI / 2;
    applyMeshRotation(rotation);
};
document.getElementById("meshRotateResetBtn").onclick = () => {
    applyMeshRotation([0, 0, 0]);
};
["meshFlipXBtn", "meshFlipYBtn", "meshFlipZBtn"].forEach((id, axis) => {
    const button = document.getElementById(id);
    button.onclick = () => {
        const scale = getMeshScale();
        scale[axis] *= -1;
        applyMeshScale(scale);
    };
});
document.getElementById("meshFov").oninput = (event) => {
    const degrees = Number(event.target.value);
    anim.setOption("meshCamera", { ...(anim.opts.meshCamera || {}), fov: degrees * Math.PI / 180 });
    document.getElementById("meshFovVal").textContent = `${degrees}°`;
    setRangeFill(event.target);
    renderUsage();
};
document.getElementById("meshAutoRotateToggle").onchange = (event) => {
    anim.setOption("meshAutoRotate", event.target.checked);
    event.target.setAttribute("aria-checked", String(event.target.checked));
    renderUsage();
};
["meshRotationSpeedX", "meshRotationSpeedY", "meshRotationSpeedZ"].forEach((id, axis) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.oninput = (event) => {
        const value = Number(event.target.value);
        const speed = [...(anim.opts.meshRotationSpeed || [0.2, 0.45, 0.1])];
        speed[axis] = value;
        anim.setOption("meshRotationSpeed", speed);
        document.getElementById(`${id}Val`).textContent = `${value.toFixed(2)} rad/s`;
        setRangeFill(event.target);
        renderUsage();
    };
});

document.getElementById("imageInput").onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    anim.setOption("colorFromImage", true);
    if (colorFromImgEl) {
        colorFromImgEl.checked = true;
        colorFromImgEl.setAttribute('aria-checked', 'true');
    }
    anim.opts.imageChars = anim.opts.charSet;
    setImageStatus(`Loading ${file.name}…`);
    let capturedFrames = 0;
    const stopListening = anim.on("imageFramesReady", ({ frameCount }) => { capturedFrames = frameCount || 0; });
    try {
        await anim.setImage(url, { animated: file.type === "image/gif" });
        activeImageSource = null;
        document.getElementById("preset").value = "";
        markSelectedImage(null);
        renderUsage();
        setImageStatus(`${file.name} selected.${capturedFrames ? ` ${capturedFrames} GIF frames captured.` : ""}`);
    } catch {
        setImageStatus("The uploaded image could not be loaded.", true);
    } finally {
        stopListening();
        URL.revokeObjectURL(url);
    }
};
const imageColorRangeToggle = document.getElementById("imageColorRangeToggle");
const imageColorRangeControls = document.getElementById("imageColorRangeControls");
const imageColorRangeMin = document.getElementById("imageColorRangeMin");
const imageColorRangeMax = document.getElementById("imageColorRangeMax");
function applyImageAnimationRange() {
    const enabled = imageColorRangeToggle.checked;
    imageColorRangeToggle.setAttribute("aria-checked", String(enabled));
    imageColorRangeControls.hidden = !enabled;
    anim.setOption("imageAnimationRange", enabled ? {
        min: imageColorRangeMin.value,
        max: imageColorRangeMax.value,
    } : null);
    renderUsage();
}
imageColorRangeToggle.onchange = applyImageAnimationRange;
imageColorRangeMin.onchange = applyImageAnimationRange;
imageColorRangeMax.onchange = applyImageAnimationRange;
const animateImageFramesToggle = document.getElementById("animateImageFramesToggle");
animateImageFramesToggle.onchange = (event) => {
    anim.setOption("animateImageFrames", event.target.checked);
    event.target.setAttribute("aria-checked", String(event.target.checked));
    renderUsage();
};
document.getElementById("imageFrameRate").oninput = (event) => {
    const value = Number(event.target.value);
    anim.setOption("imageFrameRate", value);
    document.getElementById("imageFrameRateVal").textContent = `${value} fps`;
    setRangeFill(event.target);
    renderUsage();
};
document.getElementById("imageScale").oninput = (e) => {
    const value = parseFloat(e.target.value);
    anim.setOption("imageScale", value);
    document.getElementById("imageScaleVal").textContent = value.toFixed(2) + "×";
    setRangeFill(e.target);
    renderUsage();
};
["imageScaleX", "imageScaleY"].forEach((id) => {
    document.getElementById(id).oninput = (event) => {
        const value = parseFloat(event.target.value);
        anim.setOption(id, value);
        document.getElementById(`${id}Val`).textContent = value.toFixed(2) + "×";
        setRangeFill(event.target);
        renderUsage();
    };
});
document.getElementById("imageFov").oninput = (e) => {
    const value = parseFloat(e.target.value);
    anim.setOption("imageFov", value);
    document.getElementById("imageFovVal").textContent = Math.round(value * 100) + "%";
    setRangeFill(e.target);
    renderUsage();
};
const imgBrightEl = document.getElementById("imageBrightness");
if (imgBrightEl) {
    imgBrightEl.oninput = (e) => {
        const val = parseFloat(e.target.value);
        anim.setOption("imageBrightness", val);
        document.getElementById("imageBrightnessVal").textContent = `${val.toFixed(2)}×`;
        setRangeFill(e.target);
        renderUsage();
    };
}
const imgContrastEl = document.getElementById("imageContrast");
if (imgContrastEl) {
    imgContrastEl.oninput = (e) => {
        const val = parseFloat(e.target.value);
        anim.setOption("imageContrast", val);
        document.getElementById("imageContrastVal").textContent = `${val.toFixed(2)}×`;
        setRangeFill(e.target);
        renderUsage();
    };
}
document.getElementById("imageLuminance").onchange = (event) => {
    anim.setOption("imageLuminance", event.target.value);
    renderUsage();
};
const imageRotation = document.getElementById("imageRotation");
function setImageRotation(value) {
    let degrees = Number(value) || 0;
    while (degrees > 180) degrees -= 360;
    while (degrees < -180) degrees += 360;
    imageRotation.value = String(degrees);
    anim.setOption("imageRotation", degrees);
    document.getElementById("imageRotationVal").textContent = `${degrees}°`;
    setRangeFill(imageRotation);
    renderUsage();
}
imageRotation.oninput = (event) => setImageRotation(event.target.value);
document.getElementById("imageRotateLeftBtn").onclick = () => setImageRotation(Number(imageRotation.value) - 90);
document.getElementById("imageRotateRightBtn").onclick = () => setImageRotation(Number(imageRotation.value) + 90);
["imageFlipXToggle", "imageFlipYToggle"].forEach((id) => {
    const control = document.getElementById(id);
    control.onchange = () => {
        const option = id === "imageFlipXToggle" ? "imageFlipX" : "imageFlipY";
        control.setAttribute("aria-checked", String(control.checked));
        anim.setOption(option, control.checked);
        renderUsage();
    };
});

// Reflect anim.opts back onto the panel controls after a preset swap, so the
// UI never shows stale values for options the preset just changed.
function syncControlsFromOpts() {
    setActiveModeButton(anim.opts.mode);
    setAlignment(anim.opts.align || "center");
    document.getElementById("quality").value = anim.opts.quality || "ultra";
    const rawSyncFps = anim.opts.targetFPS;
    const fpsVal = rawSyncFps === null || rawSyncFps === undefined || rawSyncFps === 0 || rawSyncFps === "0" ? 0 : Math.min(540, Math.max(0, Number(rawSyncFps) || 0));
    targetFPS.value = String(fpsVal);
    document.getElementById("targetFPSVal").textContent = fpsVal === 0 ? "Auto" : `${fpsVal} fps`;
    resolutionScale.value = String(anim.opts.resolutionScale || 1);
    updateResolutionStatus();
    document.getElementById("renderer").value = anim.opts.renderer || "auto";
    meshPrimitive.value = anim.opts.meshPrimitive || "";
    meshStyle.value = anim.opts.meshStyle || "wireframe";
    const meshScale = getMeshScale();
    meshScale.forEach((value, axis) => {
        meshScaleControls[axis].value = String(Math.abs(value));
        document.getElementById(`${meshScaleControls[axis].id}Val`).textContent = `${Math.abs(value).toFixed(2)}×`;
        document.getElementById(["meshFlipXBtn", "meshFlipYBtn", "meshFlipZBtn"][axis]).setAttribute("aria-pressed", String(value < 0));
    });
    const uniformScale = meshScale.every((value) => value === meshScale[0]) ? meshScale[0] : 1;
    document.getElementById("meshScale").value = String(uniformScale);
    document.getElementById("meshScaleVal").textContent = meshScale.every((value) => value === meshScale[0])
        ? `${uniformScale.toFixed(2)}×`
        : "mixed";
    const meshFovDegrees = Math.round((anim.opts.meshCamera?.fov || Math.PI / 3) * 180 / Math.PI);
    document.getElementById("meshFov").value = String(meshFovDegrees);
    document.getElementById("meshFovVal").textContent = `${meshFovDegrees}°`;
    getMeshRotation().forEach((radians, axis) => {
        const degrees = Math.round(radians * 180 / Math.PI);
        meshRotationControls[axis].value = String(degrees);
        document.getElementById(`${meshRotationControls[axis].id}Val`).textContent = `${degrees}°`;
    });
    const meshAutoRotate = document.getElementById("meshAutoRotateToggle");
    meshAutoRotate.checked = anim.opts.meshAutoRotate !== false;
    meshAutoRotate.setAttribute("aria-checked", String(meshAutoRotate.checked));
    const speed = anim.opts.meshRotationSpeed || [0.2, 0.45, 0.1];
    ["meshRotationSpeedX", "meshRotationSpeedY", "meshRotationSpeedZ"].forEach((id, axis) => {
        const val = Number(speed[axis] ?? 0);
        const el = document.getElementById(id);
        if (el) {
            el.value = String(val);
            const valEl = document.getElementById(`${id}Val`);
            if (valEl) valEl.textContent = `${val.toFixed(2)} rad/s`;
        }
    });
    const rendererInfo = anim.getRendererInfo();
    document.getElementById("rendererStatus").textContent = rendererInfo.backend === "webgl2"
        ? "WebGL2 GPU renderer active."
        : rendererInfo.requested === "canvas2d"
          ? "Canvas 2D CPU renderer active."
          : "WebGL2 unavailable; Canvas 2D fallback active.";
    const charSetEntry = Object.entries(asciiam.CHARACTER_SETS).find(([, value]) => value === anim.opts.charSet);
    const charSetSelect = document.getElementById("charSet");
    charSetSelect.value = charSetEntry ? charSetEntry[0] : "custom";
    customCharSetGroup.hidden = !!charSetEntry;
    if (!charSetEntry) customCharSet.value = anim.opts.charSet;
    document.getElementById("speed").value = anim.opts.speed;
    document.getElementById("speedVal").textContent = anim.opts.speed.toFixed(1);
    document.getElementById("revealDirection").value = anim.opts.revealDirection || "center";
    document.getElementById("edgeFade").value = anim.opts.edgeFade;
    document.getElementById("edgeFadeVal").textContent = anim.opts.edgeFade.toFixed(2);
    document.getElementById("trail").value = anim.opts.trail;
    document.getElementById("trailVal").textContent = anim.opts.trail.toFixed(2);
    document.getElementById("pulse").value = anim.opts.pulse ? anim.opts.pulse.amplitude : 0;
    document.getElementById("pulseVal").textContent = (anim.opts.pulse ? anim.opts.pulse.amplitude : 0).toFixed(2);
    document.getElementById("interactionRadius").value = String(anim.opts.interactionRadius || 180);
    document.getElementById("interactionRadiusVal").textContent = `${anim.opts.interactionRadius || 180}px`;
    document.getElementById("interactionDuration").value = String(anim.opts.interactionDuration || 1.1);
    document.getElementById("interactionDurationVal").textContent = `${Number(anim.opts.interactionDuration || 1.1).toFixed(2)}s`;
    // Sync range fills after value update
    ['targetFPS','resolutionScale','speed','edgeFade','trail','pulse','interactionRadius','interactionDuration','imageScale','imageScaleX','imageScaleY','imageFov','imageRotation','meshScale','meshScaleX','meshScaleY','meshScaleZ','meshRotationX','meshRotationY','meshRotationZ','meshFov','meshRotationSpeedX','meshRotationSpeedY','meshRotationSpeedZ','backdropOpacity','backdropAngle'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) setRangeFill(el);
    });
    document.getElementById("color").value = anim.opts.color;
    const cursorEl = document.getElementById("cursorToggle");
    cursorEl.checked = !!(anim.opts.cursor && anim.opts.cursor.enabled);
    cursorEl.setAttribute('aria-checked', String(cursorEl.checked));
    const statsToggle = document.getElementById("statsToggle");
    statsToggle.checked = !!anim.opts.showStats;
    statsToggle.setAttribute("aria-checked", String(statsToggle.checked));
    statsEl.style.display = statsToggle.checked ? "block" : "none";
    const extendedStatsToggle = document.getElementById("extendedStatsToggle");
    extendedStatsToggle.checked = !!anim.opts.extendedStats;
    extendedStatsToggle.setAttribute("aria-checked", String(extendedStatsToggle.checked));
    statsEl.dataset.extended = String(extendedStatsToggle.checked);
    const backdropToggle = document.getElementById("backdropEnable");
    const backdrop = anim.opts.backdrop && anim.opts.backdrop.enabled ? anim.opts.backdrop : null;
    backdropToggle.checked = !!backdrop;
    backdropToggle.setAttribute("aria-checked", String(backdropToggle.checked));
    document.getElementById("backdropControlsGroup").style.display = backdrop ? "block" : "none";
    document.getElementById("backdropPlacement").value = backdrop?.placement || "behind";
    const backdropGradient = backdrop?.gradient || null;
    const backdropStops = backdropGradient?.stops || defaultBackdropStopColors.slice(0, 2);
    const backdropStepCount = Math.min(6, Math.max(1, backdropGradient?.steps || backdropStops.length || 2));
    document.getElementById("backdropGradType").value = backdropGradient?.type || "none";
    document.getElementById("backdropGradSteps").value = String(backdropStepCount);
    document.getElementById("backdropAngle").value = String(backdropGradient?.angle ?? 45);
    document.getElementById("backdropAngleVal").textContent = `${backdropGradient?.angle ?? 45}°`;
    document.getElementById("backdropGradColorsRow").style.display = backdropGradient ? "flex" : "none";
    renderBackdropStops(backdropStepCount);
    backdropStops.slice(0, backdropStepCount).forEach((stop, index) => {
        const input = document.getElementById(`backdropStop_${index}`);
        if (input && typeof stop === "string") input.value = stop;
    });
    const backdropOpacity = Math.max(0, Math.min(1, Number(backdrop?.opacity ?? 0.5)));
    document.getElementById("backdropOpacity").value = String(backdropOpacity);
    document.getElementById("backdropOpacityNumber").value = backdropOpacity.toFixed(2);
    document.getElementById("backdropOpacityVal").textContent = backdropOpacity.toFixed(2);
    setRangeFill(document.getElementById("backdropOpacity"));
    if (backdrop) {
        document.getElementById("backdropColor").value = backdrop.color || "#0a0c10";
    }
    if (colorFromImgEl) {
        colorFromImgEl.checked = !!anim.opts.colorFromImage;
        colorFromImgEl.setAttribute('aria-checked', String(colorFromImgEl.checked));
    }
    const imageRange = anim.opts.imageAnimationRange;
    imageColorRangeToggle.checked = !!imageRange;
    imageColorRangeToggle.setAttribute("aria-checked", String(!!imageRange));
    imageColorRangeControls.hidden = !imageRange;
    imageColorRangeMin.value = imageRange?.min || "#000000";
    imageColorRangeMax.value = imageRange?.max || "#ffffff";
    document.getElementById("colorMode").value = anim.opts.colorAnimation
        ? anim.opts.colorAnimation.type
        : anim.opts.gradient
          ? "gradient"
          : "solid";
    document.getElementById("colorSolidRow").style.display = document.getElementById("colorMode").value === "solid" ? "flex" : "none";
    document.getElementById("colorGradRow").style.display = document.getElementById("colorMode").value === "gradient" ? "flex" : "none";
    document.getElementById("gradOptionsRow").style.display = document.getElementById("colorMode").value === "gradient" ? "flex" : "none";
    if (anim.opts.gradient) {
        const steps = anim.opts.gradient.steps || 2;
        document.getElementById("gradType").value = anim.opts.gradient.type || "linear";
        document.getElementById("gradSteps").value = steps;
        renderGradStops(steps);
        const stops = anim.opts.gradient.stops || [];
        stops.forEach((c, idx) => {
            const el = document.getElementById(`gradStop_${idx}`);
            if (el && typeof c === "string") el.value = c;
        });
    }
    document.getElementById("imageScale").value = anim.opts.imageScale;
    document.getElementById("imageScaleVal").textContent = anim.opts.imageScale.toFixed(2) + "×";
    document.getElementById("imageScaleX").value = anim.opts.imageScaleX || 1;
    document.getElementById("imageScaleXVal").textContent = (anim.opts.imageScaleX || 1).toFixed(2) + "×";
    document.getElementById("imageScaleY").value = anim.opts.imageScaleY || 1;
    document.getElementById("imageScaleYVal").textContent = (anim.opts.imageScaleY || 1).toFixed(2) + "×";
    document.getElementById("animateImageFramesToggle").checked = anim.opts.animateImageFrames !== false;
    document.getElementById("animateImageFramesToggle").setAttribute("aria-checked", String(anim.opts.animateImageFrames !== false));
    document.getElementById("imageFrameRate").value = anim.opts.imageFrameRate || 12;
    document.getElementById("imageFrameRateVal").textContent = `${anim.opts.imageFrameRate || 12} fps`;
    document.getElementById("imageFov").value = anim.opts.imageFov;
    document.getElementById("imageFovVal").textContent = Math.round(anim.opts.imageFov * 100) + "%";
    document.getElementById("imageLuminance").value = anim.opts.imageLuminance || "auto";
    imageRotation.value = String(anim.opts.imageRotation || 0);
    document.getElementById("imageRotationVal").textContent = `${anim.opts.imageRotation || 0}°`;
    ["imageFlipXToggle", "imageFlipYToggle"].forEach((id) => {
        const control = document.getElementById(id);
        const option = id === "imageFlipXToggle" ? "imageFlipX" : "imageFlipY";
        control.checked = !!anim.opts[option];
        control.setAttribute("aria-checked", String(control.checked));
    });
    if (imageEnabledToggle) {
        imageEnabledToggle.checked = anim.opts.imageEnabled !== false;
        imageEnabledToggle.setAttribute("aria-checked", String(imageEnabledToggle.checked));
    }
    if (meshEnabledToggle) {
        meshEnabledToggle.checked = anim.opts.meshEnabled !== false;
        meshEnabledToggle.setAttribute("aria-checked", String(meshEnabledToggle.checked));
    }
    if (chartEnabledToggle) {
        chartEnabledToggle.checked = !!anim.opts.chartEnabled;
        chartEnabledToggle.setAttribute("aria-checked", String(chartEnabledToggle.checked));
    }
    if (chartTypeEl) chartTypeEl.value = anim.opts.chartType || "bar";
    if (chartTitleEl) chartTitleEl.value = anim.opts.chartTitle || "";
    if (chartDataEl && anim.opts.chartData) {
        if (Array.isArray(anim.opts.chartData)) {
            if (typeof anim.opts.chartData[0] === "object" && anim.opts.chartData[0] !== null) {
                chartDataEl.value = anim.opts.chartData.map((d) => d.value ?? d.val ?? 0).join(", ");
                if (chartLabelsEl) chartLabelsEl.value = anim.opts.chartData.map((d) => d.label ?? "").join(", ");
            } else {
                chartDataEl.value = anim.opts.chartData.join(", ");
            }
        }
    }
    if (chartShowAxesToggle) {
        chartShowAxesToggle.checked = anim.opts.chartShowAxes !== false;
        chartShowAxesToggle.setAttribute("aria-checked", String(chartShowAxesToggle.checked));
    }
    if (chartShowLegendToggle) {
        chartShowLegendToggle.checked = anim.opts.chartShowLegend !== false;
        chartShowLegendToggle.setAttribute("aria-checked", String(chartShowLegendToggle.checked));
    }
    if (chartAnimateItemsToggle) {
        chartAnimateItemsToggle.checked = !!anim.opts.chartAnimateItems;
        chartAnimateItemsToggle.setAttribute("aria-checked", String(chartAnimateItemsToggle.checked));
    }
    if (chartScaleMinEl) chartScaleMinEl.value = anim.opts.chartScaleMin ?? "";
    if (chartScaleMaxEl) chartScaleMaxEl.value = anim.opts.chartScaleMax ?? "";
    if (chartColorsEl) chartColorsEl.value = Array.isArray(anim.opts.chartColors) ? anim.opts.chartColors.join(" ") : "";
    syncSequenceEditorFromOpts();
}
function usageSource() {
    const colorMode = document.getElementById("colorMode").value;
    const options = {
        mode: anim.opts.mode,
        quality: document.getElementById("quality").value,
        targetFPS: Number(targetFPS.value),
        resolutionScale: anim.opts.resolutionScale,
        renderer: document.getElementById("renderer").value,
        charSet: anim.opts.charSet,
        align: anim.opts.align,
        color: anim.opts.color,
        speed: anim.opts.speed,
        edgeFade: anim.opts.edgeFade,
        trail: anim.opts.trail,
        showStats: anim.opts.showStats,
        extendedStats: anim.opts.extendedStats,
        pulse: anim.opts.pulse,
        cursor: anim.opts.cursor,
    };
    if (anim.opts.meshPrimitive || typeof anim.opts.model === "string") {
        if (anim.opts.meshPrimitive) options.meshPrimitive = anim.opts.meshPrimitive;
        else if (typeof anim.opts.model === "string") options.model = anim.opts.model;
        options.meshStyle = anim.opts.meshStyle;
        options.meshProjection = anim.opts.meshProjection;
        options.meshAutoRotate = anim.opts.meshAutoRotate;
        options.meshRotationSpeed = anim.opts.meshRotationSpeed;
        if (anim.opts.meshTransform) options.meshTransform = anim.opts.meshTransform;
        if (anim.opts.meshCamera) options.meshCamera = anim.opts.meshCamera;
    }
    if (["hoverZone", "clickZone"].includes(anim.opts.mode)) {
        options.interactionRadius = anim.opts.interactionRadius;
        options.interactionDuration = anim.opts.interactionDuration;
    }
    if (["fadeIn", "fadeOut", "dissolveIn", "dissolveOut"].includes(anim.opts.mode)) {
        options.revealDirection = anim.opts.revealDirection || "center";
    }
    if (activeImageSource || anim._sourceImage || anim.opts.imageAnimationRange) {
        options.image = activeImageSource || "./your-image.png";
        options.imageScale = anim.opts.imageScale;
        options.imageScaleX = anim.opts.imageScaleX;
        options.imageScaleY = anim.opts.imageScaleY;
        options.imageFov = anim.opts.imageFov;
        options.imageRotation = anim.opts.imageRotation;
        options.imageFlipX = anim.opts.imageFlipX;
        options.imageFlipY = anim.opts.imageFlipY;
        options.imageLuminance = anim.opts.imageLuminance;
        options.animateImageFrames = anim.opts.animateImageFrames;
        options.imageFrameRate = anim.opts.imageFrameRate;
        options.fit = anim.opts.fit;
        options.colorFromImage = anim.opts.colorFromImage;
        options.imageChars = anim.opts.imageChars;
        options.animateImageMask = anim.opts.animateImageMask;
        if (anim.opts.imageAnimationRange) options.imageAnimationRange = anim.opts.imageAnimationRange;
    }
    if (anim.opts.chartEnabled && anim.opts.chartData) {
        options.chartEnabled = true;
        if (anim.opts.chartType) options.chartType = anim.opts.chartType;
        if (anim.opts.chartTitle) options.chartTitle = anim.opts.chartTitle;
        if (anim.opts.chartData) options.chartData = anim.opts.chartData;
        if (anim.opts.chartShowAxes !== undefined) options.chartShowAxes = anim.opts.chartShowAxes;
        if (anim.opts.chartShowLegend === false) options.chartShowLegend = false;
        if (Array.isArray(anim.opts.chartColors)) options.chartColors = anim.opts.chartColors;
        if (anim.opts.chartScaleMin != null) options.chartScaleMin = anim.opts.chartScaleMin;
        if (anim.opts.chartScaleMax != null) options.chartScaleMax = anim.opts.chartScaleMax;
        if (anim.opts.chartAnimateItems) options.chartAnimateItems = true;
    }
    if (anim.opts.sweepDuration) options.sweepDuration = anim.opts.sweepDuration;
    if (anim.opts.delayCurve) options.delayCurve = anim.opts.delayCurve;
    if (Array.isArray(anim.opts.layers) && anim.opts.layers.length) options.layers = anim.opts.layers;
    if (colorMode === "gradient" && anim.opts.gradient) options.gradient = anim.opts.gradient;
    if (colorMode === "hueRotate" || colorMode === "breathe") options.colorAnimation = anim.opts.colorAnimation;
    if (anim.opts.backdrop && anim.opts.backdrop.enabled) options.backdrop = anim.opts.backdrop;
    let source = `const anim = new asciiam("#hero", ${JSON.stringify(options, null, 2)});`;
    if ((anim._sourceImage || anim.opts.imageAnimationRange) && !activeImageSource) source += `\n// Replace ./your-image.png with your image URL or path.`;
    if (sequenceDraft.length) {
        source += `\n\nanim.setSequence(${JSON.stringify(serializableSequence(), null, 2)}, { loop: ${sequenceLoop} });`;
        source += `\nanim.on("sequenceStepStart", ({ index, step }) => {`;
        source += `\n  console.log("started", index, step.mode);`;
        source += `\n});`;
        source += `\nanim.on("sequenceStepComplete", ({ index, step }) => {`;
        source += `\n  console.log("completed", index, step.mode);`;
        source += `\n});`;
        source += "\nanim.playSequence();";
    } else {
        source += "\nanim.start();";
    }
    return source;
}
function getPersistableOptions() {
    const keys = [
        "mode", "quality", "targetFPS", "resolutionScale", "renderer", "charSet", "align", "color", "gradient", "backdrop",
        "speed", "edgeFade", "trail", "pulse", "cursor", "showStats", "extendedStats", "colorAnimation",
        "interactionRadius", "interactionDuration", "sweepDuration", "delayCurve",
        "imageEnabled", "imageScale", "imageScaleX", "imageScaleY", "imageFov", "imageRotation", "imageFlipX", "imageFlipY", "imageLuminance", "fit", "colorFromImage", "animateImageMask", "animateImageFrames", "imageFrameRate", "imageAnimationRange", "revealDirection",
        "fireDensity", "starfieldDensity", "orbitDensity", "glitchIntensity", "typewriterDuration",
        "meshEnabled", "meshPrimitive", "meshStyle", "meshProjection", "meshCamera", "meshTransform", "meshAutoRotate", "meshRotationSpeed",
        "chartEnabled", "chartData", "chartType", "chartTitle", "chartShowValues", "chartShowAxes", "chartShowLegend", "chartColors", "chartScaleMin", "chartScaleMax", "chartAnimateItems", "layers",
        "sequence", "sequenceOptions",
    ];
    const options = {};
    keys.forEach((key) => {
        if (anim.opts[key] !== undefined) options[key] = anim.opts[key];
    });
    if (activeImageSource) options.image = activeImageSource;
    options.quality = document.getElementById("quality").value;
    return JSON.parse(JSON.stringify(options));
}
function snapshotKey(options) {
    return JSON.stringify(options);
}
function updatePresetDirtyState() {
    const current = getPersistableOptions();
    const dirty = !activePresetSnapshot || snapshotKey(current) !== snapshotKey(activePresetSnapshot);
    const status = dirty ? (activePresetSnapshot ? "Modified" : "Custom") : activePresetLabel;
    const trigger = document.getElementById("presetTriggerBtn");
    document.getElementById("presetDirtyIndicator").textContent = status;
    trigger.dataset.dirty = String(dirty);
    trigger.setAttribute("aria-label", `Preset, ${status}`);
}
function setToolbarSummary(triggerId, statusId, label, value) {
    const trigger = document.getElementById(triggerId);
    const status = document.getElementById(statusId);
    if (!trigger || !status) return;
    status.textContent = value;
    trigger.setAttribute("aria-label", `${label}, ${value}`);
}
function updateToolbarSummaries() {
    const mode = anim.opts.mode;
    const charset = document.getElementById("charSet").value;
    const colorMode = document.getElementById("colorMode").value;
    const backdrop = anim.opts.backdrop?.enabled ? anim.opts.backdrop : null;
    const directionLabels = {
        "left-to-right": "L→R",
        "right-to-left": "R→L",
        "top-to-bottom": "T→B",
        "bottom-to-top": "B→T",
        diagonal: "Diagonal",
        center: "Center",
        edges: "Edges",
    };
    const motion = ["fadeIn", "fadeOut", "dissolveIn", "dissolveOut"].includes(mode)
        ? directionLabels[anim.opts.revealDirection] || "Center"
        : `${Number(anim.opts.speed).toFixed(1)}×`;
    const backdropLabel = backdrop
        ? backdrop.gradient?.type || "solid"
        : "off";

    const rendererBackend = anim.getRendererInfo().backend === "webgl2" ? "GPU" : "CPU";
    setToolbarSummary("qualityTriggerBtn", "qualityToolbarStatus", "Quality", `${document.getElementById("quality").value} · ${rendererBackend}`);
    const sequenceState = anim.getSequenceState();
    const sequenceLabel = sequenceDraft.length
        ? sequenceState.running ? `${sequenceState.index + 1}/${sequenceDraft.length}` : `${sequenceDraft.length} steps`
        : "off";
    setToolbarSummary("sequenceTriggerBtn", "sequenceToolbarStatus", "Sequence", sequenceLabel);
    setToolbarSummary("modeTriggerBtn", "modeToolbarStatus", "Mode", mode);
    setToolbarSummary("charsetTriggerBtn", "charsetToolbarStatus", "Character set", charset === "asciiExtended" ? "extended" : charset);
    setToolbarSummary("motionTriggerBtn", "motionToolbarStatus", "Motion", motion);
    setToolbarSummary("alignTriggerBtn", "alignToolbarStatus", "Alignment", anim.opts.align || "center");
    setToolbarSummary("colorTriggerBtn", "colorToolbarStatus", "Color", colorMode);
    const imageLabel = anim._sourceImage
        ? anim.opts.imageEnabled !== false ? "active" : "off"
        : "none";
    setToolbarSummary("imageTriggerBtn", "imageToolbarStatus", "Image", imageLabel);
    const meshInfo = anim.getMeshInfo();
    const meshLabel = meshInfo.loaded
        ? anim.opts.meshEnabled !== false ? (anim.opts.meshPrimitive || (anim.opts.model ? "model" : `${meshInfo.primitiveCount} primitives`)) : "off"
        : "none";
    setToolbarSummary("meshTriggerBtn", "meshToolbarStatus", "3D", meshLabel);
    const chartInfo = anim.getChartInfo();
    const chartLabel = chartInfo.dataLength > 0
        ? anim.opts.chartEnabled ? (anim.opts.chartType || "bar") : "off"
        : "none";
    setToolbarSummary("chartTriggerBtn", "chartToolbarStatus", "Chart", chartLabel);
}
function syncHistoryButtons() {
    document.getElementById("undoSettingsBtn").disabled = historyIndex <= 0 && historyTimer === null;
    document.getElementById("redoSettingsBtn").disabled = historyTimer !== null || historyIndex >= optionHistory.length - 1;
    ensureToolbarTabStop();
}
function flushHistory() {
    if (!historyReady || applyingHistory) return;
    if (historyTimer !== null) {
        clearTimeout(historyTimer);
        historyTimer = null;
    }
    const snapshot = getPersistableOptions();
    if (historyIndex >= 0 && snapshotKey(optionHistory[historyIndex]) === snapshotKey(snapshot)) {
        syncHistoryButtons();
        return;
    }
    optionHistory = optionHistory.slice(0, historyIndex + 1);
    optionHistory.push(snapshot);
    if (optionHistory.length > 50) optionHistory.shift();
    historyIndex = optionHistory.length - 1;
    syncHistoryButtons();
}
function queueHistory() {
    if (!historyReady || applyingHistory) return;
    if (historyIndex >= 0 && snapshotKey(optionHistory[historyIndex]) === snapshotKey(getPersistableOptions())) {
        syncHistoryButtons();
        return;
    }
    if (historyTimer !== null) clearTimeout(historyTimer);
    historyTimer = setTimeout(flushHistory, 180);
    syncHistoryButtons();
}
function applyHistory(direction) {
    flushHistory();
    const nextIndex = historyIndex + direction;
    if (nextIndex < 0 || nextIndex >= optionHistory.length) return;
    historyIndex = nextIndex;
    const targetSnapshot = optionHistory[historyIndex];
    applyingHistory = true;
    try {
        applyDemoOptions(targetSnapshot);
    } finally {
        applyingHistory = false;
    }
    activePresetLabel = "Custom";
    activePresetSnapshot = null;
    document.getElementById("preset").value = "";
    updatePresetDirtyState();
    syncHistoryButtons();
}
document.getElementById("undoSettingsBtn").onclick = (event) => {
    event.preventDefault();
    applyHistory(-1);
};
document.getElementById("redoSettingsBtn").onclick = (event) => {
    event.preventDefault();
    applyHistory(1);
};
document.addEventListener("keydown", (event) => {
    const target = event.target;
    if (!(event.ctrlKey || event.metaKey) || event.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable) return;
    const key = event.key.toLocaleLowerCase("en");
    if (key === "a") {
        event.preventDefault();
        const about = document.getElementById("pop-about");
        const aboutTrigger = document.getElementById("aboutTriggerBtn");
        if (aboutTrigger.getAttribute("aria-expanded") === "true") about.hidePopover();
        else about.showPopover();
        return;
    }
    if (key !== "z") return;
    event.preventDefault();
    applyHistory(event.shiftKey ? 1 : -1);
});
function persistSettings() {
    if (!settingsReady) return;
    try {
        localStorage.setItem(settingsStorageKey, JSON.stringify({ options: getPersistableOptions() }));
    } catch {
        // Persistence is optional when storage is unavailable or full.
    }
}

function readSavedPresets() {
    try {
        const parsed = JSON.parse(localStorage.getItem(savedPresetsStorageKey));
        return parsed && typeof parsed === "object" && !Array.isArray(parsed)
            ? Object.assign(Object.create(null), parsed)
            : Object.create(null);
    } catch {
        return Object.create(null);
    }
}
function writeSavedPresets(presets) {
    localStorage.setItem(savedPresetsStorageKey, JSON.stringify(presets));
}
function renderSavedPresetList(selectedName = "") {
    const select = document.getElementById("savedPresetList");
    const names = Object.keys(readSavedPresets()).sort((a, b) => a.localeCompare(b));
    select.replaceChildren();
    const placeholder = new Option(names.length ? "— select saved preset —" : "No saved presets", "");
    select.appendChild(placeholder);
    names.forEach((name) => select.appendChild(new Option(name, name)));
    select.value = names.includes(selectedName) ? selectedName : "";
    document.getElementById("deletePresetBtn").disabled = !select.value;
}
function setSavedPresetStatus(message, isError = false) {
    const status = document.getElementById("savedPresetStatus");
    status.textContent = message;
    status.dataset.error = String(isError);
}

document.getElementById("savePresetBtn").onclick = () => {
    const input = document.getElementById("savedPresetName");
    const name = input.value.trim();
    if (!name) {
        setSavedPresetStatus("Enter a name before saving.", true);
        input.focus();
        return;
    }
    try {
        const presets = readSavedPresets();
        const replaced = Object.hasOwn(presets, name);
        presets[name] = getPersistableOptions();
        writeSavedPresets(presets);
        renderSavedPresetList(name);
        activePresetLabel = name;
        activePresetSnapshot = getPersistableOptions();
        updatePresetDirtyState();
        setSavedPresetStatus(`${replaced ? "Updated" : "Saved"} “${name}” in this browser.`);
    } catch {
        setSavedPresetStatus("This browser could not save the preset.", true);
    }
};
document.getElementById("savedPresetName").addEventListener("keydown", (event) => {
    if (event.key === "Enter") document.getElementById("savePresetBtn").click();
});
document.getElementById("savedPresetList").onchange = (event) => {
    const name = event.target.value;
    document.getElementById("deletePresetBtn").disabled = !name;
    if (!name) return;
    const options = readSavedPresets()[name];
    if (!options) return;
    document.getElementById("savedPresetName").value = name;
    applyDemoOptions(options, "", name);
    event.target.value = name;
    document.getElementById("deletePresetBtn").disabled = false;
    setSavedPresetStatus(`Loaded “${name}”.`);
};
document.getElementById("deletePresetBtn").onclick = () => {
    const select = document.getElementById("savedPresetList");
    const name = select.value;
    if (!name) return;
    try {
        const presets = readSavedPresets();
        delete presets[name];
        writeSavedPresets(presets);
        renderSavedPresetList();
        document.getElementById("savedPresetName").value = "";
        if (activePresetLabel === name) {
            activePresetLabel = "Custom";
            activePresetSnapshot = null;
            updatePresetDirtyState();
        }
        setSavedPresetStatus(`Deleted “${name}”.`);
    } catch {
        setSavedPresetStatus("This browser could not delete the preset.", true);
    }
};
document.getElementById("resetSettingsBtn").onclick = () => {
    try { localStorage.removeItem(settingsStorageKey); } catch {}
    applyDemoOptions(demoDefaults, "heroWave");
    document.getElementById("savedPresetList").value = "";
    document.getElementById("deletePresetBtn").disabled = true;
    setSavedPresetStatus("Demo settings reset. Saved presets were kept.");
};
let activeCodeTab = "js";
document.querySelectorAll("[data-code-tab]").forEach((btn) => {
    btn.onclick = (e) => {
        activeCodeTab = e.currentTarget.dataset.codeTab || "js";
        document.querySelectorAll("[data-code-tab]").forEach((b) => {
            const isMatch = b.dataset.codeTab === activeCodeTab;
            b.classList.toggle("active", isMatch);
            b.setAttribute("aria-selected", String(isMatch));
        });
        renderUsage();
    };
});

function renderUsage() {
    const code = activeCodeTab === "json" ? JSON.stringify(getPersistableOptions(), null, 2) : usageSource();
    const html = highlightJavaScript(code);
    const mainEl = document.getElementById("usageCode");
    if (mainEl) mainEl.innerHTML = html;
    const popEl = document.getElementById("usageCodePopover");
    if (popEl) popEl.innerHTML = html;
    persistSettings();
    updatePresetDirtyState();
    updateToolbarSummaries();
    queueHistory();
}
async function handleCopy(button, targetId) {
    const flash = () => {
        button.textContent = "✓ copied";
        button.classList.add("copied");
        setTimeout(() => {
            button.textContent = "copy";
            button.classList.remove("copied");
        }, 1400);
    };
    const codeEl = document.getElementById(targetId);
    if (!codeEl) return;
    try {
        await navigator.clipboard.writeText(codeEl.textContent);
        flash();
    } catch {
        const range = document.createRange();
        range.selectNodeContents(codeEl);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        document.execCommand("copy");
        selection.removeAllRanges();
        flash();
    }
}

const mainCopyBtn = document.getElementById("copyUsage");
if (mainCopyBtn) mainCopyBtn.onclick = function() { handleCopy(this, "usageCode"); };
const popCopyBtn = document.getElementById("copyUsagePopover");
if (popCopyBtn) popCopyBtn.onclick = function() { handleCopy(this, "usageCodePopover"); };

async function copySourceCommand(btn) {
    const cmd = "npm install @staticcanvas/asciiam";
    const label = btn.querySelector("span");
    const flash = () => {
        if (label) label.textContent = "✓ copied";
        btn.classList.add("copied");
        setTimeout(() => {
            if (label) label.textContent = "copy";
            btn.classList.remove("copied");
        }, 1400);
    };
    try {
        await navigator.clipboard.writeText(cmd);
        flash();
    } catch {
        const tmp = document.createElement("input");
        tmp.value = cmd;
        document.body.appendChild(tmp);
        tmp.select();
        document.execCommand("copy");
        document.body.removeChild(tmp);
        flash();
    }
}
["copySourceCommandAbout", "copySourceCommandCode"].forEach((id) => {
    const btn = document.getElementById(id);
    if (btn) btn.onclick = function() { copySourceCommand(this); };
});

const exportFormatEl = document.getElementById("exportFormat");
const exportScaleEl = document.getElementById("exportScale");
const exportQualityEl = document.getElementById("exportQuality");
const exportQualityGroupEl = document.getElementById("exportQualityGroup");
const downloadPictureBtn = document.getElementById("downloadPictureBtn");
const copyPictureBtn = document.getElementById("copyPictureBtn");
const exportStatusEl = document.getElementById("exportStatus");

if (exportFormatEl) {
    exportFormatEl.onchange = (e) => {
        const isJpgOrWebp = e.target.value === "jpg" || e.target.value === "webp";
        if (exportQualityGroupEl) exportQualityGroupEl.style.display = isJpgOrWebp ? "block" : "none";
    };
}

if (exportScaleEl) {
    exportScaleEl.oninput = (e) => {
        const val = e.target.value;
        const labels = { "1": "1× (Native)", "2": "2× (HD)", "3": "3× (Super HD)", "4": "4× (Ultra 4K Print)" };
        const statusVal = document.getElementById("exportScaleVal");
        if (statusVal) statusVal.textContent = labels[val] || `${val}×`;
    };
}

if (exportQualityEl) {
    exportQualityEl.oninput = (e) => {
        const pct = Math.round(Number(e.target.value) * 100);
        const statusVal = document.getElementById("exportQualityVal");
        if (statusVal) statusVal.textContent = `${pct}%`;
    };
}

if (downloadPictureBtn) {
    downloadPictureBtn.onclick = async () => {
        const format = exportFormatEl ? exportFormatEl.value : "png";
        const scale = exportScaleEl ? Number(exportScaleEl.value) : 1;
        const quality = exportQualityEl ? Number(exportQualityEl.value) : 0.92;
        if (exportStatusEl) exportStatusEl.textContent = "Exporting picture...";
        try {
            const result = await anim.exportImage({ format, scale, quality, download: true, filename: "asciiam-art" });
            if (exportStatusEl) exportStatusEl.textContent = `Downloaded ${result.filename} (${result.width}×${result.height} px).`;
        } catch (err) {
            if (exportStatusEl) exportStatusEl.textContent = `Export failed: ${err.message}`;
        }
    };
}

if (copyPictureBtn) {
    copyPictureBtn.onclick = async () => {
        const scale = exportScaleEl ? Number(exportScaleEl.value) : 1;
        const quality = exportQualityEl ? Number(exportQualityEl.value) : 0.92;
        if (exportStatusEl) exportStatusEl.textContent = "Copying picture to clipboard...";
        try {
            const result = await anim.exportImage({ format: "png", scale, quality });
            if (navigator.clipboard && window.ClipboardItem) {
                await navigator.clipboard.write([new ClipboardItem({ [result.blob.type]: result.blob })]);
                if (exportStatusEl) exportStatusEl.textContent = "Copied ASCII picture to clipboard!";
            } else {
                if (exportStatusEl) exportStatusEl.textContent = "Clipboard image copy not supported by browser.";
            }
        } catch (err) {
            if (exportStatusEl) exportStatusEl.textContent = `Copy failed: ${err.message}`;
        }
    };
}

document.querySelectorAll("select, input").forEach((control) => {
    control.addEventListener("input", renderUsage);
    control.addEventListener("change", renderUsage);
});
syncControlsFromOpts();
if (requestedConfig || requestedImageSource) document.getElementById("preset").value = "";
else if (requestedPreset) document.getElementById("preset").value = requestedPresetName;
else if (restoredSettings?.options) document.getElementById("preset").value = "";
renderSavedPresetList();
activePresetSnapshot = requestedImageSource || requestedConfig || requestedPreset || !restoredSettings?.options ? getPersistableOptions() : null;
updatePresetDirtyState();
settingsReady = true;
optionHistory = [getPersistableOptions()];
historyIndex = 0;
historyReady = true;
syncHistoryButtons();
renderUsage();
