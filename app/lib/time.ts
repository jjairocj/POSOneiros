/**
 * Business-local time helpers. The server may run in UTC (Vercel), but the
 * business operates in Colombia, so "today" and "hour of day" must be computed
 * in America/Bogota (fixed UTC-5, no DST).
 */
export const BUSINESS_TZ = "America/Bogota";
const BUSINESS_OFFSET = "-05:00";

function ymd(date: Date): { y: number; m: number; d: number } {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: BUSINESS_TZ, year: "numeric", month: "2-digit", day: "2-digit",
    }).formatToParts(date);
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
    return { y: get("year"), m: get("month"), d: get("day") };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** 00:00:00.000 of the given instant's calendar day in Bogotá. */
export function startOfBusinessDay(date: Date = new Date()): Date {
    const { y, m, d } = ymd(date);
    return new Date(`${y}-${pad(m)}-${pad(d)}T00:00:00.000${BUSINESS_OFFSET}`);
}

/** 23:59:59.999 of the given instant's calendar day in Bogotá. */
export function endOfBusinessDay(date: Date = new Date()): Date {
    const { y, m, d } = ymd(date);
    return new Date(`${y}-${pad(m)}-${pad(d)}T23:59:59.999${BUSINESS_OFFSET}`);
}

/** Hour of day (0–23) in Bogotá. */
export function businessHour(date: Date): number {
    const h = new Intl.DateTimeFormat("en-US", { timeZone: BUSINESS_TZ, hour: "numeric", hour12: false }).format(date);
    return Number(h) % 24;
}

/** "YYYY-MM-DD" key of the instant's Bogotá calendar day (safe for grouping/sorting). */
export function businessDayKey(date: Date): string {
    const { y, m, d } = ymd(date);
    return `${y}-${pad(m)}-${pad(d)}`;
}

/** Short label like "5 sep" for charts, in Bogotá time. */
export function businessDayLabel(date: Date): string {
    return new Intl.DateTimeFormat("es-CO", { timeZone: BUSINESS_TZ, day: "numeric", month: "short" }).format(date);
}
