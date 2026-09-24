/**
 * @file SplitBillModal.test.tsx
 * @description Focused tests for SplitBillModal's final "Registrar venta" step
 * — the one network call in the whole split-bill flow (each sub-account's own
 * payment collection is purely local via CheckoutModal mode="collect", no
 * server round-trip). Mirrors CheckoutModal.test.tsx's offline-queue coverage:
 * a thrown network error must queue the sale for automatic retry instead of
 * losing every sub-account's already-collected payments.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SplitBillModal from '../app/pos/components/Checkout/SplitBillModal';
import { useSubAccountStore } from '../app/store/useSubAccountStore';
import { useOfflineSalesQueue } from '../app/lib/offlineSalesQueue';

const mockProcessSale = vi.fn();
vi.mock('../app/actions/sale', () => ({ processSale: (...a: any[]) => mockProcessSale(...a) }));
vi.mock('../app/pos/components/Checkout/Receipt', () => ({
    default: () => <div data-testid="receipt" />,
    receiptNumber: () => '1',
}));

const ITEM = { id: 'p1', name: 'Café', price: 15000, quantity: 1, taxIva: 0, taxIca: 0, taxImpoConsumo: 0 };

const PAID_SUB_ACCOUNT = {
    id: 'sub-1',
    label: 'Ana',
    items: [{ ...ITEM }],
    subtotal: 15000,
    taxIva: 0,
    taxIca: 0,
    taxImpoConsumo: 0,
    total: 15000,
    paid: true,
    payments: [{ method: 'CASH' as const, amount: 15000 }],
};

function renderEverythingPaid() {
    useSubAccountStore.setState({
        active: true,
        subAccounts: [PAID_SUB_ACCOUNT],
        pendingItemId: null,
        pendingQty: 1,
        orderItems: [ITEM],
        orderDiscount: null,
    });
    return render(
        <SplitBillModal activeShiftId="shift_1" items={[ITEM]} onClose={vi.fn()} onSuccess={vi.fn()} />
    );
}

beforeEach(() => {
    vi.clearAllMocks();
    useOfflineSalesQueue.setState({ pending: [], needsReview: [], flushing: false });
    localStorage.clear();
});

describe('SplitBillModal — Registrar venta', () => {
    it('registers the sale once every sub-account has paid', async () => {
        mockProcessSale.mockResolvedValue({ ok: true, data: { id: 'sale_1', details: [], payments: [] } });
        renderEverythingPaid();
        fireEvent.click(screen.getByRole('button', { name: /registrar venta/i }));
        await waitFor(() => expect(mockProcessSale).toHaveBeenCalled());
        expect(mockProcessSale.mock.calls[0][0]).toBe('shift_1');
    });

    it('shows the server error message when processSale returns ok:false', async () => {
        mockProcessSale.mockResolvedValue({ ok: false, error: 'El turno no está abierto.' });
        renderEverythingPaid();
        fireEvent.click(screen.getByRole('button', { name: /registrar venta/i }));
        await waitFor(() => expect(screen.getByText('El turno no está abierto.')).toBeInTheDocument());
    });

    it('queues the sale for offline retry instead of losing collected payments when processSale throws', async () => {
        mockProcessSale.mockRejectedValue(new Error('network'));
        renderEverythingPaid();
        fireEvent.click(screen.getByRole('button', { name: /registrar venta/i }));
        await waitFor(() => expect(screen.getByText(/sin conexión/i)).toBeInTheDocument());
        expect(useOfflineSalesQueue.getState().pending).toHaveLength(1);
        const queued = useOfflineSalesQueue.getState().pending[0];
        expect(queued.activeShiftId).toBe('shift_1');
        expect(queued.summary).toEqual({ itemCount: 1, total: 15000 });
        expect(queued.options.subAccounts).toEqual([{ label: 'Ana', items: [{ id: 'p1', quantity: 1 }], amount: 15000 }]);
    });

    it('"Continuar" after a queued offline sale closes the modal and reports success', async () => {
        mockProcessSale.mockRejectedValue(new Error('network'));
        const onClose = vi.fn();
        const onSuccess = vi.fn();
        useSubAccountStore.setState({
            active: true,
            subAccounts: [PAID_SUB_ACCOUNT],
            pendingItemId: null,
            pendingQty: 1,
            orderItems: [ITEM],
            orderDiscount: null,
        });
        render(<SplitBillModal activeShiftId="shift_1" items={[ITEM]} onClose={onClose} onSuccess={onSuccess} />);
        fireEvent.click(screen.getByRole('button', { name: /registrar venta/i }));
        await waitFor(() => expect(screen.getByText(/sin conexión/i)).toBeInTheDocument());
        fireEvent.click(screen.getByRole('button', { name: /continuar/i }));
        expect(onClose).toHaveBeenCalledOnce();
        expect(onSuccess).toHaveBeenCalledOnce();
    });
});
