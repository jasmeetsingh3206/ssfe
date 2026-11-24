import { describe, expect, it } from 'vitest'
import type { Batch, Line, LineState } from '../../api/types'
import { readiness } from '../readiness'

const batch = (over: Partial<Batch> = {}): Batch => ({
  id: 'B-1',
  labId: 'LAB-A',
  expectedAmount: '505.00',
  status: 'Open',
  ...over,
})

let seq = 0
const line = (paid: string, state: LineState): Line => ({
  id: `L-${++seq}`,
  batchId: 'B-1',
  claimId: 'C-1',
  code: '88305',
  dateOfService: '2026-10-01',
  billed: paid,
  paid,
  adjustments: '0.00',
  state,
  allocations: [],
  version: 1,
})

// B-104 right after import (Q1): L-6, L-7, L-9 unmatched; L-3 is a reversal.
const b104AfterImport = (): Line[] => [
  line('120.00', 'Matched'),
  line('30.00', 'Matched'),
  line('-200.00', 'Matched'),
  line('180.00', 'Matched'),
  line('100.00', 'Matched'),
  line('200.00', 'Unmatched'),
  line('50.00', 'Unmatched'),
  line('0.00', 'Matched'),
  line('25.00', 'Unmatched'),
]

describe('readiness (R5)', () => {
  it('B-104 after import: not ready, unmatched lines and a gap', () => {
    expect(readiness(batch(), b104AfterImport())).toEqual({
      ready: false,
      reasons: ['3 lines unmatched', 'Totals differ by $275.00'],
    })
  })

  it('B-104 resolved, with the reversal line counted negative: ready', () => {
    const lines = b104AfterImport().map((l) =>
      l.state === 'Unmatched' ? { ...l, state: 'Suspense' as const } : l,
    )
    expect(readiness(batch(), lines)).toEqual({ ready: true, reasons: [] })
  })

  it('a reversal left unmatched still counts against the total', () => {
    const lines = [line('300.00', 'Matched'), line('-100.00', 'Unmatched')]
    expect(readiness(batch({ expectedAmount: '200.00' }), lines)).toEqual({
      ready: false,
      reasons: ['1 line unmatched', 'Totals differ by $100.00'],
    })
  })

  it('totals above expected also report the absolute gap', () => {
    expect(
      readiness(batch({ expectedAmount: '100.00' }), [line('125.00', 'Excluded')]).reasons,
    ).toEqual(['Totals differ by $25.00'])
  })

  it('a Posted batch is never ready, even when everything adds up', () => {
    expect(
      readiness(batch({ status: 'Posted', expectedAmount: '50.00' }), [line('50.00', 'Matched')]),
    ).toEqual({
      ready: false,
      reasons: ['Batch is already posted'],
    })
  })

  it('an empty batch expecting 0.00 is ready', () => {
    expect(readiness(batch({ expectedAmount: '0.00' }), [])).toEqual({ ready: true, reasons: [] })
  })
})
