"use client";

import * as Memes from "@/app/meme/crud";
import { useAuth } from "@/auth/authProvider";
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
import { Meme } from "@/types/Meme";
import { zodResolver } from "@hookform/resolvers/zod";
import { TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Dispatch, SetStateAction, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import ImageInput from "./ui/imageInput";

const MAX_FILE_SIZE = 2 * 1024 * 1024;
const OPTIONS: Option[] = [
    { label: "فيلم", value: "فيلم" },
    { label: "مسلسل", value: "مسلسل" },
    { label: "مسرحية", value: "مسرحية" },
    { label: "blank", value: "blank" },
];
const formSchema = z.object({
    name: z.string(),
    tags: z.array(
        z.object({
            label: z.string(),
            value: z.string(),
        })
    ),
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
});

interface FormStatus {
    status: "default" | "loading" | "success" | "error" | "pending";
    data?: string | object;
}

export default function UpdateMeme({
    meme,
    className,
    open,
    onOpen,
}: {
    meme: Meme;
    className?: string;
    open: boolean;
    onOpen: Dispatch<SetStateAction<boolean>>;
}) {
    const [state, setState] = useState<FormStatus>({ status: "default" });
    const t = useTranslations("uploadMeme");
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            tags: [],
            imageUrl: "",
            imageFile: undefined,
        },
    });
    const auth = useAuth();
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
            setState({ status: "loading" });
            const tags = values.tags.map((tag) => tag.value);
            await Memes.Patch(meme.id, { ...values, tags: tags }, auth.token() ?? "");
            setState({ status: "success" });

        } catch (error: unknown) {
            console.log(error);
            setState({
                status: "error",
                data: error instanceof Error ? error.message : String(error),
            });
        }
    };
    const handleCancel = () => {
        form.reset();
        setState({ status: "default", data: "" });
        onOpen(false);
    };
    return (
        <div className={className}>
            <Dialog
                open={open}
                onOpenChange={(open) => {
                    onOpen(open);
                    if (!open) {
                        handleCancel();
                    }
                    form.reset();
                }}
            >
                {!["success", "pending"].includes(state.status) ? (
                    <DialogContent className="sm:max-w-[425px] overflow-y-auto max-h-[80vh]  sm:p-6 md:max-h-[90vh] ">
                        <DialogHeader>
                            <DialogTitle>Edit {meme.id}</DialogTitle>
                            <DialogDescription>
                                {t("description")}
                            </DialogDescription>
                            <DialogDescription className="font-medium text-red-500">
                                {t("note")}
                            </DialogDescription>
                        </DialogHeader>
                        {state.status === "error" && (
                            <div className="text-center">
                                <TriangleAlert
                                    size={100}
                                    className="mx-auto text-red-500"
                                />

                                <h2 className="font-bold text-lg">
                                    {t("upload-error-title")}
                                </h2>
                                <p>{t("upload-error-description")}</p>
                            </div>
                        )}
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
                                            <FormLabel>{t("name")}</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder={t(
                                                        "name-placeholder"
                                                    )}
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
                                            <FormLabel>{t("tags")}</FormLabel>
                                            <FormControl>
                                                <MultipleSelector
                                                    onSearch={async (input) =>
                                                        searchTags(input)
                                                    }
                                                    defaultOptions={OPTIONS}
                                                    creatable
                                                    placeholder={t(
                                                        "tags-placeholder"
                                                    )}
                                                    loadingIndicator={
                                                        <Loader />
                                                    }
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormDescription>
                                                {t("tags-note")}
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
                                            <FormLabel>
                                                {t("image-url")}
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    type="url"
                                                    placeholder={t(
                                                        "image-url-placeholder"
                                                    )}
                                                />
                                            </FormControl>
                                            <FormDescription>
                                                {t("image-url-note")}
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <div className="flex justify-around items-center px-4">
                                    <div className="h-px border-0 w-2/5 bg-gray-300"></div>
                                    <div className="text-center mx-2">
                                        {t("or")}
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
                                        <ImageInput
                                            label={t("upload-image")}
                                            {...fieldProps}
                                            onChange={onChange}
                                        />
                                    )}
                                />
                            </form>
                        </Form>

                        <DialogFooter className="gap-2">
                            <DialogClose asChild>
                                <Button
                                    className=""
                                    onClick={handleCancel}
                                    variant="secondary"
                                >
                                    {t("cancel")}
                                </Button>
                            </DialogClose>
                            <Button
                                key="submit"
                                onClick={form.handleSubmit(onSubmit)}
                                disabled={
                                    state.status === "loading" ||
                                    !form.formState.isValid ||
                                    form.formState.isValidating
                                }
                            >
                                {t("submit")}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                ) : (
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{t("success-title")}</DialogTitle>
                            <DialogDescription>
                                {t("success-description")}
                            </DialogDescription>
                        </DialogHeader>
                        {typeof state.data === "object" &&
                            "id" in state.data && (
                                <Button asChild onClick={handleCancel}>
                                    <Link
                                        href={`/meme/${
                                            (state.data as unknown as Meme).id
                                        }`}
                                    >
                                        Meme Page
                                    </Link>
                                </Button>
                            )}
                    </DialogContent>
                )}
            </Dialog>
        </div>
    );
}
