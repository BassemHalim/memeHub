import { PopoverTrigger } from "@radix-ui/react-popover";
import { HexAlphaColorPicker } from "react-colorful";
import { Popover, PopoverContent } from "../popover";

interface PopoverColorPickerProps {
    color: string;
    setColor: (color: string) => void;
}
export default function PopoverColorPicker({
    color,
    setColor,
}: PopoverColorPickerProps) {
    return (
        <Popover>
            <PopoverTrigger>
                <div className=" border-2 w-9 h-9 border-secondary rounded-md flex justify-center items-center">
                    <div
                        className="w-4 h-4 rounded-sm "
                        style={{ backgroundColor: color }}
                    ></div>
                </div>
            </PopoverTrigger>
            <PopoverContent className="w-60">
                <HexAlphaColorPicker
                    className="mx-auto"
                    color={color}
                    onChange={setColor}
                />
            </PopoverContent>
        </Popover>
    );
}
