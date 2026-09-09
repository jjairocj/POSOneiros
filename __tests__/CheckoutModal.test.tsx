/**
 * @file CheckoutModal.test.tsx
 * @description Unit tests for the CheckoutModal client component.
 *
 * CheckoutModal manages the payment collection flow for a POS sale. It has two
 * internal stages:
 *
 * PAYMENT STAGE
 * - Accepts cash, card, and transfer amounts independently
 * - Computes `remaining` (still owed) and `change` (overpayment) in real time
 * - "FINALIZAR VENTA" is disabled until totalPaid >= orderTotal
 * - Calls `processSale` on submit and transitions to the success stage
 * - Shows an inline error when `processSale` rejects
 *
 * SUCCESS STAGE (Sprint 1 — climax visual)
 * - Renders the "¡Venta Exitosa!" heading
 * - Shows the change amount only when change > 0
 * - Shows "Pago exacto recibido." when change === 0
 * - "Cerrar" calls onSuccess (which clears the cart in the parent)
 * - "Imprimir Ticket" triggers the print flow
 *
 * `processSale` and the Receipt component are mocked to keep tests fast and
 * focused on CheckoutModal's own behaviour.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CheckoutModal from '../app/pos/components/Checkout/CheckoutModal';

const mockProcessSale = vi.fn();
vi.mock('../app/actions/sale', () => ({ processSale: (...a: any[]) => mockProcessSale(...a) }));

vi.mock('../app/pos/components/Checkout/Receipt', () => ({
    default: () => <div data-testid="receipt" />,
    receiptNumber: () => '1',
}));
vi.mock('../app/actions/customers', () => ({ searchCustomers: vi.fn().mockResolvedValue([]), createCustomer: vi.fn() }));

const DEFAULT_PROPS = {
    activeShiftId: 'shift_1',
    orderTotal: 15000,
    items: [{ id: 'p1', name: 'Café', price: 15000, quantity: 1, taxIva: 0, taxIca: 0, taxImpoConsumo: 0 }],
    onSuccess: vi.fn(),
    onCancel: vi.fn(),
};

function renderModal(overrides: Partial<typeof DEFAULT_PROPS> = {}) {
    const props = { ...DEFAULT_PROPS, ...overrides };
    return render(<CheckoutModal {...props} />);
}

// ─── Payment stage ────────────────────────────────────────────────────────────

describe('CheckoutModal — payment stage', () => {
    beforeEach(() => vi.clearAllMocks());

    it('displays the order total in the header', () => {
        renderModal();
        expect(screen.getByText(/total a cobrar/i)).toBeInTheDocument();
        // The order total appears at least once in the header area
        expect(screen.getAllByText('$15.000').length).toBeGreaterThanOrEqual(1);
    });

    it('"FINALIZAR VENTA" is disabled when no payment has been entered', () => {
        renderModal();
        expect(screen.getByRole('button', { name: /finalizar venta/i })).toBeDisabled();
    });

    it('"FINALIZAR VENTA" is disabled when totalPaid < orderTotal', () => {
        renderModal();
        const cashInput = screen.getAllByPlaceholderText('0')[0];
        fireEvent.change(cashInput, { target: { value: '5000' } });
        expect(screen.getByRole('button', { name: /finalizar venta/i })).toBeDisabled();
    });

    it('"FINALIZAR VENTA" is enabled when totalPaid === orderTotal', () => {
        renderModal();
        const cashInput = screen.getAllByPlaceholderText('0')[0];
        fireEvent.change(cashInput, { target: { value: '15000' } });
        expect(screen.getByRole('button', { name: /finalizar venta/i })).not.toBeDisabled();
    });

    it('"FINALIZAR VENTA" is enabled when totalPaid > orderTotal (overpayment)', () => {
        renderModal();
        const cashInput = screen.getAllByPlaceholderText('0')[0];
        fireEvent.change(cashInput, { target: { value: '20000' } });
        expect(screen.getByRole('button', { name: /finalizar venta/i })).not.toBeDisabled();
    });

    it('shows $0 remaining when cash covers the total', () => {
        renderModal();
        const cashInput = screen.getAllByPlaceholderText('0')[0];
        fireEvent.change(cashInput, { target: { value: '15000' } });
        // The "Restante" label confirms remaining reached zero
        const label = screen.getByText('Restante');
        expect(label.closest('div')).toHaveTextContent('$0');
    });

    it('shows correct change when cash exceeds the total', () => {
        renderModal();
        const cashInput = screen.getAllByPlaceholderText('0')[0];
        fireEvent.change(cashInput, { target: { value: '20000' } });
        // Change = 20000 - 15000 = 5000
        expect(screen.getAllByText('$5.000').length).toBeGreaterThanOrEqual(1);
    });

    it('calls processSale with correct arguments on submit', async () => {
        mockProcessSale.mockResolvedValue({ ok: true, data: { id: 'sale_1', details: [], payments: [] } });
        renderModal();
        const cashInput = screen.getAllByPlaceholderText('0')[0];
        fireEvent.change(cashInput, { target: { value: '15000' } });
        fireEvent.click(screen.getByRole('button', { name: /finalizar venta/i }));

        await waitFor(() =>
            expect(mockProcessSale).toHaveBeenCalledWith(
                'shift_1',
                [{ id: 'p1', quantity: 1, discount: 0 }],
                expect.arrayContaining([expect.objectContaining({ method: 'CASH', amount: 15000 })]),
                expect.objectContaining({ customerId: undefined })
            )
        );
    });

    it('shows the server error message when processSale returns ok:false', async () => {
        mockProcessSale.mockResolvedValue({ ok: false, error: 'Stock insuficiente' });
        renderModal();
        const cashInput = screen.getAllByPlaceholderText('0')[0];
        fireEvent.change(cashInput, { target: { value: '15000' } });
        fireEvent.click(screen.getByRole('button', { name: /finalizar venta/i }));
        await waitFor(() => expect(screen.getByText('Stock insuficiente')).toBeInTheDocument());
    });

    it('shows a connection error when processSale throws', async () => {
        mockProcessSale.mockRejectedValue(new Error('network'));
        renderModal();
        const cashInput = screen.getAllByPlaceholderText('0')[0];
        fireEvent.change(cashInput, { target: { value: '15000' } });
        fireEvent.click(screen.getByRole('button', { name: /finalizar venta/i }));
        await waitFor(() => expect(screen.getByText(/No se pudo conectar/)).toBeInTheDocument());
    });

    it('in "collect" mode records the payments without calling processSale', async () => {
        const onCollect = vi.fn();
        render(<CheckoutModal {...DEFAULT_PROPS} mode="collect" subAccountLabel="Ana" onCollect={onCollect} />);
        const cashInput = screen.getAllByPlaceholderText('0')[0];
        fireEvent.change(cashInput, { target: { value: '20000' } });
        fireEvent.click(screen.getByRole('button', { name: /registrar pago/i }));
        await waitFor(() => expect(screen.getByText('Pago registrado')).toBeInTheDocument());
        expect(mockProcessSale).not.toHaveBeenCalled();
        expect(onCollect).toHaveBeenCalledWith([{ method: 'CASH', amount: 15000, subAccountLabel: 'Ana' }], 5000);
    });
});

// ─── Success stage ────────────────────────────────────────────────────────────

describe('CheckoutModal — success stage (climax visual)', () => {
    async function triggerSuccess(cashAmount: number, orderTotal = 15000) {
        mockProcessSale.mockResolvedValue({ ok: true, data: { id: 'sale_1', details: [], payments: [] } });
        renderModal({ orderTotal });
        const cashInput = screen.getAllByPlaceholderText('0')[0];
        fireEvent.change(cashInput, { target: { value: String(cashAmount) } });
        fireEvent.click(screen.getByRole('button', { name: /finalizar venta/i }));
        await waitFor(() => expect(screen.getByText('¡Venta registrada!')).toBeInTheDocument());
    }

    beforeEach(() => vi.clearAllMocks());

    it('renders the success heading after a completed sale', async () => {
        await triggerSuccess(15000);
        expect(screen.getByText('¡Venta registrada!')).toBeInTheDocument();
    });

    it('shows the change amount when there is an overpayment', async () => {
        await triggerSuccess(20000); // change = 5000
        expect(screen.getAllByText('$5.000').length).toBeGreaterThanOrEqual(1);
    });

    it('shows "Pago exacto recibido." when change is zero', async () => {
        await triggerSuccess(15000); // change = 0
        expect(screen.getByText('Pago exacto recibido.')).toBeInTheDocument();
    });

    it('"Cerrar" calls onSuccess', async () => {
        const onSuccess = vi.fn();
        mockProcessSale.mockResolvedValue({ ok: true, data: { id: 'sale_1', details: [], payments: [] } });
        render(<CheckoutModal {...DEFAULT_PROPS} onSuccess={onSuccess} />);
        const cashInput = screen.getAllByPlaceholderText('0')[0];
        fireEvent.change(cashInput, { target: { value: '15000' } });
        fireEvent.click(screen.getByRole('button', { name: /finalizar venta/i }));
        await waitFor(() => screen.getByText('¡Venta registrada!'));
        fireEvent.click(screen.getByRole('button', { name: /cerrar/i }));
        expect(onSuccess).toHaveBeenCalledOnce();
    });

    it('renders the hidden Receipt for printing', async () => {
        await triggerSuccess(15000);
        expect(screen.getByTestId('receipt')).toBeInTheDocument();
    });
});
