import { useTranslations } from "next-intl";
import { ChangeEvent, ChangeEventHandler, useCallback } from "react";
import { Input } from "../input";
import PopoverColorPicker from "./popovercolorpicker";
import { TextElementType } from "./types";

interface TextElementEditorProps {
    textElement: TextElementType;
    onElementChange: (textElement: TextElementType) => void;
}

export default function TextElementEditor({
    textElement,
    onElementChange,
}: TextElementEditorProps) {
    const t = useTranslations("memeGenerator");
    const handleTextChange: ChangeEventHandler<HTMLInputElement> | undefined = (
        e: ChangeEvent<HTMLInputElement>,
    ) => {
        const newText = {
            ...textElement,
            text: e.target.value,
        };
        onElementChange(newText);
    };

    const handleFontSizeChange:
        | ChangeEventHandler<HTMLInputElement>
        | undefined = (e: ChangeEvent<HTMLInputElement>) => {
        const newText = {
            ...textElement,
            fontSize: Number(e.target.value),
        };

        onElementChange(newText);
    };

    const handleColorChange = (color: string) => {
        const newText = {
            ...textElement,
            color: color,
        };
        onElementChange(newText);
    };

    const handleBgColorChange = useCallback(
        (color: string) => {
            const newText = {
                ...textElement,
                bgColor: color,
            };
            onElementChange(newText);
        },
        [textElement],
    );

    return (
        <div className="flex gap-1">
            <Input
                className=""
                placeholder={t("text-placeholder")}
                type="text"
                value={textElement?.text ?? ""}
                onChange={handleTextChange}
            />
            <Input
                type="range"
                min={0}
                max={60}
                className="w-24"
                value={textElement.fontSize}
                onChange={handleFontSizeChange}
            />
            <PopoverColorPicker
                color={textElement.color}
                setColor={handleColorChange}
            />
            <PopoverColorPicker
                color={textElement.bgColor}
                setColor={handleBgColorChange}
            />
        </div>
    );
}
