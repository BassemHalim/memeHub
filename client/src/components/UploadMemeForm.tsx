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
import { Separator } from "@/components/ui/separator";
import { Select } from "antd";
import { Loader2, Upload, TriangleAlert } from "lucide-react";

import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { SelectProps } from "antd";
import { useState } from "react";
import { useForm } from "react-hook-form";

export default function DialogDemo({ className }: { className?: string }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);
    const form = useForm({
        defaultValues: {
            name: "",
            tags: [],
            imageUrl: "",
            imageFile: undefined,
        },
    });

    const options: SelectProps["options"] = [
        { label: "Movie", value: "Movie" },
        { label: "TV-Show", value: "TV-Show" },
        { label: "blank", value: "blank" },
    ];
    const showModal = () => {
        setIsModalOpen(true);
        setLoading(false)
        setError(false)
        form.reset()
    };
    function onSubmit(values: {
        name: string;
        tags: string[];
        imageUrl: string;
        imageFile?: File;
    }) {
        setLoading(true);
        console.log(values);
        // form.validateFields()
        //     .then((values) => {
        // alert(JSON.stringify(values));
        // Call API to upload meme
        let file, mimeType;
        if (values.imageFile) {
            file = values.imageFile;
            mimeType = file.type;
        } else {
            mimeType = "image/jpeg";
        }
        const body: FormData = new FormData();
        body.append(
            "meme",
            JSON.stringify({
                name: values.name,
                media_url: values.imageUrl,
                mime_type: mimeType,
                tags: values.tags,
            })
        );
        if (file) {
            body.append("image", file);
        }
        fetch(process.env.NEXT_PUBLIC_API_HOST + "/meme", {
            method: "POST",
            body: body,
        })
            .then((res) => {
                if (!res.ok) {
                    throw new Error("Failed to upload meme " + res.status);
                }
                setIsModalOpen(false);
                form.reset();
            })
            .catch((err) => {
                console.log(err);
                setError(true);
                // update UI to mention failed upload
            });
        setLoading(false);
    }
    const handleCancel = () => {
        form.reset();
        setIsModalOpen(false);
        setError(false);
    };
    return (
        <div className={className}>
            <button
                className="bg-gray-200 text-gray-800 p-1 px-2 py-1 rounded-lg flex gap-2 items-center justify center"
                onClick={showModal}
            >
                Upload
                <Upload />
            </button>
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="bg-gray-800 border-0">
                    <DialogHeader>
                        <DialogTitle>Upload Meme</DialogTitle>
                    </DialogHeader>
                    {!error ? (
                        <Form {...form}>
                            <form
                                onSubmit={form.handleSubmit(onSubmit)}
                                className="space-y-6"
                                id="uploadMeme"
                            >
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Name</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="Enter meme name"
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
                                                <Select
                                                    
                                                    className="bg-transparent"
                                                    mode="tags"
                                                    style={{ width: "100%" }}
                                                    placeholder="Add tags..."
                                                    options={options}
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormDescription>
                                                Include as many tags as you can
                                                (such as movie/show name,
                                                actor/actress relevant text
                                                etc.) to simplify searching for
                                                that meme
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
                                            <FormLabel>Image URL</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="Enter image URL"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <div className="flex justify-center items-center relative">
                                    <Separator className="w-1/3 relative" />
                                    <p className="mx-2 font-bold">or</p>
                                    <Separator className="w-1/3" />
                                </div>

                                <FormField
                                    control={form.control}
                                    name="imageFile"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Upload Image</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={(e) =>
                                                        field.onChange(
                                                            e.target.files?.[0]
                                                        )
                                                    }
                                                    onBlur={field.onBlur}
                                                    ref={field.ref}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </form>
                        </Form>
                    ) : (
                        <div className="text-center text-lg">
                            <TriangleAlert className="text-lg mx-auto" size={70}/>
                            <h2 className="font-bold text-lg">
                                Failed to upload Meme
                            </h2>
                            <p>Please try again later</p>
                        </div>
                    )}
                    <DialogFooter>
                        <Button onClick={handleCancel}>Cancel</Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            form="uploadMeme"
                        >
                            {loading ? (
                                <>
                                    Uploading
                                    <Loader2 className="mr-2 animate-spin" />
                                </>
                            ) : (
                                "Submit"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
