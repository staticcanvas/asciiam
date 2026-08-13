document.querySelectorAll(".prose table").forEach((table) => {
    const wrapper = document.createElement("div");
    wrapper.className = "table-scroll";
    wrapper.tabIndex = 0;
    wrapper.setAttribute("role", "region");
    wrapper.setAttribute("aria-label", table.querySelector("caption")?.textContent || "Reference table");
    table.before(wrapper);
    wrapper.append(table);
});

const tocLinks = [...document.querySelectorAll(".toc-panel nav a[href^='#']")];
if (tocLinks.length && "IntersectionObserver" in window) {
    const linksById = new Map(tocLinks.map((link) => [decodeURIComponent(link.hash.slice(1)), link]));
    const headingObserver = new IntersectionObserver((entries) => {
        const visibleHeading = entries.find((entry) => entry.isIntersecting);
        if (!visibleHeading) return;
        tocLinks.forEach((link) => link.removeAttribute("aria-current"));
        linksById.get(visibleHeading.target.id)?.setAttribute("aria-current", "location");
    }, { rootMargin: "-18% 0px -70%", threshold: 0 });
    linksById.forEach((_, id) => {
        const heading = document.getElementById(id);
        if (heading) headingObserver.observe(heading);
    });
}

const pageSearch = document.querySelector("#docs-search");
if (pageSearch) {
    const SEARCH_ALIASES = [
        ["api", "reference", "methods", "options"],
        ["charset", "character", "characters", "glyph", "glyphs"],
        ["config", "configuration", "configure", "settings"],
        ["docs", "documentation", "guide", "guides"],
        ["esm", "module", "mjs", "import"],
        ["examples", "playground", "editor", "workbench"],
        ["image", "images", "photo", "gif", "svg", "media"],
        ["install", "installation", "setup", "quickstart", "start"],
        ["morph", "transition", "crossfade", "cross-fade"],
        ["preset", "presets", "gallery"],
        ["render", "renderer", "rendering", "webgl", "webgl2", "canvas", "gpu"],
        ["sequence", "sequences", "timeline", "steps", "playlist"],
    ];
    const normalizeSearchText = (value) => String(value || "")
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLocaleLowerCase("en");
    const aliasesFor = (term) => {
        const group = SEARCH_ALIASES.find((entries) => entries.includes(term));
        return group || [term];
    };
    const includesCandidate = (value, candidates) => candidates.some((candidate) => value.includes(candidate));
    /** Adds visible matches without assigning search-index content through innerHTML. */
    const appendHighlightedText = (element, value, terms) => {
        const text = String(value || "");
        const escaped = terms.filter(Boolean).map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
        if (!escaped.length) {
            element.textContent = text;
            return;
        }
        const matcher = new RegExp(`(${escaped.join("|")})`, "giu");
        let offset = 0;
        for (const match of text.matchAll(matcher)) {
            if (match.index > offset) element.append(document.createTextNode(text.slice(offset, match.index)));
            const highlight = document.createElement("mark");
            highlight.textContent = match[0];
            element.appendChild(highlight);
            offset = match.index + match[0].length;
        }
        if (offset < text.length) element.append(document.createTextNode(text.slice(offset)));
    };
    const shell = pageSearch.closest("[data-search-index]");
    const resultList = shell.querySelector("#docs-search-results");
    const indexURL = shell.dataset.searchIndex;
    let documents = null;
    let indexPromise = null;
    let activeIndex = -1;
    let searchTimer = null;
    let queryVersion = 0;
    const loadIndex = async () => {
        if (documents) return documents;
        if (!indexPromise) {
            indexPromise = fetch(indexURL, { cache: "no-store" })
                .then((response) => {
                    if (!response.ok) throw new Error("Search index unavailable");
                    return response.json();
                })
                .then((index) => {
                    if (!Array.isArray(index)) throw new TypeError("Search index must be an array");
                    documents = index;
                    return documents;
                })
                .catch((error) => {
                    indexPromise = null;
                    throw error;
                });
        }
        return indexPromise;
    };
    const closeResults = () => {
        resultList.hidden = true;
        resultList.replaceChildren();
        pageSearch.setAttribute("aria-expanded", "false");
        pageSearch.removeAttribute("aria-activedescendant");
        activeIndex = -1;
    };
    const selectResult = (index) => {
        const options = [...resultList.querySelectorAll("[role='option']")];
        if (!options.length) return;
        activeIndex = (index + options.length) % options.length;
        options.forEach((option, optionIndex) => option.setAttribute("aria-selected", String(optionIndex === activeIndex)));
        pageSearch.setAttribute("aria-activedescendant", options[activeIndex].id);
        options[activeIndex].scrollIntoView({ block: "nearest" });
    };
    const scoreDocument = (document, terms) => {
        const title = normalizeSearchText(document.title);
        const tags = normalizeSearchText([...(document.tags || []), ...(document.keywords || [])].join(" "));
        const description = normalizeSearchText(document.description);
        const text = normalizeSearchText(document.text);
        let score = 0;
        for (const term of terms) {
            const candidates = aliasesFor(term);
            const inTitle = includesCandidate(title, candidates);
            const inTags = includesCandidate(tags, candidates);
            const inDescription = includesCandidate(description, candidates);
            const inText = includesCandidate(text, candidates);
            if (!inTitle && !inTags && !inDescription && !inText) return 0;
            if (candidates.includes(title)) score += 30;
            else if (inTitle) score += 16;
            if (inTags) score += 9;
            if (inDescription) score += 5;
            if (inText) score += 1;
        }
        return score;
    };
    const renderResults = async () => {
        const rawQuery = pageSearch.value.trim();
        const query = normalizeSearchText(rawQuery);
        const requestedVersion = ++queryVersion;
        if (query.length < 2) {
            closeResults();
            return;
        }
        try {
            const index = await loadIndex();
            const terms = query.split(/\s+/).filter(Boolean);
            const results = index
                .map((document) => ({ document, score: scoreDocument(document, terms) }))
                .filter((result) => result.score > 0)
                .sort((a, b) => b.score - a.score || String(a.document.title || "").localeCompare(String(b.document.title || "")))
                .slice(0, 8);
            if (requestedVersion !== queryVersion) return;
            resultList.replaceChildren();
            if (!results.length) {
                const empty = document.createElement("p");
                empty.className = "search-empty";
                empty.textContent = `No documentation matched “${pageSearch.value.trim()}”.`;
                resultList.appendChild(empty);
            } else {
                results.forEach(({ document: result }, resultIndex) => {
                    const link = document.createElement("a");
                    link.id = `docs-search-result-${resultIndex}`;
                    link.href = new URL(String(result.url || ""), new URL(indexURL, location.href)).href;
                    link.setAttribute("role", "option");
                    link.setAttribute("aria-selected", "false");
                    const heading = document.createElement("strong");
                    appendHighlightedText(heading, result.title, terms);
                    const summary = document.createElement("span");
                    appendHighlightedText(summary, result.description, terms);
                    const tags = document.createElement("small");
                    tags.className = "search-tags";
                    (result.tags || []).slice(0, 4).forEach((tag) => {
                        const tagElement = document.createElement("span");
                        tagElement.className = "search-tag";
                        tagElement.textContent = tag;
                        const normalizedTag = normalizeSearchText(tag);
                        const matches = terms.some((term) => includesCandidate(normalizedTag, aliasesFor(term)));
                        tagElement.dataset.match = String(matches);
                        tags.appendChild(tagElement);
                    });
                    link.append(heading, summary, tags);
                    resultList.appendChild(link);
                });
            }
            resultList.hidden = false;
            pageSearch.setAttribute("aria-expanded", "true");
            activeIndex = -1;
        } catch {
            if (requestedVersion !== queryVersion) return;
            resultList.replaceChildren();
            const empty = document.createElement("p");
            empty.className = "search-empty";
            empty.textContent = "The documentation search index is unavailable.";
            resultList.appendChild(empty);
            resultList.hidden = false;
            pageSearch.setAttribute("aria-expanded", "true");
        }
    };
    pageSearch.addEventListener("input", () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(renderResults, 120);
    });
    pageSearch.addEventListener("keydown", (event) => {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            selectResult(activeIndex + (event.key === "ArrowDown" ? 1 : -1));
        }
        if (event.key === "Enter") {
            const selected = resultList.querySelector("[aria-selected='true']") || resultList.querySelector("[role='option']");
            if (selected) {
                event.preventDefault();
                selected.click();
            }
        }
        if (event.key === "Escape") {
            pageSearch.value = "";
            closeResults();
            pageSearch.blur();
        }
    });
    pageSearch.addEventListener("search", () => {
        if (!pageSearch.value) closeResults();
        else renderResults();
    });
    document.addEventListener("pointerdown", (event) => {
        if (!shell.contains(event.target)) closeResults();
    });
    document.addEventListener("keydown", (event) => {
        const target = event.target;
        const isEditing = /^(INPUT|TEXTAREA|SELECT)$/.test(target?.tagName) || target?.isContentEditable;
        const commandSearch = (event.ctrlKey || event.metaKey) && event.key.toLocaleLowerCase("en") === "k";
        const slashSearch = event.key === "/" && !event.ctrlKey && !event.metaKey && !event.altKey && !isEditing;
        if (commandSearch || slashSearch) {
            event.preventDefault();
            pageSearch.focus();
            pageSearch.select();
        }
    });
}
