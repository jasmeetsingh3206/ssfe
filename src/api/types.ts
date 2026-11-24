export type LineState = 'Unmatched' | 'Matched' | 'Suspense' | 'Excluded'
export type BatchStatus = 'Open' | 'Posted'

export interface Charge {
  id: string
  labId: string
  claimId: string
  code: string
  dateOfService: string
  amount: string
}

export interface Batch {
  id: string
  labId: string
  expectedAmount: string
  status: BatchStatus
}

export interface BatchSummary extends Batch {
  totals: Record<LineState, string>
  canPost: boolean
}

export interface Allocation {
  chargeId: string
  amount: string
}

export interface Line {
  id: string
  batchId: string
  claimId: string
  code: string
  originalCode?: string
  dateOfService: string
  billed: string
  paid: string
  adjustments: string
  state: LineState
  allocations: Allocation[]
  reason?: string
  remark?: string
  version: number
}

export interface MatchRequest {
  version: number
  chargeIds: string[]
}

export interface StateRequest {
  version: number
  state: Exclude<LineState, 'Matched'>
  reason?: string
}

export type ProblemCode = 'not_found' | 'batch_posted' | 'stale_version' | 'validation' | 'internal'

export interface Problem {
  type: string
  title: string
  status: number
  code: ProblemCode
  current?: Line
  errors?: Record<string, string[]>
}
