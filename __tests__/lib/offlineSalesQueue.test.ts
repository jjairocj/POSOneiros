import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockProcessSale = vi.fn();
vi.mock('@/app/actions/sale', () => ({ processSale: (...a: any[]) => mockProcessSale(...a) }));

import { useOfflineSalesQueue, flushOfflineSalesQueue, type PendingSale } from '../../app/lib/offlineSalesQueue';

const makeSale = (clientRef: string): PendingSale => ({
    clientRef,
    activeShiftId: 's1',
    items: [{ id: 'p1', quantity: 1 }],
    payments: [{ method: 'CASH', amount: 3000 }],
    options: { clientRef },
    enqueuedAt: Date.now(),
});

beforeEach(() => {
    vi.clearAllMocks();
    useOfflineSalesQueue.setState({ pending: [], flushing: false });
    localStorage.clear();
});

describe('useOfflineSalesQueue', () => {
    it('enqueues and removes sales', () => {
        const { enqueue, remove } = useOfflineSalesQueue.getState();
        enqueue(makeSale('a'));
        expect(useOfflineSalesQueue.getState().pending).toHaveLength(1);
        remove('a');
        expect(useOfflineSalesQueue.getState().pending).toHaveLength(0);
    });
});

describe('flushOfflineSalesQueue', () => {
    it('does nothing when the queue is empty', async () => {
        await flushOfflineSalesQueue();
        expect(mockProcessSale).not.toHaveBeenCalled();
    });

    it('sends each queued sale and removes it on success', async () => {
        useOfflineSalesQueue.getState().enqueue(makeSale('a'));
        useOfflineSalesQueue.getState().enqueue(makeSale('b'));
        mockProcessSale.mockResolvedValue({ ok: true, data: { id: 'sale-1' } });
        await flushOfflineSalesQueue();
        expect(mockProcessSale).toHaveBeenCalledTimes(2);
        expect(useOfflineSalesQueue.getState().pending).toHaveLength(0);
    });

    it('stops at the first sale that still cannot reach the server, leaving it and the rest queued', async () => {
        useOfflineSalesQueue.getState().enqueue(makeSale('a'));
        useOfflineSalesQueue.getState().enqueue(makeSale('b'));
        mockProcessSale.mockRejectedValue(new Error('network down'));
        await flushOfflineSalesQueue();
        expect(mockProcessSale).toHaveBeenCalledTimes(1);
        expect(useOfflineSalesQueue.getState().pending).toHaveLength(2);
    });

    it('drops a sale the server actually rejects (not a network error) instead of retrying it forever', async () => {
        useOfflineSalesQueue.getState().enqueue(makeSale('a'));
        mockProcessSale.mockResolvedValue({ ok: false, error: 'El turno ya no está abierto.' });
        await flushOfflineSalesQueue();
        expect(useOfflineSalesQueue.getState().pending).toHaveLength(0);
    });

    it('does not run two flushes concurrently', async () => {
        useOfflineSalesQueue.getState().enqueue(makeSale('a'));
        let resolveFirst: () => void;
        mockProcessSale.mockImplementation(() => new Promise((resolve) => { resolveFirst = () => resolve({ ok: true, data: {} }); }));
        const first = flushOfflineSalesQueue();
        const second = flushOfflineSalesQueue();
        resolveFirst!();
        await Promise.all([first, second]);
        expect(mockProcessSale).toHaveBeenCalledTimes(1);
    });
});
