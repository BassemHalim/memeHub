"use client";
import { useAuth } from "@/auth/authProvider";
import AdminLogin from "@/components/ui/adminLogin";
import { Button } from "@/components/ui/button";
import Timeline from "@/components/ui/Timeline";
import fetchMeme from "@/functions/fetchMeme";
import { useMemes } from "@/hooks/useMemes";
import { Meme } from "@/types/Meme";
import { SearchIcon } from "lucide-react";
import { FormEvent, useCallback, useState } from "react";

export default function Home() {
    const auth = useAuth();
    const { memes, isLoading, hasMore, next } = useMemes(auth.token(), 20, "most_downloaded");
    const [searchResult, setSearchResult] = useState<Meme | null>(null);
    const onSubmit = useCallback((e: FormEvent) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const data = new FormData(form);
        const query = data.get("query")?.toString();
        if (!query || query.length == 0) {
            return;
        }
        let id = query.trim();
        // trim whitespace + if is url get id from url
        if (query.startsWith("http")) {
            const url = new URL(query);
            const paths = url.pathname.split("/");
            id = paths[paths.length - 1];
        }
        fetchMeme(id).then((meme: Meme | null) => {
            if (meme) {
                setSearchResult(meme);
            } else {
                alert("Meme not found");
            }
        });
    }, []);

    if (!auth.isAdmin) {
        return <AdminLogin />;
    }
    return (
        <div
            className="w-full flex flex-col flex-1 items-center gap-2"
            dir="ltr"
        >
            <div className="flex justify-around items-center max-w-lg gap-3">
                <h1 className="text-3xl font-bold">Admin Panel</h1>
                <Button onClick={() => auth.logout()}>Logout</Button>
            </div>
            <div className="gap-4 text-black relative">
                <form onSubmit={onSubmit}>
                    <input
                        required
                        name="query"
                        id="searchBar"
                        type="text"
                        placeholder="Search memes by id"
                        className={`w-full px-6 py-4 rounded-lg text-lg shadow-lg pr-14`}
                    />
                    <button type="submit">
                        <SearchIcon className="absolute right-4 top-0 mt-4 text-gray-400 h-6 w-6" />
                    </button>
                </form>
                {searchResult && <Timeline memes={[searchResult]} isLoading={false} hasMore={false} key={searchResult.id} admin/>}
            </div>
            <Timeline
                memes={memes}
                isLoading={isLoading}
                hasMore={hasMore}
                next={next}
                key={memes[0]?.id || "empty"}
                admin={true}
            />
        </div>
    );
}
