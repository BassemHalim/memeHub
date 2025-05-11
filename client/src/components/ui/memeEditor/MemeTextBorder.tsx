import { memo } from "react";

export type MemeTextBorderProps = {
    x?: number;
    y?: number;
    w?: number;
    h?: number;
};

const MemeTextBorder = memo(({
    x = 0,
    y = 0,
    w = 0,
    h = 0,
}: MemeTextBorderProps) => {
    return (
        <div
            className={`absolute hidden group-hover:block z-10 border-4 border-dashed border-amber-500`}
            style={{
                width: w,
                height: h,
                top: y,
                left: x,
            }}
        ></div>
    );
});

export default MemeTextBorder;
