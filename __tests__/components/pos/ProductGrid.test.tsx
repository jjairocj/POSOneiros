import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import ProductGrid from '../../../app/pos/components/Catalog/ProductGrid';

const mockGetProducts = vi.fn();
const mockGetCategories = vi.fn();

vi.mock('../../../app/actions/product', () => ({ getProducts: (...a: any[]) => mockGetProducts(...a) }));
vi.mock('../../../app/actions/category', () => ({ getCategories: (...a: any[]) => mockGetCategories(...a) }));
vi.mock('../../../app/pos/components/Catalog/ProductCard', () => ({
    default: ({ product }: any) => <div data-testid="product-card">{product.name}</div>,
}));

const PRODUCT_A = { id: 'p1', name: 'Buldak Ramen', price: 20000 };
const PRODUCT_B = { id: 'p2', name: 'Agua 500 ml', price: 2000 };

beforeEach(() => {
    vi.clearAllMocks();
    mockGetCategories.mockResolvedValue([]);
});

describe('ProductGrid', () => {
    it('loads favorites first, falling back to "all" when there are none', async () => {
        mockGetProducts.mockResolvedValueOnce([]).mockResolvedValueOnce([PRODUCT_A]);
        render(<ProductGrid />);
        await waitFor(() => expect(screen.getByText('Buldak Ramen')).toBeInTheDocument());
        expect(mockGetProducts).toHaveBeenNthCalledWith(1, 'favorites');
        expect(mockGetProducts).toHaveBeenNthCalledWith(2, 'all');
    });

    it('keeps showing the last loaded products and shows an offline notice when a category switch fails to reach the server', async () => {
        mockGetProducts.mockResolvedValueOnce([PRODUCT_A]);
        render(<ProductGrid />);
        await waitFor(() => expect(screen.getByText('Buldak Ramen')).toBeInTheDocument());

        mockGetProducts.mockRejectedValueOnce(new Error('Failed to fetch'));
        fireEvent.click(screen.getByText('Todos'));

        await waitFor(() => expect(screen.getByText(/sin conexión/i)).toBeInTheDocument());
        // The previously loaded product is still visible — not wiped out.
        expect(screen.getByText('Buldak Ramen')).toBeInTheDocument();
    });

    it('clears the offline notice and refreshes once a normal fetch succeeds again', async () => {
        mockGetProducts.mockResolvedValueOnce([PRODUCT_A]);
        render(<ProductGrid />);
        await waitFor(() => expect(screen.getByText('Buldak Ramen')).toBeInTheDocument());

        mockGetProducts.mockRejectedValueOnce(new Error('Failed to fetch'));
        fireEvent.click(screen.getByText('Todos'));
        await waitFor(() => expect(screen.getByText(/sin conexión/i)).toBeInTheDocument());

        mockGetProducts.mockResolvedValueOnce([PRODUCT_B]);
        fireEvent.click(screen.getByText('Todos'));
        await waitFor(() => expect(screen.queryByText(/sin conexión/i)).not.toBeInTheDocument());
        expect(screen.getByText('Agua 500 ml')).toBeInTheDocument();
    });

    it('auto-retries the current view when the browser fires an "online" event while offline', async () => {
        mockGetProducts.mockResolvedValueOnce([PRODUCT_A]);
        render(<ProductGrid />);
        await waitFor(() => expect(screen.getByText('Buldak Ramen')).toBeInTheDocument());

        mockGetProducts.mockRejectedValueOnce(new Error('Failed to fetch'));
        fireEvent.click(screen.getByText('Todos'));
        await waitFor(() => expect(screen.getByText(/sin conexión/i)).toBeInTheDocument());

        mockGetProducts.mockResolvedValueOnce([PRODUCT_B]);
        await act(async () => { window.dispatchEvent(new Event('online')); });
        await waitFor(() => expect(screen.queryByText(/sin conexión/i)).not.toBeInTheDocument());
        expect(screen.getByText('Agua 500 ml')).toBeInTheDocument();
    });
});
