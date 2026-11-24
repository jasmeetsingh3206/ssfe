export function parseCents(s: string): number {
  const m = /^(-?)(\d+)\.(\d{2})$/.exec(s)
  if (!m) throw new Error(`Invalid amount: ${s}`)
  let cents = 0
  for (const ch of (m[2] ?? '') + (m[3] ?? '')) cents = cents * 10 + (ch.charCodeAt(0) - 48)
  return m[1] && cents ? -cents : cents
}

export function toAmount(c: number): string {
  const abs = Math.abs(c)
  return `${c < 0 ? '-' : ''}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`
}

type Share = { id: string; amountCents: number }

export function allocate(paidCents: number, charges: Share[]): Share[] {
  if (charges.length === 1) return charges.map((c) => ({ id: c.id, amountCents: paidCents }))
  const abs = Math.abs(paidCents)
  const total = charges.reduce((sum, c) => sum + c.amountCents, 0)
  if (total <= 0) throw new Error('Charges must total more than 0.00')
  const shares = charges.map((c) => ({
    id: c.id,
    amountCents: Number((BigInt(abs) * BigInt(c.amountCents)) / BigInt(total)),
  }))
  const leftover = abs - shares.reduce((sum, s) => sum + s.amountCents, 0)
  const order = [...charges].sort((a, b) => b.amountCents - a.amountCents || (a.id < b.id ? -1 : 1))
  for (const c of order.slice(0, leftover)) {
    const share = shares.find((s) => s.id === c.id)
    if (share) share.amountCents++
  }
  return shares.map((s) => ({
    id: s.id,
    amountCents: paidCents < 0 && s.amountCents ? -s.amountCents : s.amountCents,
  }))
}
