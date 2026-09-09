/**
 * In-memory login throttle: after MAX_FAILS failed attempts for an email the
 * account is locked for LOCK_MS. Good enough for a single-instance deployment
 * with two users; swap for a Redis/DB store if the app runs on many instances.
 */
const MAX_FAILS = 5;
const LOCK_MS = 15 * 60 * 1000;
const WINDOW_MS = 15 * 60 * 1000;

interface Entry { fails: number; firstFailAt: number; lockedUntil: number }
const attempts = new Map<string, Entry>();

const key = (email: string) => email.trim().toLowerCase();

/** Milliseconds remaining on the lock, or 0 if the email may try to log in. */
export function lockRemaining(email: string, now = Date.now()): number {
    const e = attempts.get(key(email));
    if (!e) return 0;
    if (e.lockedUntil > now) return e.lockedUntil - now;
    if (now - e.firstFailAt > WINDOW_MS) attempts.delete(key(email));
    return 0;
}

export function recordFailure(email: string, now = Date.now()): { locked: boolean; remainingAttempts: number } {
    const k = key(email);
    const e = attempts.get(k);
    const fresh = !e || now - e.firstFailAt > WINDOW_MS;
    const next: Entry = fresh ? { fails: 1, firstFailAt: now, lockedUntil: 0 } : { ...e!, fails: e!.fails + 1 };
    if (next.fails >= MAX_FAILS) next.lockedUntil = now + LOCK_MS;
    attempts.set(k, next);
    return { locked: next.lockedUntil > now, remainingAttempts: Math.max(0, MAX_FAILS - next.fails) };
}

export function recordSuccess(email: string): void {
    attempts.delete(key(email));
}

/** Test helper. */
export function _resetThrottle(): void {
    attempts.clear();
}
