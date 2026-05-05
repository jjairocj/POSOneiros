/** Formats a number as a Colombian peso string, e.g. 1500 → "$1,500" */
export const formatMoney = (amount: number): string =>
    `$${Math.round(amount).toLocaleString("es-CO")}`;
