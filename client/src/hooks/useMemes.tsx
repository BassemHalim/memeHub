"use client";
import Ajv from "ajv";
import { useCallback, useEffect, useRef, useState } from "react";
import { Meme, MemesResponse, memesResponseSchema } from "../types/Meme";

export type SortOrder = "newest" | "oldest" | "most_tagged" | "most_downloaded" | "most_shared";

// Cache for storing meme responses, keyed by sort order and page
const memeCache = new Map<string, MemesResponse>();

const ajv = new Ajv();
/**
 *
 * @param pageNum the page number to fetch
 * @param sort the sort order for the memes
 * @param admin the admin token to use for fetching memes (will fetch memes from the admin endpoint)
 * @returns
 */
async function fetchMemes(
    pageNum: number,
    pageSize: number,
    sort: SortOrder = "newest",
    adminToken?: string
): Promise<MemesResponse> {
    const cacheKey = `${sort}_${pageNum}`;
    if (memeCache.has(cacheKey)) {
        return memeCache.get(cacheKey)!;
    }

    let url = new URL("/api/memes", process.env.NEXT_PUBLIC_API_HOST);
    if (adminToken) {
        url = new URL("/api/admin/memes", process.env.NEXT_PUBLIC_API_HOST);
    }
    url.searchParams.append("page", pageNum.toString());
    url.searchParams.append("pageSize", String(pageSize));
    url.searchParams.append("sort", sort);
    const res = await fetch(url, {
        headers: adminToken ? { Authorization: `Bearer ${adminToken}` } : {},
    });
    if (!res.ok) {
        throw new Error("Failed to fetch memes");
    }
    const data = await res.json();

    const validate = ajv.compile(memesResponseSchema);
    const valid = validate(data);
    if (!valid) {
        console.log(validate.errors);
        throw new Error("Invalid response format");
    }
    memeCache.set(cacheKey, data);
    return data;
}

export function useMemes(adminToken?: string, pageSize = 20, sort: SortOrder = "newest") {
    const [memes, setMemes] = useState<Meme[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const page = useRef(0); // page is not rendered to it doesn't need a state
    const initialized = useRef(false);

    const loadMoreMemes = useCallback(async () => {
        const currentPage = page.current;
        setIsLoading(true);
        setError(null);
        fetchMemes(currentPage + 1, pageSize, sort, adminToken)
            .then((memesResp) => {
                const newMemes = memesResp.memes;
                setMemes((prev) => [...prev, ...newMemes]);
                page.current += 1;
                if (memesResp.page >= memesResp.total_pages) {
                    setHasMore(false);
                }
            })
            .catch((err) => {
                setError("Failed to get Memes");
                console.log(err);
            })
            .finally(() => {
                setIsLoading(false);
            });
    }, [adminToken, pageSize, sort]);

    useEffect(() => {
        if (!initialized.current) {
            loadMoreMemes();
            initialized.current = true;
        }
    }, [loadMoreMemes]);

    return { memes, error, isLoading, hasMore, next: loadMoreMemes };
}
