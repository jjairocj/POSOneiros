"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

export interface MoneyInputProps extends Omit<React.ComponentProps<"input">, "value" | "onChange" | "type"> {
    /** Raw numeric value (COP, no decimals) — not the formatted display string. */
    value: number;
    onChange: (value: number) => void;
    /** When given, also renders a hidden `<input type="number">` with this
     * name carrying the raw value, so this drops into a native `<form>`
     * submit the same way a plain `<Input name="cost" type="number">` did. */
    name?: string;
}

const fmt = (n: number) => (Number.isFinite(n) && n !== 0 ? n.toLocaleString("es-CO") : "");

/**
 * Thousands-separated money input ("$ 50.000" while typing) — masks the
 * visible value so a stray digit reads as a typo immediately instead of
 * turning $50.000 into $500.000 unnoticed. Always emits a plain number via
 * onChange; `name` is only for native form submission (a hidden field),
 * never the visible, comma-formatted one.
 */
const MoneyInput = React.forwardRef<HTMLInputElement, MoneyInputProps>(
    ({ className, value, onChange, name, id, placeholder = "0", ...props }, ref) => {
        const [display, setDisplay] = React.useState(fmt(value));
        const focused = React.useRef(false);

        // Only resync from the external value while the field isn't focused —
        // otherwise a re-render mid-keystroke (e.g. a parent recomputing a
        // derived total) would fight the cursor position.
        React.useEffect(() => {
            if (!focused.current) setDisplay(fmt(value));
        }, [value]);

        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const digits = e.target.value.replace(/\D/g, "");
            const num = digits === "" ? 0 : Number(digits);
            setDisplay(digits === "" ? "" : num.toLocaleString("es-CO"));
            onChange(num);
        };

        return (
            <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none select-none">$</span>
                <input
                    ref={ref}
                    id={id}
                    type="text"
                    inputMode="numeric"
                    value={display}
                    onChange={handleChange}
                    onFocus={(e) => { focused.current = true; props.onFocus?.(e); }}
                    onBlur={(e) => { focused.current = false; setDisplay(fmt(value)); props.onBlur?.(e); }}
                    placeholder={placeholder}
                    className={cn(
                        "flex h-9 w-full rounded-md border border-input bg-transparent pl-7 pr-3 py-1 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
                        className
                    )}
                    {...props}
                />
                {name && <input type="hidden" name={name} value={value} />}
            </div>
        );
    }
);
MoneyInput.displayName = "MoneyInput";

export { MoneyInput };
