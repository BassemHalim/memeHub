export default function NotFound() {
    return (
        <div className="text-center mx-auto max-w-sm md:max-w-md">
            <h1 className="text-4xl font-bold mt-10">
                Not Found <br />
            </h1>
            <span className="text-2xl font-bold text-red-500">
                The meme you are looking for does not exist
                <br />
                it can be deleted or never existed Please check the URL and try
                again
            </span>
        </div>
    );
}
