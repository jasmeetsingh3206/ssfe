import type { LineState } from '../api/types'

export const stateDot: Record<LineState, string> = {
  Matched: 'bg-green-600',
  Unmatched: 'bg-amber-500',
  Suspense: 'bg-sky-600',
  Excluded: 'bg-slate-400',
}
