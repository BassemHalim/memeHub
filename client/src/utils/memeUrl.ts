import { Meme } from "@/types/Meme";

/**
 * Returns the relative URL for a given meme, including its slug.
 * @param meme
 * @returns meme URL with slug (e.g. /meme/12345/funny-meme-name)
 */
export const memePagePath = (meme: Meme): string => {
    if (!meme) return "/";
    return `/meme/${meme.id}/${encodeURIComponent(
        meme?.name.replaceAll(" ", "-")
    )}`;
};
