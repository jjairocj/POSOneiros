/**
 * In-memory login throttle: after MAX_FAILS failed attempts for an email the
 * account is locked for LOCK_MS. Good enough for a single-instance deployment
 * with two users; swap for a Redis/DB store if the app runs on many instances.
 */
const MAX_FAILS = 5;
/** Account-wide cap regardless of IP: X-Forwarded-For is spoofable, so IP rotation must not bypass the lock. */
const MAX_FAILS_PER_ACCOUNT = 20;
const LOCK_MS = 15 * 60 * 1000;
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ENTRIES = 5000; // bound memory: evict the oldest entries beyond this

interface Entry { fails: number; firstFailAt: number; lockedUntil: number }
const attempts = new Map<string, Entry>();

/**
 * Keyed by email + client IP so a stranger who spams a known email from
 * elsewhere cannot lock the real user out of the register.
 */
const key = (email: string, ip = "") => `${email.trim().toLowerCase()}|${ip.trim()}`;

function evictIfNeeded(now: number) {
    if (attempts.size < MAX_ENTRIES) return;
    for (const [k, e] of attempts) {
        if (e.lockedUntil <= now && now - e.firstFailAt > WINDOW_MS) attempts.delete(k);
    }
    while (attempts.size >= MAX_ENTRIES) {
        const oldest = attempts.keys().next().value;
        if (oldest === undefined) break;
        attempts.delete(oldest);
    }
}

/** Milliseconds remaining on the lock, or 0 if the email may try to log in. */
function remainingFor(k: string, now: number): number {
    const e = attempts.get(k);
    if (!e) return 0;
    if (e.lockedUntil > now) return e.lockedUntil - now;
    if (now - e.firstFailAt > WINDOW_MS) attempts.delete(k);
    return 0;
}

/** Locked if either the (email, ip) pair or the account as a whole is locked. */
export function lockRemaining(email: string, ip = "", now = Date.now()): number {
    return Math.max(remainingFor(key(email, ip), now), remainingFor(key(email, "*"), now));
}

function bump(k: string, max: number, now: number): Entry {
    const e = attempts.get(k);
    const fresh = !e || now - e.firstFailAt > WINDOW_MS;
    const next: Entry = fresh ? { fails: 1, firstFailAt: now, lockedUntil: 0 } : { ...e!, fails: e!.fails + 1 };
    if (next.fails >= max) next.lockedUntil = now + LOCK_MS;
    attempts.set(k, next);
    return next;
}

export function recordFailure(email: string, ip = "", now = Date.now()): { locked: boolean; remainingAttempts: number } {
    evictIfNeeded(now);
    const pair = bump(key(email, ip), MAX_FAILS, now);
    const account = bump(key(email, "*"), MAX_FAILS_PER_ACCOUNT, now);
    const locked = pair.lockedUntil > now || account.lockedUntil > now;
    return { locked, remainingAttempts: Math.max(0, Math.min(MAX_FAILS - pair.fails, MAX_FAILS_PER_ACCOUNT - account.fails)) };
}

export function recordSuccess(email: string, ip = ""): void {
    attempts.delete(key(email, ip));
    attempts.delete(key(email, "*"));
}

/** Test helper. */
export function _resetThrottle(): void {
    attempts.clear();
}
