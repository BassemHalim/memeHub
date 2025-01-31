import { Search } from "lucide-react";
import Image from "next/image";
const HeroSearch = () => {
    return (
        <div className="relative w-full h-84 md:h-96">
            {/* Hero Image Container */}
            <div className="absolute inset-0">
                <Image
                    fill
                    src="/hero_search.jpg"
                    alt="Hero background"
                    className="w-full h-full object-cover opacity-50"
                />
                {/* Gradient overlay for smooth transition */}
                <div className="absolute inset-0 bg-black from-white to-slate-800 opacity-25 bg-cover" />
            </div>

            {/* Search Bar Container */}
            <div className="absolute inset-0 flex items-end justify-center px-4">
                <div className="w-full max-w-2xl m-6">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search..."
                            className="text-black w-full px-4 py-3 pl-12 rounded-2xl bg-white/90 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-lg"
                        />
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HeroSearch;
