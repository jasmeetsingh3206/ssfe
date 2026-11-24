import type { Batch, Charge, Line } from './types'
import { parseCents, toAmount } from './money'

type Row = Omit<Line, 'batchId' | 'state' | 'allocations' | 'version'>

const charge = (
  id: string,
  claimId: string,
  code: string,
  dateOfService: string,
  amount: string,
): Charge => ({ id, labId: 'LAB-A', claimId, code, dateOfService, amount })

const row = (
  id: string,
  claimId: string,
  code: string,
  dateOfService: string,
  billed: string,
  paid: string,
  adjustments: string,
  extra: Partial<Row> = {},
): Row => ({ id, claimId, code, dateOfService, billed, paid, adjustments, ...extra })

const charges: Charge[] = [
  charge('CH-11', 'C-501', '88305', '2026-10-01', '250.00'),
  charge('CH-12', 'C-501', '88342', '2026-10-01', '150.00'),
  charge('CH-21', 'C-502', '88305', '2026-10-01', '300.00'),
  charge('CH-31', 'C-503', '88307', '2026-10-01', '250.00'),
  charge('CH-41', 'C-504', '88305', '2026-10-02', '250.00'),
  charge('CH-42', 'C-504', '88305', '2026-10-02', '250.00'),
  charge('CH-51', 'C-505', '88312', '2026-10-02', '95.00'),
  charge('CH-61', 'C-506', '88300', '2026-10-03', '40.00'),
  charge('CH-71', 'C-401', '88305', '2026-09-15', '200.00'),
  charge('CH-72', 'C-402', '88342', '2026-09-15', '120.00'),
]

const b104: Row[] = [
  row('L-1', 'C-501', '88305', '2026-10-01', '250.00', '120.00', '130.00'),
  row('L-2', 'C-501', '88342', '2026-10-01', '150.00', '30.00', '120.00'),
  row('L-3', 'C-502', '88305', '2026-10-01', '-300.00', '-200.00', '-100.00', {
    remark: 'Reversal of prior payment',
  }),
  row('L-4', 'C-502', '88305', '2026-10-01', '300.00', '180.00', '120.00'),
  row('L-5', 'C-503', '88305', '2026-10-01', '250.00', '100.00', '150.00', {
    originalCode: '88307',
  }),
  row('L-6', 'C-504', '88305', '2026-10-02', '500.00', '200.00', '300.00'),
  row('L-7', 'C-999', '88104', '2026-10-02', '80.00', '50.00', '30.00', {
    remark: 'Claim not on file',
  }),
  row('L-8', 'C-505', '88312', '2026-10-02', '95.00', '0.00', '95.00', {
    remark: '<img src=x onerror=alert(1)>',
  }),
  row('L-9', 'C-506', '88300', '2026-10-03', '40.00', '25.00', '10.00'),
]

const b090: Row[] = [
  row('P-1', 'C-401', '88305', '2026-09-15', '200.00', '150.00', '50.00'),
  row('P-2', 'C-402', '88342', '2026-09-15', '120.00', '80.00', '40.00'),
]

const b500: Row[] = []
for (let i = 1; i <= 500; i++) {
  const n = String(i).padStart(3, '0')
  const date = `2026-10-${String((i % 28) + 1).padStart(2, '0')}`
  const billed = 10000 + i * 37
  const paid = Math.floor((billed * 6) / 10)
  const adjustments = billed - paid + (i % 25 === 0 ? 100 : 0)
  b500.push(
    row(
      `G-${n}`,
      `C-7${n}`,
      '88305',
      date,
      toAmount(billed),
      toAmount(paid),
      toAmount(adjustments),
    ),
  )
  if (i % 10 !== 0) charges.push(charge(`CH-G${n}`, `C-7${n}`, '88305', date, toAmount(billed)))
}
const b500Expected = toAmount(b500.reduce((sum, l) => sum + parseCents(l.paid), 0))

export const isValid = (l: Pick<Line, 'billed' | 'paid' | 'adjustments'>) =>
  parseCents(l.billed) === parseCents(l.paid) + parseCents(l.adjustments)

function autoMatch(r: Row, batchId: string): Line {
  const hits = charges.filter(
    (c) =>
      c.claimId === r.claimId &&
      c.dateOfService === r.dateOfService &&
      c.code === (r.originalCode ?? r.code),
  )
  const hit = isValid(r) && hits.length === 1 ? hits[0] : undefined
  return hit
    ? {
        ...r,
        batchId,
        state: 'Matched',
        allocations: [{ chargeId: hit.id, amount: r.paid }],
        version: 1,
      }
    : { ...r, batchId, state: 'Unmatched', allocations: [], version: 1 }
}

export function seed() {
  const batches: [Batch, Row[]][] = [
    [{ id: 'B-104', labId: 'LAB-A', expectedAmount: '505.00', status: 'Open' }, b104],
    [{ id: 'B-090', labId: 'LAB-A', expectedAmount: '230.00', status: 'Posted' }, b090],
    [{ id: 'B-500', labId: 'LAB-A', expectedAmount: b500Expected, status: 'Open' }, b500],
  ]
  return {
    batches: new Map(batches.map(([b]) => [b.id, b])),
    lines: new Map(
      batches.flatMap(([b, rows]) => rows.map((r): [string, Line] => [r.id, autoMatch(r, b.id)])),
    ),
    charges: new Map(charges.map((c) => [c.id, c])),
  }
}
