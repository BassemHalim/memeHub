import Image from "next/image";

const HeroSearch = () => {
    return (
        <section className="relative w-full min-h-[50vh] md:min-h-screen flex items-center justify-center py-4 px-4 md:px-6">
            <div className="container mx-auto w-full md:w-4/5 relative">
                {/* Image Container */}
                <div className="relative  h-[300px] sm:h-[400px] md:h-[500px] lg:h-[600px]">
                    <Image
                        objectFit="fill"
                        src="/hero_search.jpg"
                        alt="Hero image"
                        fill
                        className="object-cover rounded-lg shadow-lg"
                        priority
                        sizes="(max-width: 768px) 100vw,
                   (max-width: 1200px) 80vw,
                   80vw"
                    />

                    <div className="absolute inset-0 bg-black/30 rounded-lg"></div>
                </div>

                {/* Search Container */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full px-4 md:px-0">
                    <div className="max-w-xs sm:max-w-sm md:max-w-md mx-auto">
                        {/* Search Input */}
                        <input
                            type="text"
                            placeholder="Enter your text here"
                            className="w-full px-4 sm:px-6 py-2 sm:py-3 rounded-lg border border-gray-300 
                       focus:outline-none focus:ring-2 focus:ring-blue-500 
                       shadow-lg text-sm sm:text-base
                       placeholder-gray-500"
                        />
                    </div>
                </div>
            </div>
        </section>
    );
};

export default HeroSearch;
