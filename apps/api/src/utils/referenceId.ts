// Generates the human-readable application reference ID.
// Format: OPP-YYMMDD-XXX
//   YYMMDD  = date of payment confirmation
//   XXX     = 3-character institution code set on the opportunity record
//
// Called in the payment confirmation handler (webhook / direct confirm),
// after payment.status updates to 'succeeded' and before the application
// record is created.

export function generateApplicationRef(
  paymentConfirmedAt: Date,
  institutionCode: string,
): string {
  const y = String(paymentConfirmedAt.getUTCFullYear()).slice(2)
  const m = String(paymentConfirmedAt.getUTCMonth() + 1).padStart(2, '0')
  const d = String(paymentConfirmedAt.getUTCDate()).padStart(2, '0')
  return `OPP-${y}${m}${d}-${institutionCode.toUpperCase()}`
}
