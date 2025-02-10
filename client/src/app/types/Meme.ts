export type MemeSize = "small" | "medium" | "large";

export interface Meme {
    id: number;
    media_url: string;
    media_type: string;
    tags: string[];
    name: string;
    dimensions: number[];
}

export interface MemesResponse {
    memes: Meme[];
    total_count: number;
    page: number;
    TotalPages: number;
}
