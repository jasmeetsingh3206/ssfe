import { matchLine, setLineState } from '../api/client'
import type { Line, StateRequest } from '../api/types'
import { toAmount } from '../money/cents'

export type LineChange =
  | { type: 'state'; state: StateRequest['state']; reason?: string }
  | { type: 'match'; shares: { chargeId: string; amountCents: number }[] }

export function describeChange(change: LineChange): string {
  if (change.type === 'match') {
    const ids = change.shares.map((s) => s.chargeId)
    return ids.length > 1 ? `Split across ${ids.join(', ')}` : `Match to ${ids[0]}`
  }
  if (change.state === 'Excluded') return `Exclude: ${change.reason}`
  if (change.state === 'Suspense') return 'Move to Suspense'
  return 'Unmatch'
}

export function previewChange(line: Line, change: LineChange): Line {
  if (change.type === 'match') {
    const allocations = change.shares.map((s) => ({
      chargeId: s.chargeId,
      amount: toAmount(s.amountCents),
    }))
    return { ...line, state: 'Matched', allocations, reason: undefined }
  }
  const reason = change.state === 'Unmatched' ? undefined : change.reason
  return { ...line, state: change.state, allocations: [], reason }
}

export function sendChange(line: Line, change: LineChange): Promise<Line> {
  if (change.type === 'match') {
    const chargeIds = change.shares.map((s) => s.chargeId)
    return matchLine(line.id, { version: line.version, chargeIds })
  }
  return setLineState(line.id, {
    version: line.version,
    state: change.state,
    reason: change.reason,
  })
}
