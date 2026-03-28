"use client";
import { Delete } from "@/app/meme/crud";
import { useAuth } from "@/auth/authProvider";
import AdminLogin from "@/components/ui/adminLogin";
import { Button } from "@/components/ui/button";
import Timeline from "@/components/ui/Timeline";
import fetchMeme from "@/functions/fetchMeme";
import { useMemes } from "@/hooks/useMemes";
import { Meme, MemesResponse } from "@/types/Meme";
import { SearchIcon } from "lucide-react";
import Image from "next/image";
import { FormEvent, useCallback, useEffect, useState } from "react";

function usePendingMemes(token: string | undefined) {
    const [memes, setMemes] = useState<Meme[]>([]);
    const [loading, setLoading] = useState(false);

    const refresh = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        const apiHost = process.env.NEXT_PUBLIC_API_HOST || window.location.origin;
        const res = await fetch(new URL("/api/admin/memes/pending", apiHost), {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
            const data: MemesResponse = await res.json();
            setMemes(data.memes ?? []);
        }
        setLoading(false);
    }, [token]);

    useEffect(() => { refresh(); }, [refresh]);
    return { memes, loading, refresh };
}

async function approveMeme(id: string, token: string) {
    const apiHost = process.env.NEXT_PUBLIC_API_HOST || window.location.origin;
    const res = await fetch(new URL(`/api/admin/meme/${id}/approve`, apiHost), {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
    });
    return res.ok;
}

function PendingMemeCard({ meme, token, onApproved }: { meme: Meme; token: string; onApproved: () => void }) {
    const [loading, setLoading] = useState(false);

    const handleApprove = async () => {
        setLoading(true);
        const ok = await approveMeme(meme.id, token);
        if (ok) onApproved();
        else { alert("Failed to approve"); setLoading(false); }
    };

    const handleDelete = async () => {
        if (!confirm("Delete this meme?")) return;
        const ok = await Delete(meme.id, token);
        if (ok) onApproved(); // refresh list
        else { alert("Failed to delete") }
    };

    return (
        <div className="flex flex-col gap-2 border rounded-lg p-3 bg-white shadow-sm">
            <div className="relative w-full aspect-square">
                <Image src={meme.media_url} alt={meme.name} fill className="object-contain rounded" unoptimized />
            </div>
            <p className="text-sm font-medium truncate">{meme.name}</p>
            <p className="text-xs text-gray-500 truncate">{meme.tags.join(", ")}</p>
            <div className="flex gap-2">
                <Button size="sm" className="flex-1" onClick={handleApprove} disabled={loading}>
                    {loading ? "Approving..." : "Approve"}
                </Button>
                <Button size="sm" variant="destructive" onClick={handleDelete}>
                    Delete
                </Button>
            </div>
        </div>
    );
}

export default function Home() {
    const auth = useAuth();
    const { memes, isLoading, hasMore, next } = useMemes(auth.token(), 20, "most_downloaded");
    const [searchResult, setSearchResult] = useState<Meme | null>(null);
    const { memes: pendingMemes, loading: pendingLoading, refresh } = usePendingMemes(auth.token());

    const onSubmit = useCallback((e: FormEvent) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const data = new FormData(form);
        const query = data.get("query")?.toString();
        if (!query || query.length == 0) return;
        let id = query.trim();
        if (query.startsWith("http")) {
            const url = new URL(query);
            const paths = url.pathname.split("/");
            id = paths[paths.length - 1];
        }
        fetchMeme(id).then((meme: Meme | null) => {
            if (meme) setSearchResult(meme);
            else alert("Meme not found");
        });
    }, []);

    if (!auth.isAdmin) return <AdminLogin />;

    return (
        <div className="w-full flex flex-col flex-1 items-center gap-6 pb-10" dir="ltr">
            <div className="flex justify-around items-center max-w-lg gap-3">
                <h1 className="text-3xl font-bold">Admin Panel</h1>
                <Button onClick={() => auth.logout()}>Logout</Button>
            </div>

            {/* Pending Approvals */}
            <div className="w-full max-w-5xl px-4">
                <h2 className="text-xl font-semibold mb-3">
                    Pending Approvals{pendingMemes.length > 0 && <span className="text-sm font-normal text-gray-500 ml-2">({pendingMemes.length})</span>}
                </h2>
                {pendingLoading ? (
                    <p className="text-gray-500">Loading...</p>
                ) : pendingMemes.length === 0 ? (
                    <p className="text-gray-500">No pending memes 🎉</p>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {pendingMemes.map((meme) => (
                            <PendingMemeCard key={meme.id} meme={meme} token={auth.token()!} onApproved={refresh} />
                        ))}
                    </div>
                )}
            </div>

            {/* Search by ID */}
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
                {searchResult && <Timeline memes={[searchResult]} isLoading={false} hasMore={false} key={searchResult.id} admin />}
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
