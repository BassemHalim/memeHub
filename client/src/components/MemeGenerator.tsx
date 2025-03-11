import { Button } from "@/components/ui/button";
import { MouseEventHandler, useEffect, useRef, useState } from "react";

type TextElementType = {
    text: string;
    x: number;
    y: number;
    w: number;
    h: number;
    fontSize: number;
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
    const x = e.x - PADDING,
        y = e.y - PADDING;
    const fontSize = e.fontSize;
    ctx.font = `bold ${fontSize}px Arial`;
    const w = ctx.measureText(e.text).width + 2 * PADDING;
    const h = fontSize + 2 * PADDING;
    return [x, y, w, h];
    // Draw text background
}
export default function MemeGenerator() {
    const [imageURL, setImageURL] = useState("https://placehold.co/500x500");
    const [textElements, setTextElements] = useState<TextElementType[]>([
        {
            text: "",
            x: 100,
            y: 100,
            w: 0,
            h: 0,
            fontSize: 24,
        },
    ]);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const inputRef = useRef(null);
    const [selected, setSelected] = useState(-1);
    const [startPos, setStartPos] = useState<number[]>();

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event: ProgressEvent<FileReader>) => {
            setImageURL(event.target?.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleMouseDown: MouseEventHandler<HTMLCanvasElement> = (e) => {
        e.preventDefault();
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const ctx = canvasRef.current?.getContext("2d");
        if (!ctx) return;
        for (let i = 0; i < textElements.length; i++) {
            if (isClicked(x, y, textElements[i], ctx)) {
                setSelected(i);
                setStartPos([x, y]);
            }
        }
    };

    const handleMouseUp: MouseEventHandler<HTMLCanvasElement> = (e) => {
        e.preventDefault();
        setSelected(-1);
    };

    const handleMouseMove: MouseEventHandler<HTMLCanvasElement> = (e) => {
        if (selected < 0) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const dx = x - startPos![0];
        const dy = y - startPos![1];
        setStartPos([x, y]);
        setTextElements((prev) =>
            prev.map((e, i) => {
                if (i == selected) {
                    return { ...e, x: e.x + dx, y: e.y + dy };
                }
                return e;
            })
        );
    };
    function drawText(
        ctx: CanvasRenderingContext2D,
        e: TextElementType | undefined
    ) {
        if (!e) return;
        const text = e?.text;
        if (!text || text.length == 0) {
            return;
        }
        const [rx, ry, w, h] = rectPos(e, ctx);
        // Draw text background
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)"; // Semi-transparent black background
        ctx.fillRect(rx, ry, w, h); // Adjust width based on text length

        // Draw text
        ctx.fillStyle = "white";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText(text, e.x, e.y); // Adjusted y-coordinate for better visibility
    }
    useEffect(() => {
        if (!imageURL) return;

        const canvas = canvasRef.current! as HTMLCanvasElement;
        const ctx = canvas.getContext("2d");
        if (ctx == null) {
            return;
        }
        const image = new Image();
        image.onload = () => {
            canvas.width = 700;
            canvas.height = (700 * image.height) / image.width;
            ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
            textElements.forEach((text) => drawText(ctx, text));
        };
        image.src = imageURL;
    }, [imageURL, textElements]);

    return (
        <div>
            <input
                type="file"
                id="image"
                ref={inputRef}
                onChange={handleImageChange}
            />
            <Button
                onClick={() => {
                    setTextElements((prev) => [
                        ...prev,
                        {
                            text: "",
                            x: 100,
                            y: 100,
                            w: 0,
                            h: 0,
                            fontSize: 24,
                        },
                    ]);
                }}
            >
                Add text box
            </Button>
            {textElements.map((t, i) => {
                return (
                    <input
                        key={i}
                        className="text-black"
                        type="text"
                        value={t?.text ?? ""}
                        onChange={(e) => {
                            setTextElements((prev) =>
                                prev.map((t, j) => {
                                    if (i == j) {
                                        return { ...t, text: e.target.value };
                                    }
                                    return t;
                                })
                            );
                        }}
                    />
                );
            })}
            <canvas
                id="canvas"
                ref={canvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
            />
        </div>
    );
}
