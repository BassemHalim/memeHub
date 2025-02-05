// import Image from "next/image";
// type Meme = {
//     id: number;
//     media_url: string;
//     media_type: string;
//     tags: string[];
// };
// export default function Meme({ meme }: { meme: Meme }) {
//     return (
//         <div className="rounded-lg m-4 relative group row-end-8">
//             <Image
//                 // className="object-contain"
//                 key={meme.id}
//                 alt={meme.tags.join(", ")}
//                 src={meme.media_url}
//                 fill
//                 sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
//             />
//             <div className="absolute bottom-0 left-0 right-0 bg-gray-800 bg-opacity-50 text-white text-xs p-2 group-hover:hidden">
//                 {meme.tags.map((tag) => {
//                     return (
//                         <span
//                             key={tag}
//                             className="bg-gray-200 text-gray-800 text-xs px-2 py-1 rounded-full m-1"
//                         >
//                             {tag}
//                         </span>
//                     );
//                 })}
//             </div>
//         </div>
//     );
// }

"use client";

import { Meme } from "@/types/Meme";
import Image from "next/image";

const sizeToHeight: Record<string, string> = {
    small: "h-[200px]",
    medium: "h-[300px]",
    large: "h-[400px]",
};

export default function MemeCard({ meme, size }: { meme: Meme; size: string }) {
    return (
        <div
            className={`relative rounded-lg overflow-hidden shadow-lg ${sizeToHeight[size]} w-full`}
        >
            <Image
                src={meme.media_url}
                alt={`Meme ${meme.id}`}
                fill
                className="object-fill"
            />
            <div className="absolute bottom-0 left-0 right-0 p-3 bg-black/50 backdrop-blur-sm">
                <div className="absolute bottom-0 left-0 right-0 bg-gray-800 bg-opacity-50 text-white text-xs p-2 group-hover:hidden">
                    {meme.tags.map((tag: string) => {
                        return (
                            <span
                                key={tag}
                                className="bg-gray-200 text-gray-800 text-xs px-2 py-1 rounded-full m-1"
                            >
                                {tag}
                            </span>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
