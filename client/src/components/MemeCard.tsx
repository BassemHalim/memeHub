import { Meme } from "@/types/Meme";
import { DownloadOutlined } from "@ant-design/icons";
import Image from "next/image";

// const sizeToHeight: Record<string, string> = {
//     small: "h-[200px]",
//     medium: "h-[300px]",
//     large: "h-[400px]",
// };

export default function MemeCard({ meme }: { meme: Meme; size: string }) {
    meme.media_url = new URL(
        meme.media_url,
        "https://18.118.4.126.sslip.io"
    ).href; // TODO: fix
    const parts = meme.media_url.split(".")
    const extension = parts[parts.length-1]
    console.log("Media URL", meme.media_url)
    
    const handleDownload = async () => {
        try {
            const response = await fetch(meme.media_url, {
                method: "GET",
                mode: "cors",
            });
            if (!response.ok) {
                console.log(response.statusText);
                return;
            }
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${meme.name.replaceAll(" ", "_")}.${extension}`; // TODO: use the correct extension type
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error("Error downloading meme:", error);
        }
    };
    return (
        <div
            className={`container group relative rounded-lg overflow-hidden shadow-lg  w-full`}
        >
            <Image
                src={meme.media_url}
                alt={meme.name}
                height={meme.dimensions[1]}
                width={meme.dimensions[0]}
                className="w-full"
                unoptimized={meme.media_url.endsWith('.gif')}

            />
            <div className="absolute bottom-0 left-0 right-0 bg-gray-800/40 text-white text-xs p-2 group-hover:hidden flex flex-wrap">
                {meme.tags.map((tag: string) => {
                    return (
                        <span
                            key={tag}
                            className="text-xs bg-gray-200 text-gray-800 text-xs px-2 py-1 rounded-lg mx-[4px] my-[2px]"
                        >
                            {tag}
                        </span>
                    );
                })}
            </div>
            {/* download button */}
            <button
                onClick={handleDownload}
                className="hidden absolute group-hover:block top-1 right-1 bg-slate-200 text-black rounded-full p-2 flex items-center justify-center w-9 h-9"
            >
                <DownloadOutlined className="text-lg" />
            </button>
        </div>
    );
}
