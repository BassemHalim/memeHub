"use client";
import { Meme } from "@/types/Meme";
import { useCallback, useEffect, useState } from "react";

interface MemesResponse {
    memes: Meme[];
    total_count: number;
    page: number;
    total_pages: number;
}

export function useFetchMemes() {
    const [memes, setMemes] = useState<Meme[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);

    const fetchMemes = useCallback(async (pageNum: number) => {
        try {
            setIsLoading(true);
            setError(null);
            const url = new URL("/api/memes", process.env.NEXT_PUBLIC_API_HOST);
            url.searchParams.append("page", pageNum.toString());
            url.searchParams.append("pageSize", "4");
            url.searchParams.append("sort", "newest");

            const response = await fetch(url);
            if (!response.ok) throw new Error("Failed to fetch memes");

            const data = (await response.json()) as MemesResponse;

            setMemes((prev) => {
                const seen = new Set(prev.map((m) => m.id));
                return [...prev, ...data.memes.filter((m) => !seen.has(m.id))];
            });

            if (data.page >= data.total_pages) {
                setHasMore(false);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (currentPage === 1) {
            fetchMemes(1);
        }
    }, [fetchMemes]);

    const next = useCallback(() => {
        if (!hasMore || isLoading) return;
        const nextPage = currentPage + 1;
        setCurrentPage(nextPage);
        fetchMemes(nextPage);
    }, [hasMore, isLoading, currentPage, fetchMemes]);

    return { memes, error, isLoading, hasMore, next };
}
