import { describe, it, expect } from 'vitest';
import { filterCatalogLocally, type CatalogSnapshot } from '../../app/lib/offlineCatalog';
import type { CatalogProduct } from '../../app/types/cart';

function product(overrides: Partial<CatalogProduct>): CatalogProduct {
    return {
        id: 'p1',
        code: 'COD1',
        name: 'Producto',
        price: 1000,
        taxIva: 0,
        taxIca: 0,
        taxImpoConsumo: 0,
        stock: 10,
        isFavorite: false,
        isActive: true,
        categoryId: null,
        ...overrides,
    };
}

const SNAPSHOT: CatalogSnapshot = {
    categories: [],
    syncedAt: Date.now(),
    products: [
        product({ id: 'p1', code: 'RAMEN', name: 'Buldak Ramen', isFavorite: true, categoryId: 'cat-snacks' }),
        product({ id: 'p2', code: 'AGUA500', name: 'Agua 500 ml', isFavorite: false, categoryId: 'cat-bebidas' }),
        product({ id: 'p3', code: 'AGUA1000', name: 'Agua 1L', isFavorite: false, categoryId: null }),
    ],
};

describe('filterCatalogLocally', () => {
    it('filters by favorites', () => {
        const result = filterCatalogLocally(SNAPSHOT, 'favorites');
        expect(result.map((p) => p.id)).toEqual(['p1']);
    });

    it('returns every product for "all"', () => {
        const result = filterCatalogLocally(SNAPSHOT, 'all');
        expect(result).toHaveLength(3);
    });

    it('filters by category id', () => {
        const result = filterCatalogLocally(SNAPSHOT, 'cat-bebidas');
        expect(result.map((p) => p.id)).toEqual(['p2']);
    });

    it('filters products with no category for "uncategorized"', () => {
        const result = filterCatalogLocally(SNAPSHOT, 'uncategorized');
        expect(result.map((p) => p.id)).toEqual(['p3']);
    });

    it('search matches by name, case-insensitive, ignoring the category filter', () => {
        const result = filterCatalogLocally(SNAPSHOT, 'favorites', 'agua');
        expect(result.map((p) => p.id).sort()).toEqual(['p2', 'p3']);
    });

    it('search matches by product code', () => {
        const result = filterCatalogLocally(SNAPSHOT, 'all', 'ramen');
        expect(result.map((p) => p.id)).toEqual(['p1']);
    });

    it('returns an empty list when nothing matches', () => {
        expect(filterCatalogLocally(SNAPSHOT, 'all', 'no existe')).toEqual([]);
    });
});
