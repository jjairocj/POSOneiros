import { describe, it, expect, beforeEach } from 'vitest';
import { lockRemaining, recordFailure, recordSuccess, _resetThrottle } from '../../lib/login-throttle';

beforeEach(() => _resetThrottle());

describe('login throttle', () => {
    it('locks after 5 failures for 15 minutes and unlocks afterwards', () => {
        const t0 = 1_000_000;
        for (let i = 0; i < 4; i++) expect(recordFailure('A@x.com', t0).locked).toBe(false);
        expect(recordFailure('a@x.com', t0).locked).toBe(true); // case-insensitive
        expect(lockRemaining('a@x.com', t0 + 1000)).toBeGreaterThan(0);
        expect(lockRemaining('a@x.com', t0 + 15 * 60 * 1000 + 1)).toBe(0);
    });

    it('a successful login clears the counter', () => {
        recordFailure('b@x.com');
        recordFailure('b@x.com');
        recordSuccess('b@x.com');
        expect(recordFailure('b@x.com').remainingAttempts).toBe(4);
    });

    it('forgets failures older than the window', () => {
        const t0 = 0;
        recordFailure('c@x.com', t0);
        expect(recordFailure('c@x.com', t0 + 16 * 60 * 1000).remainingAttempts).toBe(4);
    });
});
