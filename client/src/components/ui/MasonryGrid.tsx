"use client";
import { useEffect, useRef } from "react";

interface MasonryGridProps {
    children: JSX.Element[]; // More specific type for children
    columns?: number;
    gap?: number;
}

export default function MasonryGrid({
    children,
    columns = 4,
    gap = 24,

}: MasonryGridProps) {
    const gridRef = useRef<HTMLDivElement>(null);
    const itemRefs = useRef<Array<HTMLDivElement | null>>([]);

    const getActualColumns = () =>
        window.innerWidth < 640 ? 1 : window.innerWidth < 998 ? 3 :  columns;

    useEffect(() => {
        if (!gridRef.current) return;

        const updateLayout = () => {
            const containerWidth = gridRef.current?.clientWidth ?? 0;
            const actualColumns = getActualColumns();

            const columnHeights = new Array(actualColumns).fill(0);

            // Reset container height
            if (gridRef.current) {
                gridRef.current.style.height = "0px";
            }

            // Position items
            children.forEach((_, index) => {
                const item = itemRefs.current[index];
                if (!item) return;

                // Reset item position to get true height
                item.style.transform = "translate(0, 0)";

                const itemHeight = item.offsetHeight;
                const shortestColumn = columnHeights.indexOf(
                    Math.min(...columnHeights)
                );
                const x = (containerWidth / actualColumns) * shortestColumn;
                const y = columnHeights[shortestColumn];

                item.style.transform = `translate(${x}px, ${y}px)`;
                columnHeights[shortestColumn] += itemHeight + gap;
            });

            // Set final container height
            if (gridRef.current) {
                const maxHeight = Math.max(...columnHeights);
                gridRef.current.style.height = `${maxHeight}px`;
            }
        };

        const resizeObserver = new ResizeObserver(updateLayout);
        resizeObserver.observe(gridRef.current);

        // Initial layout
        updateLayout();

        return () => resizeObserver.disconnect();
    }, [children, columns, gap]);

    const actualColumns = getActualColumns();

    return (
        <div ref={gridRef} className="relative w-full min-h-[200px]">
            {children.map((child, i) => (
                <div
                    key={i}
                    ref={(el) => {
                        itemRefs.current[i] = el;
                    }}
                    className="absolute transition-transform duration-300 ease-in-out"
                    style={{
                        width: `calc(100% / ${actualColumns})`,
                        padding: `0 ${gap / 2}px`,
                    }}
                >
                    {child}
                </div>
            ))}
        </div>
    );
}
