import UploadMemeForm from "@/components/UploadMemeForm";
export default function Header() {
    return (
        <header className="font-bold text-lg text-center p-5 flex justify-center items-center  relative">
            🏛️ 2asr el memez
            <UploadMemeForm  className="absolute right-0 mr-4 "/>
        </header>
    );
}
