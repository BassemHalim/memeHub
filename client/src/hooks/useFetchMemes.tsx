'use client'
import { Meme } from '@/types/Meme';
import { useState, useEffect } from 'react';

interface MemesResponse {
  memes: Meme[]; 
  total_count: number;
}

export function useFetchMemes() {
  const [memes, setMemes] = useState<Meme[]>([]); 
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchMemes() {
      try {
        const url = new URL("/api/memes", process.env.NEXT_PUBLIC_API_HOST);
        url.searchParams.append('page', '1');
        url.searchParams.append('pageSize', '100');
        url.searchParams.append('sort', 'newest');
        console.log('fetching from ', url.href)
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error("Failed to fetch memes");
        }

        const data = await response.json() as MemesResponse;
        
        if (data.total_count && data.total_count > 0) {
          setMemes(data.memes);
        }
        
        setIsLoading(false);
      } catch (err) {
        console.log("Failed to fetch memes:", err);
        setError(err instanceof Error ? err.message : 'An error occurred');
        setIsLoading(false);
      }
    }

    fetchMemes();
  }, []);

  return { memes, setMemes, error, isLoading };
}
