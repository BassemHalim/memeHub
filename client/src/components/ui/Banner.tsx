

export interface BannerConfig {
    text: string;
    bgColor: string;
    fgColor: string;
}

export async function fetchBanner(): Promise<BannerConfig | null> {
    try {
        const apiHost = process.env.NEXT_PUBLIC_API_HOST;
        const res = await fetch(new URL("/api/banner", apiHost), {
            next: { revalidate: 60 }, // revalidate every 60s
        });
        if (!res.ok) return null;
        const data: BannerConfig = await res.json();
        return data.text ? data : null;
    } catch {
        return null;
    }
}

const URL_REGEX = /(https?:\/\/[^\s]+)/g;

function renderTextWithLinks(text: string, fgColor: string) {
    // Split with a capturing group keeps the URLs as elements in the array
    // e.g. "hello https://example.com world" -> ["hello ", "https://example.com", " world"]
    return text.split(URL_REGEX).map((part, i) => {
        if (URL_REGEX.test(part)) {
            URL_REGEX.lastIndex = 0; // reset stateful regex after test
            return (
                <a
                    key={i}
                    href={part}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline font-semibold"
                    style={{ color: fgColor || "#ffffff" }}
                >
                    {part}
                </a>
            );
        }
        return part;
    });
}

export default function Banner({ banner }: { banner: BannerConfig }) {
    return (
        <div
            className="w-full px-4 py-2 text-center text-sm font-medium"
            style={{ backgroundColor: banner.bgColor || "#1d4ed8", color: banner.fgColor || "#ffffff" }}
            dir="rtl"
            lang="ar"
        >
            {renderTextWithLinks(banner.text, banner.fgColor)}
        </div>
    );
}
