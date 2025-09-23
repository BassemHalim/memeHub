import { MemesResponse, memesResponseSchema } from "@/types/Meme";
import Ajv from "ajv";

// Cache for storing meme responses
const memeCache = new Map<number, MemesResponse>();

const ajv = new Ajv();
/**
 * Fetches memes from the API with pagination and optional admin token.
 * The results are cached on the server to avoid redundant requests.
 * @param pageNum the page number to fetch
 * @param admin the admin token to use for fetching memes (will fetch memes from the admin endpoint)
 * @returns
 */
export async function fetchMemes(
    pageNum: number,
    pageSize: number,
    adminToken?: string
): Promise<MemesResponse> {
    if (memeCache.has(pageNum)) {
        return memeCache.get(pageNum)!;
    }

    let url = new URL("/api/memes", process.env.NEXT_PUBLIC_API_HOST);
    if (adminToken) {
        url = new URL("/api/admin/memes", process.env.NEXT_PUBLIC_API_HOST);
    }
    url.searchParams.append("page", pageNum.toString());
    url.searchParams.append("pageSize", String(pageSize));
    url.searchParams.append("sort", "newest");
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
    memeCache.set(pageNum, data);
    return data;
}