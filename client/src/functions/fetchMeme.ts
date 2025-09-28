import { Meme } from "@/types/Meme";

export default async function fetchMeme(id: string): Promise<Meme | null> {
    let data = null;
    const url = new URL(`/api/meme/${id}`, process.env.NEXT_PUBLIC_API_HOST);

    try {
        const response = await fetch(url);
        data = await response.json();
        //TODO: validate schema
    } catch (error) {
        console.log(error);
    }
    return data;
}
