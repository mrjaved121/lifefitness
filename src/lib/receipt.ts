// A short, stable receipt number derived from the payment's id, so no extra
// column is needed and the same payment always prints the same number.
export function receiptNumber(paymentId: string) {
  return `R-${paymentId.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}
