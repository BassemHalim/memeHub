import { Meme } from "@/types/Meme";
import { Search } from "lucide-react";
import Image from "next/image";
import { Dispatch, FormEvent, SetStateAction, useState } from "react";

type HeroSearchProps = {
    setMemes: Dispatch<SetStateAction<Meme[]>>;
};
const HeroSearch = ({ setMemes }: HeroSearchProps) => {
    const [error, setError] = useState(false);
    // const [showError, setShowError] = useState(false);

    async function search(event: FormEvent) {
        event.preventDefault();
        const form = event.target as HTMLFormElement;
        const data = new FormData(form);
        const query = data.get("query")?.toString();
        if (!query || query.length == 0) {
            return;
        }
        console.log(query);
        // make fetch request to /api/memes?query
        const url = new URL(
            "/api/memes/search",
            process.env.NEXT_PUBLIC_API_HOST
        );
        url.searchParams.append("query", query);
        try {
            const resp = await fetch(url);
            if (!resp.ok) {
                throw new Error("Failed to fetch memes");
            }
            const memesResp = await resp.json();
            const memes: Meme[] = memesResp.memes;
            setMemes(memes);
            form.reset();
            setError(false);
        } catch (err) {
            setError(true);
            console.log(err);
        }
    }

    // useEffect(() => {
    //     if (error) {
    //         setShowError(true);
    //         setTimeout(() => {
    //             setError(false);
    //             // Add a slight delay before hiding to allow fade out animation
    //             setTimeout(() => {
    //                 setShowError(false);
    //             }, 500);
    //         }, 5000);
    //     }
    // }, [error]);
    return (
        <section className="relative h-[400px] w-full mb-12">
            <div className="absolute inset-0">
                <Image
                    src="/ali_rabi3.jpg"
                    height={500}
                    width={1000}
                    alt="Ali Rabi3 meme"
                    className="w-full h-full object-fill brightness-50"
                />
            </div>
            <div className="relative h-full flex flex-col items-center justify-center px-4">
                <h1 className="text-5xl font-bold text-white mb-6 text-center">
                    House of Memes
                </h1>
                <div className="w-full max-w-2xl relative text-gray-800 ">
                    <form onSubmit={search}>
                        <input
                            required
                            name="query"
                            type="text"
                            placeholder="Search memes..."
                            className={`w-full px-6 py-4 rounded-lg text-lg shadow-lg pr-14  ${
                                error ? "border-4 border-rose-800" : ""
                            }`}
                        />
                        <button type="submit">
                            <Search className="absolute right-4 top-0 mt-4 text-gray-400 h-6 w-6" />
                        </button>

                        {/* <span
                            className={`${showError? '': 'hidden'} inline-block m-4 p-4  text-white bg-rose-800/20 rounded-lg transition-opacity duration-500 ${
                                error ? "opacity-100" : "opacity-100"
                            }`}
                        >
                            Sorry, we had a problem 😢
                        </span> */}
                    </form>
                </div>
            </div>
        </section>
    );
};

export default HeroSearch;
