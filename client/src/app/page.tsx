'use client'

import Timeline from "@/components/Timeline";
import { useFetchMemes } from "./hooks/useFetchMemes";

export default function Home() {
    return <Timeline {... useFetchMemes()} />;
}
