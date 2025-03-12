import { Button } from "@/components/ui/button";
import {
    MouseEvent,
    MouseEventHandler,
    useEffect,
    useRef,
    useState,
} from "react";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import MemeTextBorder from "./ui/MemeTextBorder";

type TextElementType = {
    text: string;
    x: number;
    y: number;
    fontSize: number;
    bgColor: string;
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
    ctx.font = `bold ${fontSize}px Arial`;
    const w = ctx.measureText(e.text).width + 2 * PADDING;
    const h = fontSize + 2 * PADDING;

    // Clamp x and y within canvas bounds
    const x = Math.max(0, Math.min(e.x - PADDING, canvas.width - w));
    const y = Math.max(0, Math.min(e.y - PADDING, canvas.height - h));

    return [x, y, w, h];
}

export default function MemeGenerator() {
    const [imageURL, setImageURL] = useState("https://placehold.co/500x500");
    const [textElements, setTextElements] = useState<TextElementType[]>([
        {
            text: "",
            x: 100,
            y: 100,
            fontSize: 24,
            bgColor: "rgba(0, 0, 0, 0.5)",
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

    const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
        e.preventDefault();
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const ctx = canvasRef.current?.getContext("2d");
        if (!ctx) return;
        for (let i = 0; i < textElements.length; i++) {
            if (isClicked(x, y, textElements[i], ctx)) {
                console.log(i);
                setSelected(i);
                setStartPos([x, y]);
            }
        }
    };

    const handleMouseUp: MouseEventHandler<HTMLDivElement> = (e) => {
        e.preventDefault();
        setSelected(-1);
    };

    const handleMouseMove: MouseEventHandler<HTMLDivElement> = (e) => {
        if (selected < 0) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
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
                    console.log("x", nx, rect.width - w + PADDING);
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
        const link = document.createElement("a");
        link.download = "meme.png";
        link.href = canvas.toDataURL();
        link.click();
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
                canvas.width = 700;
                canvas.height = (700 * image.height) / image.width;
                ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

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

                    ctx.fillStyle = "white";
                    ctx.textAlign = "left";
                    ctx.textBaseline = "top";
                    ctx.fillText(text, ele.x, ele.y);
                }
            };
            image.src = imageURL;
        }
        if (!imageURL) return;
        drawFrame();
        return () => {};
    }, [imageURL, textElements]);

    return (
        <div className="flex flex-wrap">
            <div
                id="preview"
                className="relative group p-0 border-0"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
            >
                <canvas id="canvas" ref={canvasRef} />

                {textElements?.map((t: TextElementType, i) => {
                    const canvas = canvasRef.current;
                    const ctx = canvas?.getContext("2d");
                    if (ctx == null) {
                        return;
                    }
                    const [rx, ry, w, h] = rectPos(t, ctx);
                    return <MemeTextBorder key={i} x={rx} y={ry} w={w} h={h} />;
                })}
            </div>
            <Card className="flex flex-col p-4 gap-2">
            <Button onClick={download}>Download</Button>
                <Input
                    type="file"
                    id="image"
                    ref={inputRef}
                    onChange={handleImageChange}
                />
                <Button
                    variant="secondary"
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
                                bgColor: "rgba(0, 0, 0, 1)",
                            },
                        ]);
                    }}
                >
                    Add text box
                </Button>
                {textElements.map((t, i) => {
                    return (
                        <Input
                            placeholder={`Text ${i + 1}`}
                            key={i}
                            type="text"
                            value={t?.text ?? ""}
                            onChange={(e) => {
                                const newText = {
                                    ...t,
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
                    );
                })}
            </Card>
        </div>
    );
}
