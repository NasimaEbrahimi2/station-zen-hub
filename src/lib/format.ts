/* Shared helpers */
export function fmtMoney(n: number, currency = "USD") {
  return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 }).format(n);
}
export function fmtLiters(n: number) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(n) + " L";
}
export function fmtDateTime(s: string | Date) {
  return new Date(s).toLocaleString();
}
export function fmtDate(s: string | Date) {
  return new Date(s).toLocaleDateString();
}
