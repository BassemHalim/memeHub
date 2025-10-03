import { Link } from "@/i18n/navigation";
import { Meme } from "@/types/Meme";
import Image from "next/image";
import { Card } from "./card";
export default function RecommendationCard({ meme }: { meme: Meme }) {
    const memeURL = meme.media_url.startsWith("http") // crude way to check if it's an external URL, initially I used to store relative paths
        ? meme.media_url
        : `${process.env.NEXT_PUBLIC_API_HOST}${meme.media_url}`;
    return (
        <Link
            href={`/meme/${meme.id}/${meme.name}`}
            className="hover:scale-[1.02] transition-transform"
        >
            <Card className="flex">
                <div className="pl-2 flex flex-col justify-center flex-1 w-32 h-32">
                    <Image
                        src={memeURL}
                        alt={`ميم | رياكشن | ${meme.name}`}
                        width={120}
                        height={120}
                        style={{ width: "100%", height: "100%" }}
                        className="w-full rounded-l-md"
                        unoptimized={meme.media_url.endsWith(".gif")}
                    />
                </div>
                <div className="flex flex-col flex-1 p-2">
                    <p className="font-bold text-xs">{meme.name}</p>
                    <div className="flex flex-wrap gap-1">
                        {meme.tags.slice(0, 4).map((tag) => (
                            <span key={tag} className="text-xs text-gray-500">
                                #{tag}
                            </span>
                        ))}
                    </div>
                </div>
            </Card>
        </Link>
    );
}
