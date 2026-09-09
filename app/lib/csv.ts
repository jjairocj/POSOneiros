/** Minimal CSV writer tuned for Excel in Spanish locales (UTF-8 BOM, ';' separator). */
export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
    const esc = (v: string | number | null | undefined) => {
        if (v === null || v === undefined) return "";
        const s = typeof v === "number" ? String(v) : v;
        return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [headers.map(esc).join(";"), ...rows.map((r) => r.map(esc).join(";"))];
    return "﻿" + lines.join("\r\n");
}

export function csvResponse(fileName: string, csv: string): Response {
    return new Response(csv, {
        headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="${fileName}"`,
            "Cache-Control": "no-store",
        },
    });
}
