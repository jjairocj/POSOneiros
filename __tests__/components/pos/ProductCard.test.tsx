import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ProductCard from '../../../app/pos/components/Catalog/ProductCard';

const mockAddItem = vi.fn();
vi.mock('../../../app/store/useCartStore', () => ({
    useCartStore: (selector: any) => selector({ addItem: mockAddItem }),
}));

const mockToggleFavorite = vi.fn();
vi.mock('../../../app/actions/product', () => ({
    toggleProductFavorite: (...a: any[]) => mockToggleFavorite(...a),
}));

const BASE_PRODUCT = {
    id: 'p1', name: 'Café Especial', price: 3500, stock: 10,
    isFavorite: false, imageUrl: null, categoryId: null,
    taxIva: 0, taxIca: 0, taxImpoConsumo: 0,
};

beforeEach(() => vi.clearAllMocks());

describe('ProductCard', () => {
    it('renders the product name and price', () => {
        render(<ProductCard product={BASE_PRODUCT} />);
        expect(screen.getByText('Café Especial')).toBeInTheDocument();
        expect(screen.getByText(/3[.,]500/)).toBeInTheDocument();
    });

    it('calls addItem when clicked and product is in stock', () => {
        render(<ProductCard product={BASE_PRODUCT} />);
        fireEvent.click(screen.getByText('Café Especial'));
        expect(mockAddItem).toHaveBeenCalledWith(BASE_PRODUCT);
    });

    it('does not call addItem when product is out of stock', () => {
        render(<ProductCard product={{ ...BASE_PRODUCT, stock: 0 }} />);
        fireEvent.click(screen.getByText('Café Especial'));
        expect(mockAddItem).not.toHaveBeenCalled();
    });

    it('shows "Agotado" badge when stock is 0', () => {
        render(<ProductCard product={{ ...BASE_PRODUCT, stock: 0 }} />);
        expect(screen.getByText(/agotado/i)).toBeInTheDocument();
    });

    it('calls toggleProductFavorite when the star button is clicked', async () => {
        mockToggleFavorite.mockResolvedValue({});
        render(<ProductCard product={BASE_PRODUCT} />);
        const starBtn = screen.getByRole('button');
        fireEvent.click(starBtn);
        await waitFor(() => expect(mockToggleFavorite).toHaveBeenCalledWith('p1', true));
    });

    it('shows product image when imageUrl is provided', () => {
        render(<ProductCard product={{ ...BASE_PRODUCT, imageUrl: 'https://example.com/img.jpg' }} />);
        expect(screen.getByRole('img')).toHaveAttribute('src', 'https://example.com/img.jpg');
    });
});
