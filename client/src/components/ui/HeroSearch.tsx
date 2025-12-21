import { useRouter } from "@/i18n/navigation";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { FormEvent } from "react";
import HeroImage from "./HeroImage";

const HeroSearch = () => {
    const router = useRouter();
    async function search(event: FormEvent) {
        event.preventDefault();
        const form = event.target as HTMLFormElement;
        const data = new FormData(form);
        const query = data.get("query")?.toString();
        if (!query || query.length == 0) {
            return;
        }
        // go to /search?query={query}
        router.push({ pathname: "/search", query: { query } });
    }
    const t = useTranslations("Home");
    return (
        <HeroImage>
            <h1 className="text-5xl font-bold text-white text-center">
                {t("title")}
            </h1>
            <h2 className="text-2xl mb-5 text-center">{t("hero")}</h2>
            <div className="w-full max-w-2xl relative text-gray-800 ">
                <form onSubmit={search}>
                    <input
                        required
                        name="query"
                        type="text"
                        placeholder={t("meme-search")}
                        className={`w-full px-6 py-4 rounded-lg text-lg shadow-lg pr-14 font-medium bg-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring`}
                    />
                    <button type="submit">
                        <Search className="absolute right-4 top-0 mt-4 text-gray-400 h-6 w-6" />
                    </button>
                </form>
            </div>
        </HeroImage>
    );
};

export default HeroSearch;
