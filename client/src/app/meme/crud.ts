import { MAX_FILE_SIZE } from "@/const";
import { validateImage } from "@/utils/img";

export async function Delete(id: string, token: string): Promise<boolean> {
    if (!id || !token) {
        console.error("Missing id or token");
        return false;
    }
    const headers = new Headers();
    headers.append("Authorization", "Bearer " + token);

    try {
        const res = await fetch(`/api/admin/meme/${id}`, { method: "DELETE", headers });
        if (!res.ok) console.error("Failed to delete meme", id, res.status);
        return res.ok;
    } catch (error) {
        console.error(error);
        return false;
    }
}

export async function Patch(
    id: string,
    meme: {
        tags?: string[];
        name?: string;
        imageUrl?: string;
        imageFile?: File;
    },
    token: string
) {
    // Call API to upload meme
    let file: File | undefined, mimeType;
    if (meme.imageFile) {
        file = meme.imageFile;
        if (file) {
            if (file.size > MAX_FILE_SIZE) {
                throw new Error("image too big");
            }
            await validateImage(file).catch(() => {
                throw new Error("Bad image");
            });

            mimeType = file.type;
        }
    } else {
        mimeType = "image/jpeg";
    }

    const body: FormData = new FormData();
    body.append(
        "meme",
        JSON.stringify({
            name: meme.name,
            media_url: meme.imageUrl,
            mime_type: mimeType,
            tags: meme.tags,
        })
    );
    if (file) {
        body.append("image", file);
    }
    const apiHost = process.env.NEXT_PUBLIC_API_HOST || window.location.origin;
    const url = new URL(`/api/admin/meme/${id}`, apiHost)
    return fetch(url, {
        method: "PATCH",
        headers: {
            Authorization: "Bearer " + token,
        },
        body: body,
    })
        .then(async (res) => {
            if (!res.ok) {
                const errorData = await res.text();
                throw new Error("Failed to upload meme " + errorData);
            }
        })
        .catch((err: Error) => {
            console.log(err);
            throw new Error(err.message);
        });
}
