/**
 * @file ShiftHeader.test.tsx
 * @description Unit tests for the ShiftHeader client component.
 *
 * ShiftHeader receives the `activeShift` prop from the POS server page and
 * renders two distinct states:
 *
 * NO SHIFT STATE
 * - Shows a red "Sin turno activo" badge (communicates urgency per design spec)
 * - Shows an "Abrir Turno" button that opens ShiftOpeningModal
 *
 * ACTIVE SHIFT STATE
 * - Shows the register name in the shift badge
 * - Shows the sale counter badge ("N ventas") from activeShift._count.sales
 * - Shows a "Cerrar Turno" button that opens ShiftClosingModal
 *
 * Both modals are mocked so this file tests only ShiftHeader's own rendering
 * and interaction logic.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ShiftHeader from '../app/pos/components/Shift/ShiftHeader';

vi.mock('../app/pos/components/Shift/ShiftOpeningModal', () => ({
    default: ({ onClose }: { onClose: () => void }) => (
        <div data-testid="opening-modal">
            <button onClick={onClose}>Cerrar apertura</button>
        </div>
    ),
}));

vi.mock('../app/pos/components/Shift/ShiftClosingModal', () => ({
    default: ({ onCancel }: { onCancel: () => void }) => (
        <div data-testid="closing-modal">
            <button onClick={onCancel}>Cancelar cierre</button>
        </div>
    ),
}));

// ─── No shift state ───────────────────────────────────────────────────────────

describe('ShiftHeader — no active shift', () => {
    it('shows the "Sin turno activo" badge', () => {
        render(<ShiftHeader activeShift={null} userName="Ana López" userRole="CASHIER" />);
        expect(screen.getByText('Sin turno activo')).toBeInTheDocument();
    });

    it('shows the "Abrir Turno" button', () => {
        render(<ShiftHeader activeShift={null} userName="Ana López" userRole="CASHIER" />);
        expect(screen.getByRole('button', { name: /abrir turno/i })).toBeInTheDocument();
    });

    it('does not show a "Cerrar Turno" button', () => {
        render(<ShiftHeader activeShift={null} userName="Ana López" userRole="CASHIER" />);
        expect(screen.queryByRole('button', { name: /cerrar turno/i })).not.toBeInTheDocument();
    });

    it('opens ShiftOpeningModal when "Abrir Turno" is clicked', () => {
        render(<ShiftHeader activeShift={null} userName="Ana López" userRole="CASHIER" />);
        fireEvent.click(screen.getByRole('button', { name: /abrir turno/i }));
        expect(screen.getByTestId('opening-modal')).toBeInTheDocument();
    });

    it('closes ShiftOpeningModal when the modal signals onClose', () => {
        render(<ShiftHeader activeShift={null} userName="Ana López" userRole="CASHIER" />);
        fireEvent.click(screen.getByRole('button', { name: /abrir turno/i }));
        fireEvent.click(screen.getByText('Cerrar apertura'));
        expect(screen.queryByTestId('opening-modal')).not.toBeInTheDocument();
    });
});

// ─── Active shift state ───────────────────────────────────────────────────────

describe('ShiftHeader — active shift', () => {
    const activeShift = {
        id: 'shift_1',
        register: { name: 'Caja 1' },
        _count: { sales: 7 },
    };

    it('shows the register name in the shift badge', () => {
        render(<ShiftHeader activeShift={activeShift} userName="Ana López" userRole="CASHIER" />);
        expect(screen.getByText(/caja 1/i)).toBeInTheDocument();
    });

    it('shows the sale count from _count.sales', () => {
        render(<ShiftHeader activeShift={activeShift} userName="Ana López" userRole="CASHIER" />);
        expect(screen.getByText(/7 ventas/i)).toBeInTheDocument();
    });

    it('uses singular "venta" when count is 1', () => {
        render(<ShiftHeader activeShift={{ ...activeShift, _count: { sales: 1 } }} userName="Ana López" userRole="CASHIER" />);
        expect(screen.getByText(/1 venta$/i)).toBeInTheDocument();
    });

    it('shows 0 ventas when _count is missing (graceful fallback)', () => {
        render(<ShiftHeader activeShift={{ id: 'shift_1', register: { name: 'Caja 2' } }} userName="Ana López" userRole="CASHIER" />);
        expect(screen.getByText(/0 ventas/i)).toBeInTheDocument();
    });

    it('shows the "Cerrar Turno" button', () => {
        render(<ShiftHeader activeShift={activeShift} userName="Ana López" userRole="CASHIER" />);
        expect(screen.getByRole('button', { name: /cerrar turno/i })).toBeInTheDocument();
    });

    it('does not show the "Abrir Turno" button', () => {
        render(<ShiftHeader activeShift={activeShift} userName="Ana López" userRole="CASHIER" />);
        expect(screen.queryByRole('button', { name: /abrir turno/i })).not.toBeInTheDocument();
    });

    it('opens ShiftClosingModal when "Cerrar Turno" is clicked', () => {
        render(<ShiftHeader activeShift={activeShift} userName="Ana López" userRole="CASHIER" />);
        fireEvent.click(screen.getByRole('button', { name: /cerrar turno/i }));
        expect(screen.getByTestId('closing-modal')).toBeInTheDocument();
    });

    it('closes ShiftClosingModal when the modal signals onCancel', () => {
        render(<ShiftHeader activeShift={activeShift} userName="Ana López" userRole="CASHIER" />);
        fireEvent.click(screen.getByRole('button', { name: /cerrar turno/i }));
        fireEvent.click(screen.getByText('Cancelar cierre'));
        expect(screen.queryByTestId('closing-modal')).not.toBeInTheDocument();
    });
});
