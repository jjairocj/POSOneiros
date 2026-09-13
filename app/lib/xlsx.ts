import ExcelJS from "exceljs";

/**
 * Builds a single-sheet, styled .xlsx workbook: bold header row with a fill
 * color, auto-sized columns, and a currency number format on any column
 * whose header ends in "$" (stripped from the displayed header). Used by the
 * report exports that need real formatting — plain CSV (see app/lib/csv.ts)
 * is still the default everywhere a data dump is enough.
 */
export async function buildXlsx(sheetName: string, headers: string[], rows: (string | number | null | undefined)[][]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(sheetName);

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

    for (const row of rows) {
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

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
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
