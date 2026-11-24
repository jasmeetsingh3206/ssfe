import { describe, expect, it } from 'vitest'
import { allocate } from '../allocate'

type Case = [name: string, paid: number, charges: [string, number][], expected: [string, number][]]

const cases: Case[] = [
  ['simple match gets the full paid', 12000, [['CH-11', 25000]], [['CH-11', 12000]]],
  ['simple match ignores the charge amount', 5000, [['CH-1', 0]], [['CH-1', 5000]]],
  [
    'even split (Q2a, L-6)',
    20000,
    [
      ['CH-41', 25000],
      ['CH-42', 25000],
    ],
    [
      ['CH-41', 10000],
      ['CH-42', 10000],
    ],
  ],
  [
    'leftover cent goes to the largest charge (Q2b)',
    10001,
    [
      ['CH-1', 6000],
      ['CH-2', 4000],
    ],
    [
      ['CH-1', 6001],
      ['CH-2', 4000],
    ],
  ],
  [
    'three-way tie: leftover to lowest id (Q2c)',
    10000,
    [
      ['CH-1', 3333],
      ['CH-2', 3333],
      ['CH-3', 3333],
    ],
    [
      ['CH-1', 3334],
      ['CH-2', 3333],
      ['CH-3', 3333],
    ],
  ],
  [
    'tie order ignores input order',
    10000,
    [
      ['CH-3', 3333],
      ['CH-1', 3333],
      ['CH-2', 3333],
    ],
    [
      ['CH-3', 3333],
      ['CH-1', 3334],
      ['CH-2', 3333],
    ],
  ],
  [
    'negative paid (Q2d)',
    -10001,
    [
      ['CH-1', 6000],
      ['CH-2', 4000],
    ],
    [
      ['CH-1', -6001],
      ['CH-2', -4000],
    ],
  ],
  [
    'two leftover cents on a tie go to the two lowest ids',
    101,
    [
      ['C', 1],
      ['A', 1],
      ['B', 1],
    ],
    [
      ['C', 33],
      ['A', 34],
      ['B', 34],
    ],
  ],
  [
    'ordinal id compare: "CH-10" < "CH-9"',
    1,
    [
      ['CH-9', 100],
      ['CH-10', 100],
    ],
    [
      ['CH-9', 0],
      ['CH-10', 1],
    ],
  ],
  [
    'zero paid',
    0,
    [
      ['CH-1', 100],
      ['CH-2', 300],
    ],
    [
      ['CH-1', 0],
      ['CH-2', 0],
    ],
  ],
  [
    'negative paid with a zero share gives 0, not -0',
    -1,
    [
      ['A', 100],
      ['B', 100],
    ],
    [
      ['A', -1],
      ['B', 0],
    ],
  ],
]

describe('allocate (R4)', () => {
  it.each(cases)('%s', (_name, paid, charges, expected) => {
    const result = allocate(
      paid,
      charges.map(([id, amountCents]) => ({ id, amountCents })),
    )
    expect(result).toEqual(expected.map(([chargeId, amountCents]) => ({ chargeId, amountCents })))
    expect(result.reduce((s, r) => s + r.amountCents, 0)).toBe(paid)
    for (const r of result) expect(Object.is(r.amountCents, -0)).toBe(false)
  })

  it('throws when a split totals zero', () => {
    const charges = [
      { id: 'A', amountCents: 0 },
      { id: 'B', amountCents: 0 },
    ]
    expect(() => allocate(100, charges)).toThrow('total 0.00')
  })
})
