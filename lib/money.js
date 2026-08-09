// One place for currency formatting — Analytics' KPI cards and panel notes
// both need it, and a lone `new Intl.NumberFormat(...)` call at each site
// would drift on rounding (maximumFractionDigits) if either one changed
// independently.
export function formatMoney(amount, currency = "USD", locale = "en") {
  return new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(
    amount || 0
  );
}
