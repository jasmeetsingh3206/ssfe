const DIGITS = '0123456789'

export function parseCents(s: string): number {
  const negative = s.startsWith('-')
  const parts = (negative ? s.slice(1) : s).split('.')
  const whole = parts[0] ?? ''
  const fraction = parts[1] ?? ''
  if (parts.length !== 2 || whole.length === 0 || fraction.length !== 2) {
    throw new Error(`Invalid amount: ${s}`)
  }

  let cents = 0
  for (const ch of whole + fraction) {
    const digit = DIGITS.indexOf(ch)
    if (digit === -1) throw new Error(`Invalid amount: ${s}`)
    cents = cents * 10 + digit
  }

  if (negative && cents !== 0) return -cents
  return cents
}

export function formatCents(c: number): string {
  const abs = Math.abs(c)
  const cents = abs % 100
  const dollars = (abs - cents) / 100
  const sign = c < 0 ? '-' : ''
  return `${sign}$${dollars.toLocaleString('en-US')}.${String(cents).padStart(2, '0')}`
}
