"use client";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
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
import { TriangleAlert } from "lucide-react";
import { Dispatch, SetStateAction, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { validateImage } from "./lib/imgUtils";

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
        imageUrl: z.union([z.literal(""), z.string().trim().url()]),
        imageFile:
            typeof window === "undefined"
                ? z.any()
                : z
                      .instanceof(File)
                      .refine((file) => file.size < MAX_FILE_SIZE, {
                          message: "Your image must be less than 2MB.",
                      })
                      .optional(),
    })
    .refine(
        (data) => {
            return data.imageUrl !== "" || data.imageFile != undefined;
        },

        {
            message: "You must provide an image url or upload an image",
            path: ["root"],
        }
    );

export default function UploadMeme({
    className,
    open,
    onOpen,
}: {
    className?: string;
    open: boolean;
    onOpen: Dispatch<SetStateAction<boolean>>;
}) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            tags: [],
            imageUrl: "",
            imageFile: undefined,
        },
    });

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

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        try {
            setLoading(true);
            const tags = values.tags.map((tag) => tag.value);
            // Call API to upload meme
            let file: File | undefined, mimeType;
            if (values.imageFile) {
                file = values.imageFile;
                if (file) {
                    if (file.size > MAX_FILE_SIZE) {
                        form.setError("imageFile", {
                            message: "Image is too big",
                        });
                        throw new Error("image too big")
                    }
                    await validateImage(file).catch(() => {
                        form.setError("imageFile", {
                            message: "invalid image",
                        });
                        throw new Error("Bad image")
                    });

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
            const endpoint = new URL(
                "/api/meme",
                process.env.NEXT_PUBLIC_API_HOST
            );
            fetch(endpoint, {
                method: "POST",
                body: body,
            })
                .then(async (res) => {
                    if (!res.ok) {
                        const errorData = await res.text();
                        throw new Error("Failed to upload meme " + errorData);
                    }
                    form.reset();
                    onOpen(false);
                })
                .catch((err: Error) => {
                    console.log(err);
                    setError(err.message);
                });
        } catch (error) {
            console.log(error);
        }
        setLoading(false);
    };
    const handleCancel = () => {
        form.reset();
        setError("");
    };
    return (
        <div className={className}>
            <Dialog open={open} onOpenChange={onOpen}>
                <DialogContent className="sm:max-w-[425px] overflow-y-auto max-h-[80vh] pb-96 sm:p-6 md:max-h-[90vh] ">
                    <DialogHeader>
                        <DialogTitle>Upload a Meme</DialogTitle>
                        <DialogDescription>
                            Upload your favorite memes <br /> No offensive
                            content please!
                        </DialogDescription>
                    </DialogHeader>
                    <div>
                        {!error ? (
                            <Form {...form}>
                                <form
                                    onSubmit={form.handleSubmit(onSubmit)}
                                    className="space-y-1"
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
                                                        onSearch={async (
                                                            input
                                                        ) => searchTags(input)}
                                                        defaultOptions={OPTIONS}
                                                        creatable
                                                        placeholder="Add tags..."
                                                        loadingIndicator={
                                                            <Loader />
                                                        }
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormDescription>
                                                    Include as many tags as you
                                                    can (such as movie/show
                                                    name, actor/actress relevant
                                                    text etc.) to simplify
                                                    searching for that meme
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
                                        <div className="text-center mx-2">
                                            or
                                        </div>
                                        <div className="h-px border-0 w-2/5 bg-gray-300"></div>
                                    </div>

                                    <FormField
                                        control={form.control}
                                        name="imageFile"
                                        render={({
                                            field: {
                                                onChange,
                                                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                                                value,
                                                ...fieldProps
                                            },
                                        }) => (
                                            <FormItem>
                                                <FormLabel>
                                                    Upload Image
                                                </FormLabel>
                                                <FormControl>
                                                    <Input
                                                        {...fieldProps}
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={(event) =>
                                                            onChange(
                                                                event.target
                                                                    .files &&
                                                                    event.target
                                                                        .files[0]
                                                            )
                                                        }
                                                    />
                                                </FormControl>
                                                <FormMessage />
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
                                    This is likely because you used a bad image
                                    url.
                                    <br />
                                    Try uploading the image instead of its url
                                    <br />
                                    Error: {error}
                                </p>
                            </div>
                        )}
                    </div>
                    <DialogFooter className="gap-2">
                        <DialogClose asChild>
                            <Button
                                className=""
                                onClick={handleCancel}
                                variant="secondary"
                            >
                                Cancel
                            </Button>
                        </DialogClose>
                        <Button
                            key="submit"
                            onClick={form.handleSubmit(onSubmit)}
                            disabled={
                                loading ||
                                !form.formState.isValid ||
                                form.formState.isValidating
                            }
                        >
                            Submit
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
