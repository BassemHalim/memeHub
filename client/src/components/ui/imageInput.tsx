import { Plus } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { ControllerRenderProps } from "react-hook-form";
import { FormControl, FormItem, FormLabel, FormMessage } from "./form";
import { Input } from "./input";
export default function ImageInput({
    onChange,
    label,
    ...props
}: Partial<ControllerRenderProps & { label: string }>) {
    const [imageUrl, setImageURL] = useState<string>();
    return (
        <FormItem className="p-4 flex justify-center items-center">
            <FormLabel className="mx-auto w-24 h-24 bg-primary text-secondary rounded-md flex justify-center items-center outline-primary outline-offset-4 outline-2 outline-dashed">
                {imageUrl !== undefined ? (
                    <div className="relative w-24 h-24 mx-auto">
                        <Image
                            src={imageUrl}
                            alt="uploaded image"
                            fill
                            className="rounded-md"
                        />
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center">
                        <Plus /> {label}
                    </div>
                )}
            </FormLabel>
            <FormControl>
                <Input
                    className="invisible sr-only"
                    {...props}
                    type="file"
                    accept="image/*"
                    onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) {
                            const url = URL.createObjectURL(file);
                            setImageURL(url);
                            onChange?.(file);
                        }
                        onChange!(event.target.files && file);
                    }}
                />
            </FormControl>
            <FormMessage />
        </FormItem>
    );
}
