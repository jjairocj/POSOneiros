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
}));

const DEFAULT_PROPS = {
    activeShiftId: 'shift_1',
    orderTotal: 15000,
    items: [{ id: 'p1', name: 'Café', price: 15000, quantity: 1 }],
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
        expect(screen.getAllByText('$15,000').length).toBeGreaterThanOrEqual(1);
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
        expect(screen.getByText('$5,000')).toBeInTheDocument();
    });

    it('calls processSale with correct arguments on submit', async () => {
        mockProcessSale.mockResolvedValue({ id: 'sale_1' });
        renderModal();
        const cashInput = screen.getAllByPlaceholderText('0')[0];
        fireEvent.change(cashInput, { target: { value: '15000' } });
        fireEvent.click(screen.getByRole('button', { name: /finalizar venta/i }));

        await waitFor(() =>
            expect(mockProcessSale).toHaveBeenCalledWith(
                'shift_1',
                DEFAULT_PROPS.items,
                expect.arrayContaining([expect.objectContaining({ method: 'CASH', amount: 15000 })])
            )
        );
    });

    it('shows an inline error when processSale rejects', async () => {
        mockProcessSale.mockRejectedValue(new Error('Stock insuficiente'));
        renderModal();
        const cashInput = screen.getAllByPlaceholderText('0')[0];
        fireEvent.change(cashInput, { target: { value: '15000' } });
        fireEvent.click(screen.getByRole('button', { name: /finalizar venta/i }));
        await waitFor(() => expect(screen.getByText('Stock insuficiente')).toBeInTheDocument());
    });

    it('calls onCancel when the X button is clicked', () => {
        const onCancel = vi.fn();
        renderModal({ onCancel });
        // The X button doesn't have a label; find by its close icon container
        const closeBtn = screen.getByRole('button', { name: '' });
        fireEvent.click(closeBtn);
        expect(onCancel).toHaveBeenCalledOnce();
    });
});

// ─── Success stage ────────────────────────────────────────────────────────────

describe('CheckoutModal — success stage (climax visual)', () => {
    async function triggerSuccess(cashAmount: number, orderTotal = 15000) {
        mockProcessSale.mockResolvedValue({ id: 'sale_1' });
        renderModal({ orderTotal });
        const cashInput = screen.getAllByPlaceholderText('0')[0];
        fireEvent.change(cashInput, { target: { value: String(cashAmount) } });
        fireEvent.click(screen.getByRole('button', { name: /finalizar venta/i }));
        await waitFor(() => expect(screen.getByText('¡Venta Exitosa!')).toBeInTheDocument());
    }

    beforeEach(() => vi.clearAllMocks());

    it('renders the success heading after a completed sale', async () => {
        await triggerSuccess(15000);
        expect(screen.getByText('¡Venta Exitosa!')).toBeInTheDocument();
    });

    it('shows the change amount when there is an overpayment', async () => {
        await triggerSuccess(20000); // change = 5000
        expect(screen.getByText('$5,000')).toBeInTheDocument();
    });

    it('shows "Pago exacto recibido." when change is zero', async () => {
        await triggerSuccess(15000); // change = 0
        expect(screen.getByText('Pago exacto recibido.')).toBeInTheDocument();
    });

    it('"Cerrar" calls onSuccess', async () => {
        const onSuccess = vi.fn();
        mockProcessSale.mockResolvedValue({ id: 'sale_1' });
        render(<CheckoutModal {...DEFAULT_PROPS} onSuccess={onSuccess} />);
        const cashInput = screen.getAllByPlaceholderText('0')[0];
        fireEvent.change(cashInput, { target: { value: '15000' } });
        fireEvent.click(screen.getByRole('button', { name: /finalizar venta/i }));
        await waitFor(() => screen.getByText('¡Venta Exitosa!'));
        fireEvent.click(screen.getByRole('button', { name: /cerrar/i }));
        expect(onSuccess).toHaveBeenCalledOnce();
    });

    it('renders the hidden Receipt for printing', async () => {
        await triggerSuccess(15000);
        expect(screen.getByTestId('receipt')).toBeInTheDocument();
    });
});
