"use client";

import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import Loader from "@/components/ui/loader";
import MultipleSelector, { Option } from "@/components/ui/multipleSelector";
import { zodResolver } from "@hookform/resolvers/zod";
import { sendGTMEvent } from "@next/third-parties/google";
import { Modal } from "antd";
import { TriangleAlert, Upload as UploadIcon } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const MAX_FILE_SIZE = 2 * 1024 * 1024;
const OPTIONS: Option[] = [
    { label: "Movie", value: "Movie" },
    { label: "TV-Show", value: "TV-Show" },
    { label: "Play", value: "Play" },
    { label: "blank", value: "blank" },
];
const formSchema = z
    .object({
        name: z.string().min(1, "Name is required"),
        tags: z
            .array(
                z.object({
                    label: z.string(),
                    value: z.string(),
                })
            )
            .min(1, "At least one tag is required"),
        imageUrl: z.string().optional(),
        imageFile: z
            .instanceof(File)
            .refine((file) => file.size < MAX_FILE_SIZE, {
                message: "Your image must be less than 2MB.",
            }),
    })
    .refine((data) => data.imageUrl || data.imageFile, {
        message: "You must provide an image url or upload an image",
        path: ["imageUrl", "imageFile"],
    });

export default function UPloadForm({ className }: { className?: string }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    // const [form] = Form.useForm();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            tags: [],
            imageUrl: "",
            imageFile: undefined,
        },
    });

    const showModal = () => {
        setIsModalOpen(true);
        sendGTMEvent({ event: "meme-upload" });
    };
    const searchTags = async (input: string): Promise<Option[]> => {
        if (input.length < 3) {
            return OPTIONS;
        }
        const url = new URL(
            "/api/tags/search",
            process.env.NEXT_PUBLIC_API_HOST
        );
        url.searchParams.append("query", input);
        return fetch(url)
            .then(async (res) => {
                if (!res.ok) {
                    throw new Error("Failed to fetch tags");
                }
                const data = await res.json();
                return data;
            })
            .then((data) => {
                if (!data.tags) {
                    return OPTIONS;
                }
                return data.tags?.map((tag: string) => ({
                    label: tag,
                    value: tag,
                }));
            })
            .catch((err) => {
                console.log(err);
                return OPTIONS;
            });
    };

    const onSubmit = (values: z.infer<typeof formSchema>) => {
        setLoading(true);
        const tags = values.tags.map((tag) => tag.value);
        // Call API to upload meme
        let file: File | undefined, mimeType;
        if (values.imageFile) {
            file = values.imageFile;
            if (file) {
                if (file.size > MAX_FILE_SIZE) {
                    setError("Image is too big");
                    throw new Error("Upload file too large");
                }
                mimeType = file.type;
            }
        } else {
            mimeType = "image/jpeg";
        }
        if (!file && !values.imageUrl) {
            setError("You must upload an image either a url or file");
            throw new Error("Missing media");
        }
        const body: FormData = new FormData();
        body.append(
            "meme",
            JSON.stringify({
                name: values.name,
                media_url: values.imageUrl,
                mime_type: mimeType,
                tags: tags,
            })
        );
        if (file) {
            body.append("image", file);
        }
        const endpoint = new URL("/api/meme", process.env.NEXT_PUBLIC_API_HOST);
        fetch(endpoint, {
            method: "POST",
            body: body,
        })
            .then(async (res) => {
                if (!res.ok) {
                    const errorData = await res.text();
                    throw new Error("Failed to upload meme " + errorData);
                }
                setIsModalOpen(false);
                form.reset();
            })
            .catch((err: Error) => {
                console.log(err);
                setError(err.message);
            });
        setLoading(false);
    };
    const handleCancel = () => {
        form.reset();
        setIsModalOpen(false);
        setError("");
    };
    return (
        <div className={className}>
            <button
                className="bg-gray-200 text-gray-800 p-1 px-2 py-1 rounded-lg flex justify-center items-center gap-2"
                onClick={showModal}
            >
                Upload <UploadIcon />
            </button>
            <Modal
                open={isModalOpen}
                confirmLoading={loading}
                onOk={form.handleSubmit(onSubmit)}
                onCancel={handleCancel}
                footer={[
                    <Button
                        className="bg-gray-200"
                        key="back"
                        onClick={handleCancel}
                        variant="secondary"
                    >
                        Cancel
                    </Button>,
                    !error ? (
                        <Button
                            className="mx-2 bg-gray-800"
                            key="submit"
                            onClick={form.handleSubmit(onSubmit)}
                            disabled={loading}
                        >
                            Submit
                        </Button>
                    ) : null,
                ]}
            >
                <h2 className="text-center font-bold text-lg">Upload a Meme</h2>
                {!error ? (
                    <Form {...form}>
                        <form
                            onSubmit={form.handleSubmit(onSubmit)}
                            className="space-y-8"
                        >
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Name</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="Enter a descriptive name for your meme"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="tags"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Tags</FormLabel>
                                        <FormControl>
                                            <MultipleSelector
                                                onSearch={async (input) =>
                                                    searchTags(input)
                                                }
                                                defaultOptions={OPTIONS}
                                                creatable
                                                placeholder="Add tags..."
                                                loadingIndicator={<Loader />}
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            Include as many tags as you can
                                            (such as movie/show name,
                                            actor/actress relevant text etc.) to
                                            simplify searching for that meme
                                        </FormDescription>

                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="imageUrl"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Image Url</FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                type="url"
                                                placeholder="Image Link from social media like IG, X, etc"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="flex justify-around items-center px-4">
                                <div className="h-px border-0 w-2/5 bg-gray-300"></div>
                                <div className="text-center mx-2">or</div>
                                <div className="h-px border-0 w-2/5 bg-gray-300"></div>
                            </div>

                            <FormField
                                control={form.control}
                                name="imageFile"
                                render={({
                                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                                    field: { onChange, value, ...fieldProps },
                                }) => (
                                    <FormItem>
                                        <FormLabel>Upload Image</FormLabel>
                                        <FormControl>
                                            <Input
                                                {...fieldProps}
                                                type="file"
                                                accept="image/*"
                                                onChange={(event) =>
                                                    onChange(
                                                        event.target.files &&
                                                            event.target
                                                                .files[0]
                                                    )
                                                }
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        </form>
                    </Form>
                ) : (
                    <div className="text-center">
                        <TriangleAlert
                            size={100}
                            className="mx-auto"
                            color="#cb3c71"
                        />

                        <h2 className="font-bold text-lg">
                            Failed to upload Meme
                        </h2>
                        <p>
                            This is likely because you used a bad image url.
                            <br />
                            Try uploading the image instead of its url
                            <br />
                            Error: {error}
                        </p>
                    </div>
                )}
            </Modal>
        </div>
    );
}
