"use client";
import { useAuth } from "@/auth/authProvider";
import AdminLogin from "@/components/ui/adminLogin";
import { Button } from "@/components/ui/button";
import Timeline from "@/components/ui/Timeline";
import { useMemes } from "@/hooks/useMemes";

export default function Home() {
    const auth = useAuth();
    const { memes, isLoading, hasMore, next } = useMemes(auth.token());
    if (!auth.isAdmin) {
        return <AdminLogin />;
    }
    return (
        <div className="w-full flex flex-col flex-1" dir="ltr">
            <h1 className="text-3xl font-bold">Admin Panel</h1>
            <Button onClick={() => auth.logout()}>Logout</Button>
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
