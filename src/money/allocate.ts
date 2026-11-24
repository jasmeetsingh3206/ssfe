export function allocate(
  paidCents: number,
  charges: { id: string; amountCents: number }[],
): { chargeId: string; amountCents: number }[] {
  if (charges.length === 1) {
    return charges.map((c) => ({ chargeId: c.id, amountCents: paidCents }))
  }

  const paid = Math.abs(paidCents)
  let total = 0
  for (const c of charges) total += c.amountCents
  if (total === 0) throw new Error('Cannot split across charges that total 0.00')

  const shares = charges.map((c) => ({
    chargeId: c.id,
    amountCents: Math.floor((paid * c.amountCents) / total),
  }))

  let leftover = paid
  for (const s of shares) leftover -= s.amountCents

  const largestFirst = [...charges].sort((a, b) => {
    if (a.amountCents !== b.amountCents) return b.amountCents - a.amountCents
    return a.id < b.id ? -1 : 1
  })
  for (const c of largestFirst) {
    if (leftover === 0) break
    const share = shares.find((s) => s.chargeId === c.id)
    if (share) {
      share.amountCents += 1
      leftover -= 1
    }
  }

  if (paidCents < 0) {
    for (const s of shares) {
      if (s.amountCents !== 0) s.amountCents = -s.amountCents
    }
  }
  return shares
}
