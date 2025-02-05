// "use client";
// import { useState } from "react";
// import HeroSearch from "./HeroSearch";
// import Meme from "./Meme";
// /*
// int64 id = 1;
// string media_url = 2;
// string media_type = 3;
// repeated string tags = 4;
// */

// type Meme = {
//     id: number;
//     media_url: string;
//     media_type: string;
//     tags: string[];
// };

// type MemesResponse = {
//     memes: Meme[];
//     TotalCount: number;
//     Page: number;
//     TotalPages: number;
// };

const sampleMemes: Meme[] = [
    {
        id: 1,
        media_url: "https://i.redd.it/jv65hih9gbtd1.jpeg",
        media_type: "image/jpeg",
        tags: ["funny", "meme"],
    },
    {
        id: 2,
        media_url: "https://i.redd.it/99vxtugaizpd1.jpeg",
        media_type: "image/jpeg",
        tags: ["de7k", "meme"],
    },
    {
        id: 3,
        media_url: "https://i.redd.it/yq78v9mfmlpd1.jpeg",
        media_type: "image/jpeg",
        tags: ["ha5a", "meme"],
    },
    {
        id: 4,
        media_url:
            "https://media.filfan.com/NewsPics/FilFanNew/Large/273802_0.png",
        media_type: "image/jpeg",
        tags: ["hahaha", "meme"],
    },
    {
        id: 5,
        media_url:
            "https://i.pinimg.com/736x/85/1f/08/851f082ec2bb5011f8f9a729878b0308.jpg",
        media_type: "image/jpeg",
        tags: ["funny", "meme"],
    },
    {
        id: 6,
        media_url:
            "https://i.pinimg.com/736x/2e/7e/9a/2e7e9a919d7537f884e7a777c9e7e589.jpg",
        media_type: "image/jpeg",
        tags: ["de7k", "meme"],
    },
    {
        id: 7,
        media_url:
            "https://i.pinimg.com/474x/ad/97/2a/ad972a156b9e81a6b1ae09488c7481e6.jpg",
        media_type: "image/jpeg",
        tags: ["ha5a", "meme"],
    },
    {
        id: 8,
        media_url: "/restaurant.jpeg",
        media_type: "image/jpeg",
        tags: ["hahaha", "meme"],
    },
];
// const sizes = ["small", "medium", "large"];
// // infinite scroll timeline of memes
// export default function Timeline() {
//     const [memes, setMemes] = useState<Meme[]>(sampleMemes);

//     // useEffect(() => {
//     //     // fetch memes from the server
//     //     function fetchMemes() {
//     //         const URL = process.env.NEXT_PUBLIC_API_HOST + "/memes";
//     //         console.log("fetching memes from", URL);
//     //         fetch(URL)
//     //             .then((response) => response.json())
//     //             .then((data) => {
//     //                 const memeResp = data as MemesResponse;
//     //                 setMemes(memeResp.memes);
//     //             })
//     //             .catch((error) => {
//     //                 console.error("failed to fetch memes", error);
//     //             });
//     //     }
//     //     fetchMemes();
//     // }, []);
//     return (
//         <div className="w-full container">
//             <HeroSearch />
//             <div className="columns-1 sm:columns-2 lg:columns-4 gap-6">
//                 {memes.map((meme) => (
//                     <div key={meme.id} className="mb-6 break-inside-avoid">
//                         <Meme
//                             meme={meme}
//                             size={sizes[Math.floor(Math.random() * 3)]}
//                         />
//                     </div>
//                 ))}
//             </div>
//         </div>
//     );
// }

import MemeCard from "@/components/MemeCard";
import { Meme } from "@/types/Meme";
import { Search } from "lucide-react";

const memes: Meme[] = sampleMemes;
const sizes = ["small", "medium", "large"];

export default function Home() {
    return (
        <div className="w-full">
            <section className="relative h-[400px] w-full mb-12">
                <div className="absolute inset-0">
                    <img
                        src="https://images.unsplash.com/photo-1531747056595-07f6cbbe10ad?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80"
                        alt="Hero background"
                        className="w-full h-full object-fill brightness-50"
                    />
                </div>
                <div className="relative h-full flex flex-col items-center justify-center px-4">
                    <h1 className="text-5xl font-bold text-white mb-6 text-center">
                        Discover the Best Memes
                    </h1>
                    <div className="w-full max-w-2xl relative">
                        <input
                            type="text"
                            placeholder="Search memes..."
                            className="w-full px-6 py-4 rounded-full text-lg shadow-lg pl-14"
                        />
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 h-6 w-6" />
                    </div>
                </div>
            </section>

            <main className="container mx-auto py-8 px-4">
                <div className="columns-1 sm:columns-2 lg:columns-4 gap-6">
                    {memes.map((meme) => (
                        <div key={meme.id} className="mb-6 break-inside-avoid">
                            <MemeCard
                                meme={meme}
                                size={sizes[Math.floor(Math.random() * 3)]}
                            />
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}
