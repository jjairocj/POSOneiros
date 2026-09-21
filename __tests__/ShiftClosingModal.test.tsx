/**
 * @file ShiftClosingModal.test.tsx
 * @description Unit tests for the ShiftClosingModal client component.
 *
 * STAGE 1 — Count form: base (read-only), cash / transfer / card counted.
 * STAGE 2 — Cuadre review after "Cerrar Turno": expected vs typed per method,
 *           and a required reason when anything is off.
 * STAGE 3 — Narrative summary after the shift is actually closed.
 *
 * `closeShift`, `getShiftClosePreview` and `next/navigation` are mocked so no
 * real server calls occur.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ShiftClosingModal from '../app/pos/components/Shift/ShiftClosingModal';

const mockCloseShift = vi.fn();
const mockPreview = vi.fn();
const mockState = vi.fn();
vi.mock('../app/actions/shift', () => ({
    closeShift: (...a: any[]) => mockCloseShift(...a),
    getShiftClosePreview: (...a: any[]) => mockPreview(...a),
    getShiftCloseState: (...a: any[]) => mockState(...a),
}));

// Modo Tutorial off (default): helper text must not be required by any assertion.

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
        baseAmount: 100000,
        card: { expected: 0, declared: 0, difference: 0 },
        transfer: { expected: 0, declared: 0, difference: 0 },
        note: null,
        cashSales: 120000,
        cardSales: 0,
        transferSales: 0,
        cancelledCount: 0,
        transactionCount: 5,
        topProduct: 'Empanada',
        peakHour: 13,
        userName: 'Luis García',
        ...overrides,
    };
}

const previewFor = (cash: number, card = 0, transfer = 0) => ({
    baseAmount: 100000, cashSales: 120000, cardSales: 30000, transferSales: 20000, expectedCash: 220000,
    declared: { cash, card, transfer },
});
const PREVIEW = previewFor(220000, 30000, 20000);

// By default no count has been frozen yet, so the modal opens on the count form.
beforeEach(() => mockState.mockResolvedValue({ ok: true, data: { declared: null } }));

/** Fill the count form and click "Cerrar Turno". */
async function fillAndSubmit(cash: string, transfer = '', card = '') {
    fireEvent.change(await screen.findByLabelText(/efectivo en caja/i), { target: { value: cash } });
    if (transfer) fireEvent.change(screen.getByLabelText(/transferencias/i), { target: { value: transfer } });
    if (card) fireEvent.change(screen.getByLabelText(/tarjeta/i), { target: { value: card } });
    fireEvent.click(screen.getByRole('button', { name: /cerrar turno/i }));
}

// ─── Stage 1: form ────────────────────────────────────────────────────────────

describe('ShiftClosingModal — form stage', () => {
    const onCancel = vi.fn();

    beforeEach(async () => {
        vi.clearAllMocks();
        mockState.mockResolvedValue({ ok: true, data: { declared: null } });
        render(<ShiftClosingModal activeShiftId="shift_1" baseAmount={100000} onCancel={onCancel} />);
        await screen.findByLabelText(/efectivo en caja/i);
    });

    it('shows the opening base read-only', () => {
        expect(screen.getByText(/base de apertura/i)).toBeInTheDocument();
        expect(screen.getByText('$100.000')).toBeInTheDocument();
    });

    it('renders cash, transfer and card fields', () => {
        expect(screen.getByLabelText(/efectivo en caja/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/transferencias/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/tarjeta/i)).toBeInTheDocument();
    });

    it('does not reveal any expected amounts before the count is submitted (blind count)', () => {
        expect(screen.queryByText(/esperado/i)).not.toBeInTheDocument();
    });

    it('"Cerrar Turno" is disabled until the cash count is entered', () => {
        expect(screen.getByRole('button', { name: /cerrar turno/i })).toBeDisabled();
        fireEvent.change(screen.getByLabelText(/efectivo en caja/i), { target: { value: '150000' } });
        expect(screen.getByRole('button', { name: /cerrar turno/i })).not.toBeDisabled();
    });

    it('calls onCancel when "Cancelar" is clicked', () => {
        fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));
        expect(onCancel).toHaveBeenCalledOnce();
    });

    it('does NOT close the shift yet: it submits the count (which freezes it) and fetches the cuadre', async () => {
        mockPreview.mockResolvedValue({ ok: true, data: previewFor(220000) });
        await fillAndSubmit('220000');
        await waitFor(() => expect(mockPreview).toHaveBeenCalledWith('shift_1', { cash: 220000, card: 0, transfer: 0 }));
        expect(mockCloseShift).not.toHaveBeenCalled();
    });

    it('shows the server error when the preview fails', async () => {
        mockPreview.mockResolvedValue({ ok: false, error: 'El turno no está abierto.' });
        await fillAndSubmit('100');
        await waitFor(() => expect(screen.getByText('El turno no está abierto.')).toBeInTheDocument());
    });
});

// ─── Stage 2: cuadre review ───────────────────────────────────────────────────

describe('ShiftClosingModal — cuadre review', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockPreview.mockImplementation(async (_id: string, d: any) => ({ ok: true, data: { ...previewFor(0), declared: d } }));
        render(<ShiftClosingModal activeShiftId="shift_1" baseAmount={100000} onCancel={vi.fn()} />);
    });

    async function toReview(cash: string, transfer = '', card = '') {
        await fillAndSubmit(cash, transfer, card);
        await waitFor(() => expect(screen.getByText(/cuadre del turno/i)).toBeInTheDocument());
    }

    it('shows expected vs typed per method', async () => {
        await toReview('220000', '20000', '30000');
        expect(screen.getAllByText('$220.000').length).toBe(2); // expected + typed cash
        expect(screen.getAllByText('$30.000').length).toBe(2);
        expect(screen.getAllByText('$20.000').length).toBe(2);
    });

    it('when everything matches: no reason field and closing is allowed immediately', async () => {
        mockCloseShift.mockResolvedValue({ ok: true, data: { summary: makeSummary() } });
        await toReview('220000', '20000', '30000');
        expect(screen.queryByLabelText(/motivo del descuadre/i)).not.toBeInTheDocument();
        expect(screen.getAllByText('OK')).toHaveLength(3);
        fireEvent.click(screen.getByRole('button', { name: /confirmar cierre/i }));
        await waitFor(() => expect(mockCloseShift).toHaveBeenCalledWith('shift_1', ''));
    });

    it('when a method is off: shows the signed difference and requires a reason', async () => {
        await toReview('210000', '20000', '30000');
        expect(screen.getByText('-$10.000')).toBeInTheDocument();
        expect(screen.getByLabelText(/motivo del descuadre/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /confirmar cierre/i })).toBeDisabled();
    });

    it('a surplus is shown with a plus sign', async () => {
        await toReview('225000', '20000', '30000');
        expect(screen.getByText('+$5.000')).toBeInTheDocument();
    });

    it('sends the reason along once it is written', async () => {
        mockCloseShift.mockResolvedValue({ ok: true, data: { summary: makeSummary({ note: 'Vuelto de más' }) } });
        await toReview('210000', '20000', '30000');
        fireEvent.change(screen.getByLabelText(/motivo del descuadre/i), { target: { value: 'Vuelto de más' } });
        fireEvent.click(screen.getByRole('button', { name: /confirmar cierre/i }));
        await waitFor(() => expect(mockCloseShift).toHaveBeenCalledWith('shift_1', 'Vuelto de más'));
    });

    it('the count can not be edited once the cuadre is shown: no "volver a editar", no inputs to change', async () => {
        await toReview('210000');
        expect(screen.queryByRole('button', { name: /volver a editar/i })).not.toBeInTheDocument();
        expect(screen.queryByLabelText(/efectivo en caja/i)).not.toBeInTheDocument();
        expect(document.querySelectorAll('input')).toHaveLength(0);
    });

    it('shows the server error if closing is rejected', async () => {
        mockCloseShift.mockResolvedValue({ ok: false, error: 'Hay un descuadre: escribe el motivo para poder cerrar el turno.' });
        await toReview('220000', '20000', '30000');
        fireEvent.click(screen.getByRole('button', { name: /confirmar cierre/i }));
        await waitFor(() => expect(screen.getByText(/escribe el motivo/i)).toBeInTheDocument());
    });
});

// ─── Frozen count: reopening resumes at the cuadre ─────────────────────────────

describe('ShiftClosingModal — count already submitted', () => {
    beforeEach(() => vi.clearAllMocks());

    it('skips the count form and shows the frozen values so the cashier can only confirm', async () => {
        mockState.mockResolvedValue({ ok: true, data: { declared: { cash: 210000, card: 30000, transfer: 20000 } } });
        mockPreview.mockResolvedValue({ ok: true, data: previewFor(210000, 30000, 20000) });
        render(<ShiftClosingModal activeShiftId="shift_1" baseAmount={100000} onCancel={vi.fn()} />);

        await waitFor(() => expect(screen.getByText(/cuadre del turno/i)).toBeInTheDocument());
        expect(mockPreview).toHaveBeenCalledWith('shift_1'); // no amounts sent: nothing can be re-typed
        expect(screen.queryByLabelText(/efectivo en caja/i)).not.toBeInTheDocument();
        expect(screen.getByText('-$10.000')).toBeInTheDocument();
    });

    it('opens the normal count form when nothing has been submitted yet', async () => {
        mockState.mockResolvedValue({ ok: true, data: { declared: null } });
        render(<ShiftClosingModal activeShiftId="shift_1" baseAmount={100000} onCancel={vi.fn()} />);
        expect(await screen.findByLabelText(/efectivo en caja/i)).toBeInTheDocument();
        expect(mockPreview).not.toHaveBeenCalled();
    });
});

// ─── Stage 3: narrative summary ───────────────────────────────────────────────

describe('ShiftClosingModal — summary stage', () => {
    async function renderSummary(summaryOverrides: object = {}) {
        mockPreview.mockImplementation(async (_id: string, d: any) => ({ ok: true, data: { ...previewFor(0), declared: d } }));
        mockCloseShift.mockResolvedValue({ ok: true, data: { summary: makeSummary(summaryOverrides) } });
        render(<ShiftClosingModal activeShiftId="shift_1" baseAmount={100000} onCancel={vi.fn()} />);
        // Match the preview exactly so no reason is needed to reach the summary.
        await fillAndSubmit('220000', '20000', '30000');
        await waitFor(() => expect(screen.getByText(/cuadre del turno/i)).toBeInTheDocument());
        fireEvent.click(screen.getByRole('button', { name: /confirmar cierre/i }));
        await waitFor(() => expect(screen.getByText(/confirmar y salir/i)).toBeInTheDocument());
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
        expect(screen.getAllByText('$120.000').length).toBeGreaterThanOrEqual(1);
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

    it('shows a negative cash difference with a minus prefix', async () => {
        await renderSummary({ difference: -10000 });
        expect(screen.getByText('-$10.000')).toBeInTheDocument();
    });

    it('shows a positive cash difference with a plus prefix', async () => {
        await renderSummary({ difference: 5000 });
        expect(screen.getByText('+$5.000')).toBeInTheDocument();
    });

    it('shows card and transfer differences and the recorded reason', async () => {
        await renderSummary({ card: { expected: 30000, declared: 29000, difference: -1000 }, note: 'Falta un voucher' });
        expect(screen.getByText('-$1.000')).toBeInTheDocument();
        expect(screen.getByText('Falta un voucher')).toBeInTheDocument();
    });

    it('offers the .xlsx download of the shift', async () => {
        await renderSummary();
        const link = screen.getByRole('link', { name: /descargar ventas del turno/i });
        expect(link).toHaveAttribute('href', '/api/export/shift?id=shift_1');
    });

    it('"Confirmar y Salir" triggers router.refresh and page reload', async () => {
        await renderSummary();
        fireEvent.click(screen.getByRole('button', { name: /confirmar y salir/i }));
        expect(mockRefresh).toHaveBeenCalledOnce();
        expect(window.location.reload).toHaveBeenCalledOnce();
    });
});
