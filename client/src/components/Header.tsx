import UploadMemeForm from "@/components/UploadMemeForm";
// import logo from "public/logo.png";
import Image from "next/image";
export default function Header() {
    return (
        <header className="font-bold text-lg text-center p-2 flex justify-between items-center  relative">
            <span>Qasr el memez</span>
            <Image src="/logo.png" alt="qasr el memes" width={80} height={80} />
            <UploadMemeForm className=" " />
        </header>
    );
}
