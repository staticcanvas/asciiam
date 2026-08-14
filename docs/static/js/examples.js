import asciiam from "../libs/asciiam.esm.js";

const root = document.querySelector("[data-examples-playground]");

if (root) {
    const selectEl = root.querySelector("[data-example-select]");
    const choices = [...root.querySelectorAll("[data-example-choice]")];
    const editor = root.querySelector("[data-example-editor]");
    const highlightPre = root.querySelector("[data-example-highlight]");
    const highlightCode = root.querySelector("[data-example-highlight-code]");
    const preview = root.querySelector("[data-example-preview]");
    const title = root.querySelector("[data-example-title]");
    const description = root.querySelector("[data-example-description]");
    const status = root.querySelector("[data-example-status]");
    const backend = root.querySelector("[data-example-backend]");
    const error = root.querySelector("[data-example-error]");
    const utility = root.querySelector("[data-example-utility]");
    let selectedTarget = selectEl ? selectEl.options[selectEl.selectedIndex] : choices[0];
    let instance = null;
    let runTimer = null;

    const escapeHtml = (val) => val.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    const highlightJson = (value) => {
        const tokenPattern = /(<\/?[A-Za-z][^>\n]*>)|(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:\\.|[^"\\])*"(?=\s*:))|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|\b(const|let|var|new|true|false|null|undefined|return|await|async|function|class|import|from|export|default|if|else|try|catch|finally|throw)\b|\b(\d+(?:\.\d+)?)\b/g;
        let highlighted = "";
        let cursor = 0;
        for (const match of value.matchAll(tokenPattern)) {
            const [token, tag, comment, property, string, keyword, number] = match;
            highlighted += escapeHtml(value.slice(cursor, match.index));
            const type = tag ? "tag" : comment ? "comment" : property ? "property" : string ? "string" : keyword ? "keyword" : number ? "number" : "";
            highlighted += `<span class="token-${type}">${escapeHtml(token)}</span>`;
            cursor = match.index + token.length;
        }
        return highlighted + escapeHtml(value.slice(cursor));
    };

    const updateHighlight = () => {
        if (!highlightCode) return;
        highlightCode.innerHTML = highlightJson(editor.value) + "\n";
        if (highlightPre) {
            highlightPre.scrollTop = editor.scrollTop;
            highlightPre.scrollLeft = editor.scrollLeft;
        }
    };

    const decodeOptions = (value) => {
        const binary = atob(value);
        const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
        return JSON.parse(new TextDecoder().decode(bytes));
    };
    const encodeOptions = (options) => {
        const bytes = new TextEncoder().encode(JSON.stringify(options));
        let binary = "";
        bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
        return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
    };
    const parseEditor = () => {
        const options = JSON.parse(editor.value);
        if (!options || Array.isArray(options) || typeof options !== "object") {
            throw new TypeError("The editor must contain one JSON object.");
        }
        return options;
    };
    const updateUtilityLink = (options) => {
        const separator = root.dataset.utilityUrl.includes("?") ? "&" : "?";
        utility.href = `${root.dataset.utilityUrl}${separator}config=${encodeURIComponent(encodeOptions(options))}`;
    };
    const reportError = (caught) => {
        error.hidden = false;
        error.textContent = caught instanceof Error ? caught.message : "The configuration could not be applied.";
        status.textContent = "Invalid configuration";
        status.dataset.state = "error";
    };
    const run = () => {
        clearTimeout(runTimer);
        let options;
        try {
            options = parseEditor();
            instance?.destroy();
            instance = new asciiam(preview, options);
            instance.start();
            const renderer = instance.getRendererInfo();
            backend.textContent = renderer.backend === "webgl2" ? "WebGL2" : "Canvas 2D";
            status.textContent = "Running";
            status.dataset.state = "running";
            error.hidden = true;
            error.textContent = "";
            updateUtilityLink(options);
        } catch (caught) {
            reportError(caught);
        }
    };
    const queueRun = () => {
        clearTimeout(runTimer);
        updateHighlight();
        status.textContent = "Waiting for valid JSON";
        status.dataset.state = "pending";
        runTimer = setTimeout(run, 360);
    };
    const selectExample = (target) => {
        if (!target) return;
        selectedTarget = target;
        if (selectEl && target.value && selectEl.value !== target.value) {
            selectEl.value = target.value;
        }
        const options = decodeOptions(target.dataset.options);
        const update = () => {
            choices.forEach((candidate) => candidate.setAttribute("aria-pressed", String(candidate === target)));
            if (title) title.textContent = target.dataset.title || target.querySelector?.("strong")?.textContent || target.textContent;
            if (description) description.textContent = target.dataset.description;
            editor.value = JSON.stringify(options, null, 2);
            updateHighlight();
            run();
        };
        if (document.startViewTransition) document.startViewTransition(update);
        else update();
    };

    if (selectEl) {
        selectEl.addEventListener("change", () => {
            const chosen = selectEl.options[selectEl.selectedIndex];
            if (chosen) selectExample(chosen);
        });
    }
    choices.forEach((choice) => choice.addEventListener("click", () => selectExample(choice)));
    editor.addEventListener("input", queueRun);
    editor.addEventListener("scroll", () => {
        if (highlightPre) {
            highlightPre.scrollTop = editor.scrollTop;
            highlightPre.scrollLeft = editor.scrollLeft;
        }
    });
    editor.addEventListener("keydown", (event) => {
        if (event.key !== "Tab") return;
        event.preventDefault();
        const start = editor.selectionStart;
        editor.setRangeText("  ", start, editor.selectionEnd, "end");
        queueRun();
    });
    root.querySelector("[data-example-run]").addEventListener("click", run);
    root.querySelector("[data-example-reset]").addEventListener("click", () => selectExample(selectedTarget));
    root.querySelector("[data-example-copy]").addEventListener("click", async (event) => {
        const button = event.currentTarget;
        try {
            if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(editor.value);
            else {
                editor.select();
                document.execCommand("copy");
            }
            button.textContent = "Copied";
            setTimeout(() => { button.textContent = "Copy JSON"; }, 1200);
        } catch {
            status.textContent = "Copy unavailable";
        }
    });
    window.addEventListener("pagehide", () => instance?.destroy(), { once: true });
    if (selectedTarget) selectExample(selectedTarget);
}
