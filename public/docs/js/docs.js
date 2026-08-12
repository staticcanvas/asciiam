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
    const candidates = [...document.querySelectorAll("#main-content h1, #main-content h2, #main-content h3, #main-content p, #main-content tr")]
        .filter((element) => !element.closest(".topbar"));
    let resultIndex = -1;
    let lastQuery = "";
    const clearHit = () => document.querySelector(".search-hit")?.classList.remove("search-hit");
    const findNext = () => {
        const query = pageSearch.value.trim().toLocaleLowerCase("en");
        clearHit();
        if (!query) return;
        const results = candidates.filter((element) => element.textContent.toLocaleLowerCase("en").includes(query));
        resultIndex = query === lastQuery ? (resultIndex + 1) % Math.max(results.length, 1) : 0;
        lastQuery = query;
        const result = results[resultIndex];
        pageSearch.setAttribute("aria-label", results.length ? `Find on this page, ${resultIndex + 1} of ${results.length}` : "Find on this page, no results");
        if (!result) return;
        result.classList.add("search-hit");
        result.scrollIntoView({ behavior: "smooth", block: "center" });
    };
    pageSearch.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            findNext();
        }
        if (event.key === "Escape") {
            pageSearch.value = "";
            clearHit();
            pageSearch.blur();
        }
    });
    pageSearch.addEventListener("search", clearHit);
    document.addEventListener("keydown", (event) => {
        if ((event.ctrlKey || event.metaKey) && event.key.toLocaleLowerCase("en") === "k") {
            event.preventDefault();
            pageSearch.focus();
            pageSearch.select();
        }
    });
}
