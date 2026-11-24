import { describe, expect, it } from 'vitest'
import type { Line } from '../../api/types'
import { describeChange, previewChange, type LineChange } from '../changes'

const line: Line = {
  id: 'L-1',
  batchId: 'B-104',
  claimId: 'C-501',
  code: '88305',
  dateOfService: '2026-10-01',
  billed: '250.00',
  paid: '120.00',
  adjustments: '130.00',
  state: 'Matched',
  allocations: [{ chargeId: 'CH-11', amount: '120.00' }],
  version: 4,
}

describe('changes', () => {
  it.each<[LineChange, string]>([
    [{ type: 'state', state: 'Suspense' }, 'Move to Suspense'],
    [{ type: 'state', state: 'Excluded', reason: 'Duplicate' }, 'Exclude: Duplicate'],
    [{ type: 'state', state: 'Unmatched' }, 'Unmatch'],
    [{ type: 'match', shares: [{ chargeId: 'CH-11', amountCents: 12000 }] }, 'Match to CH-11'],
    [
      {
        type: 'match',
        shares: [
          { chargeId: 'CH-41', amountCents: 10000 },
          { chargeId: 'CH-42', amountCents: 10000 },
        ],
      },
      'Split across CH-41, CH-42',
    ],
  ])('describes %j as %s', (change, label) => {
    expect(describeChange(change)).toBe(label)
  })

  it('a state change clears allocations and keeps the version', () => {
    expect(previewChange(line, { type: 'state', state: 'Excluded', reason: 'Duplicate' })).toEqual({
      ...line,
      state: 'Excluded',
      allocations: [],
      reason: 'Duplicate',
    })
  })

  it('a match shows the split amounts in API format', () => {
    const preview = previewChange(line, {
      type: 'match',
      shares: [
        { chargeId: 'CH-41', amountCents: 6001 },
        { chargeId: 'CH-42', amountCents: 5999 },
      ],
    })
    expect(preview.state).toBe('Matched')
    expect(preview.allocations).toEqual([
      { chargeId: 'CH-41', amount: '60.01' },
      { chargeId: 'CH-42', amount: '59.99' },
    ])
  })
})
