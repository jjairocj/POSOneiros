import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProductForm } from '../../../app/admin/inventory/components/product-form';

// jsdom has no ResizeObserver; Radix's Dialog/Select internals expect one.
(globalThis as any).ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
};

// Radix's Tabs.Trigger activates on the mouse-down → up → click sequence, not
// a bare click event — jsdom needs the full sequence fired explicitly.
function clickTab(el: HTMLElement) {
    fireEvent.pointerDown(el);
    fireEvent.mouseDown(el);
    fireEvent.mouseUp(el);
    fireEvent.click(el);
}

const mockCreateProduct = vi.fn();
const mockUpdateProduct = vi.fn();
vi.mock('../../../app/actions/product', () => ({
    createProduct: (...a: any[]) => mockCreateProduct(...a),
    updateProduct: (...a: any[]) => mockUpdateProduct(...a),
    getProductFamilies: () => Promise.resolve([]),
}));
vi.mock('../../../app/actions/category', () => ({ getCategories: () => Promise.resolve([]) }));
vi.mock('../../../app/actions/lots', () => ({ getRawMaterials: () => Promise.resolve([]) }));
vi.mock('../../../app/actions/upload', () => ({ uploadProductImageAction: vi.fn() }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const PRODUCT = {
    id: 'p1', code: 'CHC-001', name: 'Chocoramo', price: 2200, cost: 1200, stock: 40,
    trackingMode: 'SIMPLE', isActive: true, isFavorite: false,
};

beforeEach(() => vi.clearAllMocks());

describe('ProductForm — tabs keep every field mounted for a single submit', () => {
    it('creating: switching to the Imagen tab and back still submits the Básico fields', async () => {
        mockCreateProduct.mockResolvedValue({ success: true });
        render(<ProductForm />);
        fireEvent.click(screen.getByRole('button', { name: /nuevo producto/i }));

        fireEvent.change(screen.getByPlaceholderText('Ej: CHC-001'), { target: { value: 'AGU-001' } });
        fireEvent.change(screen.getByPlaceholderText('Ej: Chocoramo'), { target: { value: 'Agua 600ml' } });

        // Switch away to another tab and back — Básico's inputs must stay mounted (forceMount).
        clickTab(screen.getByRole('tab', { name: /imagen/i }));
        clickTab(screen.getByRole('tab', { name: /básico/i }));
        expect(screen.getByPlaceholderText('Ej: CHC-001')).toHaveValue('AGU-001');

        fireEvent.click(screen.getByRole('button', { name: /crear producto/i }));

        await waitFor(() => expect(mockCreateProduct).toHaveBeenCalled());
        const submitted = mockCreateProduct.mock.calls[0][0] as FormData;
        expect(submitted.get('code')).toBe('AGU-001');
        expect(submitted.get('name')).toBe('Agua 600ml');
    });

    it('creating: shows an editable "Stock inicial" field defaulting to 0', async () => {
        render(<ProductForm />);
        fireEvent.click(screen.getByRole('button', { name: /nuevo producto/i }));
        clickTab(screen.getByRole('tab', { name: /inventario/i }));
        expect(screen.getByText('Stock inicial')).toBeInTheDocument();
        const stockInput = document.querySelector('input[name="stock"]') as HTMLInputElement;
        expect(stockInput).toHaveValue(0);
    });
});

describe('ProductForm — editing an existing product', () => {
    it('shows stock read-only with an "Ajustar inventario" button instead of an editable field', async () => {
        render(<ProductForm product={PRODUCT as any} trigger={<button>Editar</button>} />);
        fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
        clickTab(screen.getByRole('tab', { name: /inventario/i }));

        expect(screen.getByText('Inventario actual')).toBeInTheDocument();
        expect(screen.getByText('40')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /ajustar inventario/i })).toBeInTheDocument();
        expect(document.querySelector('input[name="stock"]')).toBeNull();
    });

    it('opens StockMovementModal on "Ajustar inventario" instead of editing stock inline', async () => {
        render(<ProductForm product={PRODUCT as any} trigger={<button>Editar</button>} />);
        fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
        clickTab(screen.getByRole('tab', { name: /inventario/i }));
        fireEvent.click(screen.getByRole('button', { name: /ajustar inventario/i }));
        expect(await screen.findByText('Movimiento de inventario')).toBeInTheDocument();
    });
});
