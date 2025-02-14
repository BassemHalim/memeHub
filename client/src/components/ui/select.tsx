"use client";
import { cn } from "@/components/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { useState } from "react";

export function Select({
    options: initialOptions,
    value,
    onChange,
}: {
    options: string[];
    value: string;
    onChange: (value: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const [customOptions, setCustomOptions] = useState<string[]>([]);
    const [searchValue, setSearchValue] = useState("");

    const allOptions = Array.from(
        new Set([...initialOptions, ...customOptions])
    );

    const handleAddOption = () => {
        if (searchValue.trim() && !allOptions.includes(searchValue)) {
            setCustomOptions((prev) => [...prev, searchValue]);
            onChange(searchValue);
            setOpen(false);
        }
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-[200px] justify-between"
                >
                    {value || "Select or create..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0">
                <Command>
                    <CommandInput
                        placeholder="Search or create..."
                        value={searchValue}
                        onValueChange={setSearchValue}
                        onKeyDown={(e) =>
                            e.key === "Enter" && handleAddOption()
                        }
                    />
                    <CommandEmpty>
                        <button
                            type="button"
                            onClick={handleAddOption}
                            className="w-full text-left px-2 py-1.5 text-sm hover:bg-accent"
                        >
                            Create "{searchValue}"
                        </button>
                    </CommandEmpty>
                    <CommandGroup className="max-h-48 overflow-y-auto">
                        {allOptions.map((option) => (
                            <CommandItem
                                key={option}
                                value={option}
                                onSelect={() => {
                                    onChange(option);
                                    setOpen(false);
                                }}
                            >
                                <Check
                                    className={cn(
                                        "mr-2 h-4 w-4",
                                        value === option
                                            ? "opacity-100"
                                            : "opacity-0"
                                    )}
                                />
                                {option}
                            </CommandItem>
                        ))}
                    </CommandGroup>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
