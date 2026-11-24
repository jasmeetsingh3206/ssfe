export type LineState = 'Unmatched' | 'Matched' | 'Suspense' | 'Excluded'

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
  status: 'Open' | 'Posted'
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
  allocations: { chargeId: string; amount: string }[]
  reason?: string
  remark?: string
  version: number
}
