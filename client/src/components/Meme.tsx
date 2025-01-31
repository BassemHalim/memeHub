import Image from "next/image";
type Meme = {
    id: number;
    media_url: string;
    media_type: string;
    tags: string[];
};
export default function Meme({ meme }: { meme: Meme }) {
    return (
        <div className="rounded-lg overflow-hidden m-4 relative group w-64 h-64">
        <Image className="object-contain"
            key={meme.id}
            alt={meme.tags.join(", ")}
            src={meme.media_url}
            fill
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gray-800 bg-opacity-50 text-white text-xs p-2 group-hover:hidden">
            {meme.tags.map((tag) => {
            return (
            <span key={tag} className="bg-gray-200 text-gray-800 text-xs px-2 py-1 rounded-full m-1">
                {tag}
            </span>
            );
            })}
            </div>
        </div>
    );
}
