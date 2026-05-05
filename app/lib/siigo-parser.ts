/**
 * Parses a Siigo "Gestión de productos y servicios" XLSX export.
 *
 * File layout:
 *   Row 0 — report title
 *   Row 1 — company name
 *   Row 2 — NIT
 *   Row 3 — headers: Tipo | Código | Nombre | Unidad | Precios | Impuestos | Stock | Estado
 *   Row 4+ — data rows
 */

export interface SiigoRow {
    code: string;
    name: string;
    price: number;
    taxIva: number;   // extracted from "IVA 19%" → 19
    stock: number;
    isActive: boolean;
}

export interface ParseResult {
    rows: SiigoRow[];
    skipped: number; // rows without Tipo = "Producto"
}

/** Extracts the IVA percentage from a Siigo tax label, e.g. "IVA 19%" → 19 */
function extractIva(raw: unknown): number {
    if (!raw || typeof raw !== "string") return 0;
    const match = raw.match(/IVA\s+(\d+(?:\.\d+)?)%/i);
    return match ? parseFloat(match[1]) : 0;
}

export function parseSiigoRows(rawRows: unknown[][]): ParseResult {
    // Data starts at row index 4 (after 3 metadata rows + 1 header row)
    const dataRows = rawRows.slice(4);

    const rows: SiigoRow[] = [];
    let skipped = 0;

    for (const row of dataRows) {
        const tipo = row[0];
        if (!tipo || String(tipo).trim() !== "Producto") {
            skipped++;
            continue;
        }

        const code = String(row[1] ?? "").trim();
        const name = String(row[2] ?? "").trim();
        const price = typeof row[4] === "number" ? row[4] : parseFloat(String(row[4])) || 0;
        const taxIva = extractIva(row[5]);
        const stock = typeof row[6] === "number" ? row[6] : parseFloat(String(row[6])) || 0;
        const isActive = String(row[7] ?? "").trim() === "Active";

        if (!code || !name) {
            skipped++;
            continue;
        }

        rows.push({ code, name, price, taxIva, stock, isActive });
    }

    return { rows, skipped };
}
