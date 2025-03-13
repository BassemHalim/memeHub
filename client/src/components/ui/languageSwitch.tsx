import { usePathname, useRouter } from "@/i18n/navigation";
import { Languages } from "lucide-react";
import { Locale, useLocale } from "next-intl";
import { useParams, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Button } from "./button";

export default function LanguageSwitch() {

    const isArabic = useLocale() == 'ar'
    const router = useRouter();
    const [, startTransition] = useTransition();
    const pathname = usePathname();
    const params = useParams();
    const searchParams = useSearchParams()
const query = searchParams.get('query')
    function setUserLocale(nextLocale: Locale) {
        startTransition(() => {
            router.replace(
                // @ts-expect-error -- TypeScript will validate that only known `params`
                // are used in combination with a given `pathname`. Since the two will
                // always match for the current route, we can skip runtime checks.
                query? { pathname, params, query: {query: searchParams.get('query')} }: {pathname, params},
                { locale: nextLocale }

            );
        });
    }

    // const label = arabic ? "EN" : "AR";
    return (
        <Button
            aria-label="language button"
            className="bg-primary text-secondary "
            onClick={() => {
                setUserLocale(isArabic ? "en" : "ar");
            }}
        >
            <Languages />
        </Button>
    );
}
