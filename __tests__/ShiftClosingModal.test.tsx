/**
 * @file ShiftClosingModal.test.tsx
 * @description Unit tests for the ShiftClosingModal client component.
 *
 * The modal has two stages:
 *
 * STAGE 1 — Cash input form
 * - Renders an amount field and two action buttons (Cancelar / Cerrar Turno)
 * - "Cerrar Turno" is disabled while the amount field is empty
 * - Calls the `closeShift` server action on submit
 * - Shows an inline error when the action rejects
 *
 * STAGE 2 — Narrative summary (after successful close)
 * - Displays transactionCount, totalSales, topProduct, peakHour, userName
 * - Formats peakHour into human-readable 12h time
 * - Shows difference with correct sign prefix
 * - "Confirmar y Salir" triggers page reload
 *
 * `closeShift` and `next/navigation` are mocked so no real server calls occur.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ShiftClosingModal from '../app/pos/components/Shift/ShiftClosingModal';

const mockCloseShift = vi.fn();
vi.mock('../app/actions/shift', () => ({ closeShift: (...a: any[]) => mockCloseShift(...a) }));

const mockRefresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: mockRefresh }) }));

// jsdom doesn't implement window.location.reload; replace with a spy.
Object.defineProperty(window, 'location', {
    writable: true,
    value: { reload: vi.fn() },
});

function makeSummary(overrides: object = {}) {
    return {
        totalSales: 120000,
        expected: 220000,
        declared: 210000,
        difference: -10000,
        transactionCount: 5,
        topProduct: 'Empanada',
        peakHour: 13,
        userName: 'Luis García',
        ...overrides,
    };
}

// ─── Stage 1: form ────────────────────────────────────────────────────────────

describe('ShiftClosingModal — form stage', () => {
    const onCancel = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        render(<ShiftClosingModal activeShiftId="shift_1" onCancel={onCancel} />);
    });

    it('renders the amount input', () => {
        expect(screen.getByLabelText(/monto total en caja/i)).toBeInTheDocument();
    });

    it('"Cerrar Turno" button is disabled when the amount is empty', () => {
        expect(screen.getByRole('button', { name: /cerrar turno/i })).toBeDisabled();
    });

    it('"Cerrar Turno" button becomes enabled after entering an amount', () => {
        fireEvent.change(screen.getByLabelText(/monto total en caja/i), { target: { value: '150000' } });
        expect(screen.getByRole('button', { name: /cerrar turno/i })).not.toBeDisabled();
    });

    it('calls onCancel when "Cancelar" is clicked', () => {
        fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));
        expect(onCancel).toHaveBeenCalledOnce();
    });

    it('calls closeShift with the correct shiftId and amount on submit', async () => {
        mockCloseShift.mockResolvedValue({ summary: makeSummary() });
        fireEvent.change(screen.getByLabelText(/monto total en caja/i), { target: { value: '210000' } });
        fireEvent.click(screen.getByRole('button', { name: /cerrar turno/i }));
        await waitFor(() => expect(mockCloseShift).toHaveBeenCalledWith('shift_1', 210000));
    });

    it('shows an error message when closeShift rejects', async () => {
        mockCloseShift.mockRejectedValue(new Error('Turno inválido'));
        fireEvent.change(screen.getByLabelText(/monto total en caja/i), { target: { value: '100' } });
        fireEvent.click(screen.getByRole('button', { name: /cerrar turno/i }));
        await waitFor(() => expect(screen.getByText('Turno inválido')).toBeInTheDocument());
    });
});

// ─── Stage 2: narrative summary ───────────────────────────────────────────────

describe('ShiftClosingModal — summary stage', () => {
    async function renderSummary(summaryOverrides: object = {}) {
        mockCloseShift.mockResolvedValue({ summary: makeSummary(summaryOverrides) });
        render(<ShiftClosingModal activeShiftId="shift_1" onCancel={vi.fn()} />);
        fireEvent.change(screen.getByLabelText(/monto total en caja/i), { target: { value: '210000' } });
        fireEvent.click(screen.getByRole('button', { name: /cerrar turno/i }));
        await waitFor(() => expect(screen.queryByLabelText(/monto total en caja/i)).not.toBeInTheDocument());
    }

    beforeEach(() => vi.clearAllMocks());

    it('shows a personalised closing message with the first name', async () => {
        await renderSummary({ userName: 'Luis García' });
        expect(screen.getByText(/¡buen turno, luis/i)).toBeInTheDocument();
    });

    it('shows a generic closing message when userName is null', async () => {
        await renderSummary({ userName: null });
        expect(screen.getByText(/¡buen turno!/i)).toBeInTheDocument();
    });

    it('displays the transaction count', async () => {
        await renderSummary({ transactionCount: 5 });
        expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('displays total sales formatted', async () => {
        await renderSummary({ totalSales: 120000 });
        expect(screen.getByText('$120,000')).toBeInTheDocument();
    });

    it('displays the top product', async () => {
        await renderSummary({ topProduct: 'Empanada' });
        expect(screen.getByText('Empanada')).toBeInTheDocument();
    });

    it('displays peak hour in 12h format (13 → 1:00 pm)', async () => {
        await renderSummary({ peakHour: 13 });
        expect(screen.getByText('1:00 pm')).toBeInTheDocument();
    });

    it('displays peak hour in 12h format (0 → 12:00 am)', async () => {
        await renderSummary({ peakHour: 0 });
        expect(screen.getByText('12:00 am')).toBeInTheDocument();
    });

    it('does not render the top product card when topProduct is null', async () => {
        await renderSummary({ topProduct: null });
        expect(screen.queryByText(/producto estrella/i)).not.toBeInTheDocument();
    });

    it('does not render the peak hour card when peakHour is null', async () => {
        await renderSummary({ peakHour: null });
        expect(screen.queryByText(/hora pico/i)).not.toBeInTheDocument();
    });

    it('shows a negative difference with a minus prefix', async () => {
        await renderSummary({ difference: -10000 });
        expect(screen.getByText('-$10,000')).toBeInTheDocument();
    });

    it('shows a positive difference with a plus prefix', async () => {
        await renderSummary({ difference: 5000 });
        expect(screen.getByText('+$5,000')).toBeInTheDocument();
    });

    it('"Confirmar y Salir" triggers router.refresh and page reload', async () => {
        await renderSummary();
        fireEvent.click(screen.getByRole('button', { name: /confirmar y salir/i }));
        expect(mockRefresh).toHaveBeenCalledOnce();
        expect(window.location.reload).toHaveBeenCalledOnce();
    });
});
