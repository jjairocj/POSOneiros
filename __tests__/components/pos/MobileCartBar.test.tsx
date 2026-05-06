import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MobileCartBar from '../../../app/pos/components/MobileCartBar';

const mockUseCartStore = vi.fn();
vi.mock('../../../app/store/useCartStore', () => ({
    useCartStore: (selector: any) => mockUseCartStore(selector),
}));

vi.mock('../../../app/pos/components/Catalog/CartDrawer', () => ({
    default: () => <div data-testid="cart-drawer" />,
}));

function setupStore(itemCount = 0, total = 0) {
    const items = itemCount > 0
        ? [{ id: 'p1', name: 'Café', price: total, quantity: itemCount, taxIva: 0, taxIca: 0, taxImpoConsumo: 0 }]
        : [];
    const storeState = { orders: { default: { items, total } }, activeOrderId: 'default' };
    mockUseCartStore.mockImplementation((selector?: any) =>
        typeof selector === 'function' ? selector(storeState) : storeState
    );
}

beforeEach(() => vi.clearAllMocks());

describe('MobileCartBar', () => {
    it('shows "Ver carrito" when cart is empty', () => {
        setupStore(0, 0);
        render(<MobileCartBar />);
        expect(screen.getByText('Ver carrito')).toBeInTheDocument();
    });

    it('shows item count when cart has items', () => {
        setupStore(3, 9000);
        render(<MobileCartBar />);
        expect(screen.getByText(/3 ítems/)).toBeInTheDocument();
    });

    it('displays the cart total', () => {
        setupStore(1, 3500);
        render(<MobileCartBar />);
        expect(screen.getByText(/3.500|3,500/)).toBeInTheDocument();
    });

    it('shows item count badge when cart has items', () => {
        setupStore(2, 7000);
        render(<MobileCartBar />);
        expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('opens the cart drawer when the bar is clicked', () => {
        setupStore(1, 3500);
        render(<MobileCartBar />);
        fireEvent.click(screen.getByRole('button'));
        expect(screen.getByTestId('cart-drawer')).toBeInTheDocument();
    });
});
