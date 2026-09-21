import ExcelJS from "exceljs";

/**
 * A string cell starting with =, +, -, @, or a tab/CR is interpreted by
 * Excel as a formula when the file opens — a classic CSV/XLSX "formula
 * injection" (CWE-1236). Our rows can carry user-entered text (a product or
 * promotion name), so every string value is escaped by prefixing a literal
 * `'` before it reaches the sheet: Excel then displays it as plain text
 * (the leading quote itself isn't shown) instead of evaluating it.
 */
function escapeFormula(value: string | number | null | undefined): string | number | null | undefined {
    if (typeof value !== "string") return value;
    return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

export interface SheetSpec {
    name: string;
    /** A header ending in "$" is a money column (currency format, "$" stripped from the title). */
    headers: string[];
    rows: (string | number | null | undefined)[][];
}

function addStyledSheet(workbook: ExcelJS.Workbook, spec: SheetSpec) {
    const { name, headers, rows } = spec;
    const sheet = workbook.addWorksheet(name);

    const isMoneyCol = headers.map((h) => h.endsWith("$"));
    const cleanHeaders = headers.map((h, i) => (isMoneyCol[i] ? h.slice(0, -1).trim() : h));

    sheet.columns = cleanHeaders.map((header, i) => ({
        header,
        key: `c${i}`,
        width: Math.max(12, header.length + 2),
    }));

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F46E5" } };
    headerRow.alignment = { vertical: "middle" };

    for (const rawRow of rows) {
        const row = rawRow.map(escapeFormula);
        const added = sheet.addRow(row);
        row.forEach((value, i) => {
            if (isMoneyCol[i] && typeof value === "number") {
                added.getCell(i + 1).numFmt = '"$"#,##0';
            }
            // Widen the column to fit this value, capped so one long outlier
            // doesn't blow out the whole sheet.
            const col = sheet.getColumn(i + 1);
            const len = String(value ?? "").length + 2;
            if (len > (col.width ?? 0)) col.width = Math.min(len, 40);
        });
    }

    sheet.views = [{ state: "frozen", ySplit: 1 }];
}

/**
 * Builds a styled .xlsx workbook: per sheet a bold header row with a fill
 * color, auto-sized columns, and a currency number format on any column
 * whose header ends in "$". Used by the report/shift exports that need real
 * formatting — plain CSV (see app/lib/csv.ts) is still the default
 * everywhere a data dump is enough.
 */
export async function buildWorkbook(sheets: SheetSpec[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    for (const spec of sheets) addStyledSheet(workbook, spec);
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
}

/** Single-sheet convenience wrapper around {@link buildWorkbook}. */
export async function buildXlsx(sheetName: string, headers: string[], rows: (string | number | null | undefined)[][]): Promise<Buffer> {
    return buildWorkbook([{ name: sheetName, headers, rows }]);
}

export function xlsxResponse(fileName: string, buffer: Buffer): Response {
    return new Response(new Uint8Array(buffer), {
        headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": `attachment; filename="${fileName}"`,
            "Cache-Control": "no-store",
        },
    });
}
