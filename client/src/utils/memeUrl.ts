import { Meme } from "@/types/Meme";

/**
 * Returns the relative URL for a given meme, including its slug.
 * @param meme
 * @returns meme URL with slug (e.g. /meme/12345/funny-meme-name)
 */
export const memePagePath = (meme: Meme): string => {
    if (!meme) return "/";
    const slug = slugify(meme.name);
    if (!slug) return `/meme/${meme.id}/${encodeURIComponent(slugify(meme.tags[0] || "meme"))}`;
    return `/meme/${meme.id}/${encodeURIComponent(slug)}`;
};

/**
 * Creates a URL-friendly slug from any string.
 * - Converts spaces to hyphens
 * - Removes special characters and punctuation
 * - Collapses multiple hyphens
 * - Trims hyphens from start/end
 * - Keeps non-Latin (e.g. Arabic) letters intact
 */
function slugify(text: string): string {
    if (!text) return "";

    return text
        .normalize("NFKD") // normalize accented chars
        .replace(/[\u0300-\u036f]/g, "") // remove diacritics
        .replace(/[^\p{L}\p{N}\s-]/gu, "") // remove all non-letter/number/space/hyphen (Unicode safe)
        .trim() // remove leading/trailing spaces
        .replace(/\s+/g, "-") // replace spaces/tabs with single dash
        .replace(/-+/g, "-") // collapse multiple dashes
        .replace(/^-+|-+$/g, ""); // trim hyphens at ends
}
