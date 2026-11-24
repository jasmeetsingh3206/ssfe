import type { Batch, Line } from '../api/types'
import { formatCents, parseCents } from '../money/cents'

export function readiness(batch: Batch, lines: Line[]): { ready: boolean; reasons: string[] } {
  const reasons: string[] = []

  if (batch.status === 'Posted') {
    reasons.push('Batch is already posted')
  }

  const unmatched = lines.filter((l) => l.state === 'Unmatched').length
  if (unmatched === 1) reasons.push('1 line unmatched')
  if (unmatched > 1) reasons.push(`${unmatched} lines unmatched`)

  let resolvedTotal = 0
  for (const l of lines) {
    if (l.state !== 'Unmatched') resolvedTotal += parseCents(l.paid)
  }
  const difference = Math.abs(resolvedTotal - parseCents(batch.expectedAmount))
  if (difference !== 0) {
    reasons.push(`Totals differ by ${formatCents(difference)}`)
  }

  return { ready: reasons.length === 0, reasons }
}
