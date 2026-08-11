/**
 * @jest-environment node
 */

import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { onRequestGet, onRequestPost } from "../functions/api/unsplash.js";

function context(url, accessKey = "test-key", init = undefined) {
    return {
        request: new Request(url, init),
        env: { UNSPLASH_ACCESS_KEY: accessKey },
        waitUntil: jest.fn(),
    };
}

afterEach(() => {
    jest.restoreAllMocks();
    delete globalThis.caches;
});

describe("Unsplash Pages Function", () => {
    it("returns an edge-cached search response without exposing the access key", async () => {
        const cache = { match: jest.fn().mockResolvedValue(null), put: jest.fn().mockResolvedValue(undefined) };
        globalThis.caches = { default: cache };
        globalThis.fetch = jest.fn().mockResolvedValue(
            Response.json({
                total_pages: 2,
                results: [
                    {
                        id: "photo-1",
                        alt_description: "A mountain",
                        color: "#123456",
                        width: 1200,
                        height: 800,
                        urls: {
                            small: "https://images.example/thumb",
                            regular: "https://images.example/image",
                            full: "https://images.example/full",
                        },
                        links: {
                            html: "https://unsplash.com/photos/photo-1",
                            download_location: "https://api.unsplash.com/photos/photo-1/download?ixid=tracking-token",
                        },
                        user: { name: "Example User", links: { html: "https://unsplash.com/@example" } },
                    },
                ],
            }),
        );

        const requestContext = context("https://example.pages.dev/api/unsplash?query=Mountain");
        const response = await onRequestGet(requestContext);
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(response.headers.get("Cache-Control")).toContain("s-maxage=86400");
        expect(body.results[0]).toEqual(expect.objectContaining({
            id: "photo-1",
            image: "https://images.example/image",
            full: "https://images.example/full",
            downloadLocation: "https://api.unsplash.com/photos/photo-1/download?ixid=tracking-token",
        }));
        expect(JSON.stringify(body)).not.toContain("test-key");
        expect(globalThis.fetch).toHaveBeenCalledWith(
            expect.objectContaining({ hostname: "api.unsplash.com", pathname: "/search/photos" }),
            expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Client-ID test-key" }) }),
        );
        expect(cache.put).toHaveBeenCalledTimes(1);
        expect(requestContext.waitUntil).toHaveBeenCalledTimes(1);
    });

    it("serves a cache hit without calling Unsplash", async () => {
        const cached = Response.json({ query: "ocean", results: [] });
        globalThis.caches = { default: { match: jest.fn().mockResolvedValue(cached), put: jest.fn() } };
        globalThis.fetch = jest.fn();

        const response = await onRequestGet(context("https://example.pages.dev/api/unsplash?query=ocean"));

        expect(await response.json()).toEqual({ query: "ocean", results: [] });
        expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it("fails closed when the secret is missing", async () => {
        const response = await onRequestGet(context("https://example.pages.dev/api/unsplash?query=ocean", ""));

        expect(response.status).toBe(503);
        expect(response.headers.get("Cache-Control")).toBe("no-store");
    });

    it("tracks the exact validated download location through a POST", async () => {
        globalThis.fetch = jest.fn().mockResolvedValue(new Response("{}", { status: 200 }));
        const response = await onRequestPost(context("https://example.pages.dev/api/unsplash", "test-key", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                downloadLocation: "https://api.unsplash.com/photos/photo-1/download?ixid=tracking-token",
            }),
        }));

        expect(response.status).toBe(204);
        expect(globalThis.fetch).toHaveBeenCalledWith(
            expect.objectContaining({
                hostname: "api.unsplash.com",
                pathname: "/photos/photo-1/download",
                search: "?ixid=tracking-token",
            }),
            expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Client-ID test-key" }) }),
        );
    });

    it("rejects untrusted download locations without making a request", async () => {
        globalThis.fetch = jest.fn();
        const response = await onRequestPost(context("https://example.pages.dev/api/unsplash", "test-key", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ downloadLocation: "https://example.com/photos/photo-1/download" }),
        }));

        expect(response.status).toBe(400);
        expect(globalThis.fetch).not.toHaveBeenCalled();
    });
});
