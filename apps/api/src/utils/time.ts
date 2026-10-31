// Parses expiry strings like '15m', '1h', '30d', '60s' to milliseconds.
// Returns fallbackMs if the value is missing or unparseable.
export function parseExpiryToMs(value: string | undefined, fallbackMs: number): number {
  if (!value) return fallbackMs
  const match = value.match(/^(\d+)(s|m|h|d)$/)
  if (!match) return fallbackMs
  const n = parseInt(match[1], 10)
  const unit = match[2]
  if (unit === 's') return n * 1000
  if (unit === 'm') return n * 60 * 1000
  if (unit === 'h') return n * 60 * 60 * 1000
  if (unit === 'd') return n * 24 * 60 * 60 * 1000
  return fallbackMs
}

// Same as parseExpiryToMs but returns seconds (for cookie maxAge).
export function parseExpiryToSeconds(value: string | undefined, fallbackSeconds: number): number {
  return Math.floor(parseExpiryToMs(value, fallbackSeconds * 1000) / 1000)
}
