"use client";
import Ajv from "ajv";
import { useCallback, useEffect, useRef, useState } from "react";
import { Meme, MemesResponse, memesResponseSchema } from "../types/Meme";

const ajv = new Ajv();
async function fetchMemes(pageNum: number): Promise<MemesResponse> {
    const url = new URL("/api/memes", process.env.NEXT_PUBLIC_API_HOST);
    url.searchParams.append("page", pageNum.toString());
    url.searchParams.append("pageSize", "10");
    url.searchParams.append("sort", "newest");

    const res = await fetch(url);
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
    return data;
}

export function useFetchMemes() {
    const [memes, setMemes] = useState<Meme[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const page = useRef(0) // page is not rendered to it doesn't need a state
    const initialized = useRef(false)
    const loadMoreMemes = useCallback(async () => {
        const currentPage = page.current
        console.log("loading page", currentPage + 1);
        setIsLoading(true);
        setError(null);
        fetchMemes(currentPage + 1)
            .then((memesResp) => {
                const newMemes = memesResp.memes;
                setMemes((prev) => [...prev, ...newMemes]);
                page.current +=1
                if (memesResp.page === memesResp.total_pages) {
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
    }, []);

    useEffect(() => {
        if (!initialized.current) {
            console.log("loading memes");
            loadMoreMemes();
            initialized.current = true;
        }
    }, [loadMoreMemes]);

    return { memes, error, isLoading, hasMore, next: loadMoreMemes };
}
