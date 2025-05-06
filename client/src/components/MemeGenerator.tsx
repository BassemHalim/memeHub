"use client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import PopoverColorPicker from "@/components/ui/popovercolorpicker";
import { Download, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { MouseEvent, TouchEvent, useEffect, useRef, useState } from "react";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

import { CheckedState } from "@radix-ui/react-checkbox";
import MemeTextBorder from "./ui/MemeTextBorder";

type TextElementType = {
    text: string;
    x: number;
    y: number;
    fontSize: number;
    bgColor: string;
    color: string;
};
const PADDING = 10;

// returns if the user is clicking on textElement
function isClicked(
    x: number,
    y: number,
    textElement: TextElementType,
    ctx: CanvasRenderingContext2D
) {
    const [rx, ry, w, h] = rectPos(textElement, ctx);
    return rx <= x && x <= rx + w && ry <= y && y <= ry + h;
}

function rectPos(e: TextElementType, ctx: CanvasRenderingContext2D) {
    const canvas = ctx.canvas;
    const fontSize = e.fontSize;
    ctx.font = `bold ${fontSize}px El Messiri,El Messiri Fallback`;
    const w = ctx.measureText(e.text).width + 2 * PADDING;
    const h = fontSize + 2 * PADDING;

    // Clamp x and y within canvas bounds
    const x = Math.max(0, Math.min(e.x - PADDING, canvas.width - w));
    const y = Math.max(0, Math.min(e.y - PADDING, canvas.height - h));

    return [x, y, w, h];
}
const defaultText = {
    text: "",
    x: 100,
    y: 100,
    fontSize: 24,
    bgColor: "rgba(255, 255, 255, 0)",
    color: "#ffffff",
};

export default function MemeGenerator() {
    const queryParams = useSearchParams();
    const imgURL = queryParams.get("img");
    const [imageURL, setImageURL] = useState(imgURL ?? "");
    const [textElements, setTextElements] = useState<TextElementType[]>([
        { ...defaultText },
    ]);
    const [topPadding, setTopPadding] = useState<boolean>(false);
    const [bottomPadding, setBottomPadding] = useState<boolean>(false);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const inputRef = useRef(null);
    const [selected, setSelected] = useState(-1);
    const [startPos, setStartPos] = useState<number[]>();
    const t = useTranslations("memeGenerator");
    let imageWidth = 700;
    if (typeof window !== "undefined") {
        imageWidth = Math.min(window.innerWidth - 20, imageWidth);
    }
    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImageURL(URL.createObjectURL(file));
    };

    const handleMouseDown = (
        e: MouseEvent<HTMLDivElement> | TouchEvent<HTMLDivElement>
    ) => {
        e.preventDefault();
        const rect = e.currentTarget.getBoundingClientRect();
        const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
        const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
        const x = clientX - rect.left;
        const y = clientY - rect.top;

        const ctx = canvasRef.current?.getContext("2d");
        if (!ctx) return;
        for (let i = 0; i < textElements.length; i++) {
            if (isClicked(x, y, textElements[i], ctx)) {
                setSelected(i);
                setStartPos([x, y]);
            }
        }
    };

    const handleMouseUp = (
        e: MouseEvent<HTMLDivElement> | TouchEvent<HTMLDivElement>
    ) => {
        e.preventDefault();
        setSelected(-1);
    };

    const handleMouseMove = (
        e: MouseEvent<HTMLDivElement> | TouchEvent<HTMLDivElement>
    ) => {
        e.preventDefault();
        if (selected < 0) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
        const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        const dx = x - startPos![0];
        const dy = y - startPos![1];
        const ctx = canvasRef?.current?.getContext("2d");
        const [, , w, h] = rectPos(textElements[selected], ctx!);
        setStartPos([x, y]);
        setTextElements((prev) =>
            prev.map((e, i) => {
                if (i == selected) {
                    let nx = e.x + dx;
                    let ny = e.y + dy;
                    nx = Math.max(
                        PADDING,
                        Math.min(nx, rect.width - w + PADDING)
                    );
                    ny = Math.max(
                        PADDING,
                        Math.min(ny, rect.height - h + PADDING)
                    );
                    return { ...e, x: nx, y: ny };
                }
                return e;
            })
        );
    };

    const download = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.toBlob((blob) => {
            if (!blob) return;
            const link = document.createElement("a");
            link.download =
                textElements.length > 0
                    ? "qasr_el_memez_" +
                      textElements[0].text.replace(" ", "_") +
                      ".png"
                    : "qasr_el_memez.png";
            link.href = URL.createObjectURL(blob);
            link.click();
        }, "image/png");
    };
    useEffect(() => {
        function drawFrame() {
            const canvas = canvasRef.current! as HTMLCanvasElement;
            const ctx = canvas.getContext("2d");
            if (ctx == null) {
                return;
            }
            const image = new Image();
            image.onload = () => {
                canvas.width = imageWidth;
                canvas.height = (canvas.width * image.height) / image.width;
                const padding = 0.2 * canvas.height;
                if (topPadding) {
                    canvas.height += padding;
                }
                if (bottomPadding) {
                    canvas.height += padding;
                }

                ctx.fillStyle = "white";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(
                    image,
                    0,
                    topPadding ? padding : 0,
                    canvas.width,
                    canvas.height - (topPadding ? padding : 0) - (bottomPadding ? padding : 0)
                );

                // draw each text box
                for (let i = 0; i < textElements.length; i++) {
                    const ele = textElements[i];
                    const text = ele.text;
                    if (!text || text.length == 0) {
                        continue;
                    }

                    const [rx, ry, w, h] = rectPos(ele, ctx);
                    // Draw text background
                    ctx.fillStyle = ele.bgColor;
                    ctx.fillRect(rx, ry, w, h);

                    ctx.fillStyle = ele.color;
                    ctx.textAlign = "left";
                    ctx.textBaseline = "top";
                    ctx.strokeStyle = "black";
                    ctx.lineWidth = 2;
                    ctx.strokeText(text, ele.x, ele.y, imageWidth - PADDING);
                    ctx.fillText(text, ele.x, ele.y, imageWidth - PADDING);
                }
            };
            image.crossOrigin = "anonymous";
            image.src = imageURL;
        }
        if (!imageURL) return;
        drawFrame();
        return () => {};
    }, [imageURL, textElements, imageWidth, topPadding, bottomPadding]);

    return (
        <div className="flex flex-wrap justify-center">
            <div
                id="preview"
                className="relative group p-0 border-0 touch-none"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onTouchStart={handleMouseDown}
                onTouchMove={handleMouseMove}
                onTouchEnd={handleMouseUp}
            >
                <canvas
                    id="canvas"
                    ref={canvasRef}
                    className={
                        imageURL == ""
                            ? "w-50 h-50 md:w-[700px] md:h-[700px] bg-secondary"
                            : ""
                    }
                />

                {textElements?.map((t: TextElementType, i) => {
                    const canvas = canvasRef.current;
                    const ctx = canvas?.getContext("2d");
                    if (ctx == null) {
                        return;
                    }
                    const [rx, ry, w, h] = rectPos(t, ctx);
                    return (
                        <MemeTextBorder
                            key={i}
                            x={rx}
                            y={ry}
                            w={Math.min(w, imageWidth)}
                            h={h}
                        />
                    );
                })}
            </div>
            <Card className="flex flex-col p-4 gap-2">
                <Label htmlFor="image" className="">
                    {t("image")}
                </Label>
                <Input
                    type="file"
                    accept="image/*"
                    id="image"
                    ref={inputRef}
                    onChange={handleImageChange}
                />
                <div className="flex flex-col gap-2 p-2">
                    <div className="flex gap-1 items-center">
                        <Checkbox
                            id="top-padding"
                            checked={topPadding}
                            onCheckedChange={(checked: CheckedState) => {
                                setTopPadding(Boolean(checked));
                            }}
                        />
                        <Label htmlFor="top-padding">{t("top-padding")}</Label>
                    </div>
                    <div className="flex gap-1 items-center">
                        <Checkbox
                            id="bottom-padding"
                            checked={bottomPadding}
                            onCheckedChange={(checked: CheckedState) => {
                                setBottomPadding(Boolean(checked));
                            }}
                        />
                        <Label htmlFor="bottom-padding">
                            {t("bottom-padding")}
                        </Label>
                    </div>
                </div>
                <Button
                    variant="secondary"
                    onClick={() => {
                        setTextElements((prev) => [
                            ...prev,
                            {
                                ...defaultText,
                            },
                        ]);
                    }}
                >
                    {t("add-text")}
                    <Plus />
                </Button>
                {textElements.map((txt, i) => {
                    return (
                        <div key={i} className="flex gap-1">
                            <Input
                                className=""
                                placeholder={t("text-placeholder")}
                                type="text"
                                value={txt?.text ?? ""}
                                onChange={(e) => {
                                    const newText = {
                                        ...txt,
                                        text: e.target.value,
                                    };
                                    setTextElements((prev) =>
                                        prev.map((ele, j) => {
                                            if (i == j) {
                                                return newText;
                                            }
                                            return ele;
                                        })
                                    );
                                }}
                            />
                            <Input
                                type="range"
                                min={0}
                                max={60}
                                className="w-24"
                                value={txt.fontSize}
                                onChange={(e) => {
                                    const newText = {
                                        ...txt,
                                        fontSize: Number(e.target.value),
                                    };
                                    setTextElements((prev) =>
                                        prev.map((ele, j) => {
                                            if (i == j) {
                                                return newText;
                                            }
                                            return ele;
                                        })
                                    );
                                }}
                            />
                            <PopoverColorPicker
                                color={txt.color}
                                setColor={(color) => {
                                    const newText = {
                                        ...txt,
                                        color: color,
                                    };
                                    setTextElements((prev) =>
                                        prev.map((ele, j) => {
                                            if (i == j) {
                                                return newText;
                                            }
                                            return ele;
                                        })
                                    );
                                }}
                            />
                            <PopoverColorPicker
                                color={txt.bgColor}
                                setColor={(color) => {
                                    const newText = {
                                        ...txt,
                                        bgColor: color,
                                    };
                                    setTextElements((prev) =>
                                        prev.map((ele, j) => {
                                            if (i == j) {
                                                return newText;
                                            }
                                            return ele;
                                        })
                                    );
                                }}
                            />
                        </div>
                    );
                })}
                <Button onClick={download}>
                    {t("download")} <Download />
                </Button>
            </Card>
        </div>
    );
}
