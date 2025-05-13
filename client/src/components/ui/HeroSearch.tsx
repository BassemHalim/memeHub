import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useRouter } from "@/i18n/navigation";
import { FormEvent } from "react";

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
        <div>
            <section className="relative h-[400px] w-full mb-6 shadow-md shadow-secondary">
                <div className="absolute inset-0">
                    <Image
                        priority
                        src="/ali_rabi3.jpg"
                        height={500}
                        width={1000}
                        alt="Ali Rabi3 meme"
                        className="w-full h-full object-fill brightness-50"
                    />
                </div>
                <div className="relative h-full flex flex-col items-center justify-center px-4">
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
                </div>
            </section>
        </div>
    );
};

export default HeroSearch;
