// Initially I stored a relative path to the media in the database

import { Meme } from "@/types/Meme";

// but now I want to store the full URL for new memes they would have a full URL but for old memes I copied all of them to R2 and will serve them from there
export function getMemeUrl(meme: Meme): string {
    if (meme.media_url.startsWith("http")) {
        return meme.media_url;
    }
    return `https://imgs.qasrelmemez.com${meme.media_url}`;
}