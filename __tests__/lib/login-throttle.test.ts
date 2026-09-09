import { describe, it, expect, beforeEach } from 'vitest';
import { lockRemaining, recordFailure, recordSuccess, _resetThrottle } from '../../lib/login-throttle';

beforeEach(() => _resetThrottle());

describe('login throttle', () => {
    it('locks after 5 failures for 15 minutes and unlocks afterwards', () => {
        const t0 = 1_000_000;
        for (let i = 0; i < 4; i++) expect(recordFailure('A@x.com', '1.1.1.1', t0).locked).toBe(false);
        expect(recordFailure('a@x.com', '1.1.1.1', t0).locked).toBe(true); // case-insensitive
        expect(lockRemaining('a@x.com', '1.1.1.1', t0 + 1000)).toBeGreaterThan(0);
        expect(lockRemaining('a@x.com', '1.1.1.1', t0 + 15 * 60 * 1000 + 1)).toBe(0);
        // A different IP does not inherit the lock: strangers can't lock the cashier out.
        expect(lockRemaining('a@x.com', '9.9.9.9', t0 + 1000)).toBe(0);
    });

    it('rotating IPs cannot bypass the account-wide cap (20 fails)', () => {
        const t0 = 5_000;
        for (let i = 0; i < 19; i++) recordFailure('d@x.com', `10.0.0.${i}`, t0);
        expect(lockRemaining('d@x.com', '10.0.0.99', t0)).toBe(0);
        expect(recordFailure('d@x.com', '10.0.0.200', t0).locked).toBe(true);
        expect(lockRemaining('d@x.com', 'any-other-ip', t0 + 1)).toBeGreaterThan(0);
    });

    it('a successful login clears the counter', () => {
        recordFailure('b@x.com', 'ip');
        recordFailure('b@x.com', 'ip');
        recordSuccess('b@x.com', 'ip');
        expect(recordFailure('b@x.com', 'ip').remainingAttempts).toBe(4);
    });

    it('forgets failures older than the window', () => {
        const t0 = 0;
        recordFailure('c@x.com', 'ip', t0);
        expect(recordFailure('c@x.com', 'ip', t0 + 16 * 60 * 1000).remainingAttempts).toBe(4);
    });
});
