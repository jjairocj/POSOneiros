"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

export interface ComboboxOption {
    value: string;
    label: string;
}

interface ComboboxProps {
    id?: string;
    name: string;
    options: ComboboxOption[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    /** Prepends a pinned option (e.g. "Sin categoría" → value "none") above the search results. */
    emptyOption?: { value: string; label: string };
    className?: string;
}

/** Type-to-filter select: looks like a text input, submits the picked option's
 * `value` via a hidden field — a real <select> can't be searched by typing,
 * which gets painful once a list (categorías, insumos…) grows past a handful. */
export function Combobox({ id, name, options, value, onChange, placeholder = "Buscar...", emptyOption, className }: ComboboxProps) {
    const allOptions = emptyOption ? [emptyOption, ...options] : options;
    const selected = allOptions.find((o) => o.value === value);
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [highlight, setHighlight] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) setQuery("");
    }, [open]);

    useEffect(() => {
        function onDocClick(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
        }
        document.addEventListener("mousedown", onDocClick);
        return () => document.removeEventListener("mousedown", onDocClick);
    }, []);

    useEffect(() => {
        if (open) listRef.current?.querySelector(`[data-idx="${highlight}"]`)?.scrollIntoView({ block: "nearest" });
    }, [highlight, open]);

    const filtered = query.trim()
        ? allOptions.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase()))
        : allOptions;

    const commit = (v: string) => {
        onChange(v);
        setOpen(false);
        setQuery("");
        inputRef.current?.blur();
    };

    return (
        <div ref={containerRef} className={`relative ${className ?? ""}`}>
            <input type="hidden" name={name} value={value} />
            <div
                className="w-full h-12 rounded-xl bg-muted/50 border border-border px-3 text-sm flex items-center gap-2 cursor-text transition-colors focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary/40"
                onClick={() => { setOpen(true); inputRef.current?.focus(); }}
            >
                <input
                    ref={inputRef}
                    id={id}
                    type="text"
                    role="combobox"
                    aria-expanded={open}
                    value={open ? query : (selected?.label ?? "")}
                    onChange={(e) => { setQuery(e.target.value); setOpen(true); setHighlight(0); }}
                    onFocus={() => setOpen(true)}
                    onKeyDown={(e) => {
                        if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setHighlight((h) => Math.min(h + 1, filtered.length - 1)); }
                        else if (e.key === "ArrowUp") { e.preventDefault(); setHighlight((h) => Math.max(h - 1, 0)); }
                        else if (e.key === "Enter") { e.preventDefault(); if (filtered[highlight]) commit(filtered[highlight].value); }
                        else if (e.key === "Escape") { setOpen(false); }
                    }}
                    placeholder={placeholder}
                    className="flex-1 min-w-0 bg-transparent outline-none placeholder:text-muted-foreground"
                    autoComplete="off"
                />
                <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
            </div>
            {open && (
                <div ref={listRef} className="absolute z-50 mt-1.5 w-full max-h-56 overflow-y-auto rounded-xl border border-border bg-popover shadow-2xl py-1.5 animate-in fade-in zoom-in-95 duration-150">
                    {filtered.length === 0 ? (
                        <p className="px-3 py-2.5 text-sm text-muted-foreground">Sin resultados.</p>
                    ) : filtered.map((o, i) => (
                        <button
                            type="button"
                            key={o.value}
                            data-idx={i}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => commit(o.value)}
                            onMouseEnter={() => setHighlight(i)}
                            className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 text-sm text-left transition-colors ${i === highlight ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}
                        >
                            <span className={o.value === value ? "font-semibold" : ""}>{o.label}</span>
                            {o.value === value && <Check className="w-3.5 h-3.5 shrink-0" />}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
