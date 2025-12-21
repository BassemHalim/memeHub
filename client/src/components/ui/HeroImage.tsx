import Image from "next/image";

interface HeroImageProps {
    children: React.ReactNode;
    className?: string;
    height?: string;
}

const HeroImage = ({ children, className = "", height = "h-[400px]" }: HeroImageProps) => {
    return (
        <section className={`relative ${height} w-full mb-6 shadow-md shadow-secondary ${className}`}>
            <div className="absolute inset-0">
                <Image
                    fetchPriority="high"
                    priority
                    src="/hero.png"
                    height={1080}
                    width={1920}
                    alt="egyptian memes collage"
                    className="w-full h-full object-fill brightness-50"
                />
            </div>
            <div className="relative h-full flex flex-col items-center justify-center px-4">
                {children}
            </div>
        </section>
    );
};

export default HeroImage;
