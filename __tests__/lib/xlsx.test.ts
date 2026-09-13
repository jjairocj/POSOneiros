import { describe, it, expect } from 'vitest';
import ExcelJS from 'exceljs';
import { buildXlsx } from '../../app/lib/xlsx';

describe('buildXlsx', () => {
    it('produces a workbook with the given sheet name, headers, and row values', async () => {
        const buffer = await buildXlsx('Ranking', ['Producto', 'Cantidad', 'Ingresos$'], [
            ['Buldak Ramen', 3, 60000],
            ['Agua 500 ml', 5, 10000],
        ]);
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer as any);
        const sheet = workbook.getWorksheet('Ranking');
        expect(sheet).toBeDefined();
        expect(sheet!.getRow(1).getCell(1).value).toBe('Producto');
        // "$"-suffixed header is stripped from the displayed column title.
        expect(sheet!.getRow(1).getCell(3).value).toBe('Ingresos');
        expect(sheet!.getRow(2).getCell(1).value).toBe('Buldak Ramen');
        expect(sheet!.getRow(2).getCell(3).value).toBe(60000);
    });

    it('applies a currency number format only to "$"-suffixed columns', async () => {
        const buffer = await buildXlsx('Sheet', ['Nombre', 'Total$'], [['A', 1000]]);
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer as any);
        const sheet = workbook.getWorksheet('Sheet')!;
        expect(sheet.getRow(2).getCell(2).numFmt).toBe('"$"#,##0');
        expect(sheet.getRow(2).getCell(1).numFmt).toBeUndefined();
    });

    it('bolds the header row with a fill color', async () => {
        const buffer = await buildXlsx('Sheet', ['A'], [['x']]);
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer as any);
        const header = workbook.getWorksheet('Sheet')!.getRow(1);
        expect(header.font?.bold).toBe(true);
        expect(header.fill).toBeDefined();
    });

    it('handles an empty row set without throwing', async () => {
        const buffer = await buildXlsx('Empty', ['A', 'B'], []);
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer as any);
        expect(workbook.getWorksheet('Empty')).toBeDefined();
    });
});
