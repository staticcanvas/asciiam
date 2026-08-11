const SEARCH_TTL_SECONDS = 86400;
const SEARCH_RESULT_LIMIT = 12;

function json(payload, status = 200, headers = {}) {
    return new Response(JSON.stringify(payload), {
        status,
        headers: { "Content-Type": "application/json; charset=utf-8", ...headers },
    });
}

function safePhoto(photo) {
    return {
        id: photo.id,
        alt: photo.alt_description || photo.description || "Unsplash photograph",
        color: photo.color || "#10131a",
        width: photo.width,
        height: photo.height,
        thumbnail: photo.urls.small,
        image: photo.urls.regular,
        photoUrl: photo.links.html,
        photographer: {
            name: photo.user.name,
            url: photo.user.links.html,
        },
    };
}

async function trackDownload(context, id) {
    if (!/^[\w-]{1,64}$/.test(id)) return json({ error: "Invalid photo id." }, 400);

    const response = await fetch(`https://api.unsplash.com/photos/${encodeURIComponent(id)}/download`, {
        headers: {
            Authorization: `Client-ID ${context.env.UNSPLASH_ACCESS_KEY}`,
            "Accept-Version": "v1",
        },
    });

    if (!response.ok) return json({ error: "Unable to record the selection." }, response.status);
    return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}

async function search(context, query, page) {
    const cache = caches.default;
    const cacheUrl = new URL(context.request.url);
    cacheUrl.search = new URLSearchParams({ query, page: String(page) }).toString();
    const cacheKey = new Request(cacheUrl.toString(), { method: "GET" });
    const cached = await cache.match(cacheKey);
    if (cached) return cached;

    const upstreamUrl = new URL("https://api.unsplash.com/search/photos");
    upstreamUrl.search = new URLSearchParams({
        query,
        page: String(page),
        per_page: String(SEARCH_RESULT_LIMIT),
        orientation: "landscape",
        content_filter: "high",
    }).toString();

    const upstream = await fetch(upstreamUrl, {
        headers: {
            Authorization: `Client-ID ${context.env.UNSPLASH_ACCESS_KEY}`,
            "Accept-Version": "v1",
        },
    });

    if (!upstream.ok) {
        const status = upstream.status === 403 || upstream.status === 429 ? 503 : upstream.status;
        return json({ error: "Unsplash search is temporarily unavailable." }, status, { "Cache-Control": "no-store" });
    }

    const data = await upstream.json();
    const response = json(
        { query, page, totalPages: Math.min(data.total_pages || 0, 10), results: data.results.map(safePhoto) },
        200,
        {
            "Cache-Control": `public, max-age=900, s-maxage=${SEARCH_TTL_SECONDS}, stale-while-revalidate=604800`,
            "X-Content-Source": "Unsplash",
        },
    );
    context.waitUntil(cache.put(cacheKey, response.clone()));
    return response;
}

export async function onRequestGet(context) {
    if (!context.env.UNSPLASH_ACCESS_KEY) {
        return json({ error: "Unsplash search is not configured." }, 503, { "Cache-Control": "no-store" });
    }

    const url = new URL(context.request.url);
    const downloadId = url.searchParams.get("download");
    if (downloadId) return trackDownload(context, downloadId);

    const query = (url.searchParams.get("query") || "").trim().replace(/\s+/g, " ").slice(0, 80);
    const page = Math.min(Math.max(Number.parseInt(url.searchParams.get("page") || "1", 10) || 1, 1), 10);
    if (query.length < 2) return json({ error: "Enter at least two characters." }, 400);

    return search(context, query.toLocaleLowerCase("en"), page);
}
