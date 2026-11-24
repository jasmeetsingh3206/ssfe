import express, { type ErrorRequestHandler, type Response } from 'express'
import type { Charge, Line, LineState } from './types'
import { allocate, parseCents, toAmount } from './money'
import { isValid, seed } from './seed'

type Code = 'not_found' | 'batch_posted' | 'stale_version' | 'validation' | 'internal'
type Extra = { current?: Line; errors?: Record<string, string[]> }

class ApiError extends Error {
  readonly status: number
  readonly code: Code
  readonly extra: Extra
  constructor(status: number, code: Code, title: string, extra: Extra = {}) {
    super(title)
    this.status = status
    this.code = code
    this.extra = extra
  }
}

const invalid = (errors: Record<string, string[]>) =>
  new ApiError(422, 'validation', 'The request is not valid', { errors })
const INVALID_LINE = 'Invalid line (billed ≠ paid + adjustments): it can only be excluded'

function sendError(res: Response, e: ApiError): void {
  const body = {
    type: `/problems/${e.code}`,
    title: e.message,
    status: e.status,
    code: e.code,
    ...e.extra,
  }
  res.status(e.status).type('application/problem+json').send(JSON.stringify(body))
}

const db = seed()
const byText = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)

function linesOf(batchId: string): Line[] {
  if (!db.batches.has(batchId)) throw new ApiError(404, 'not_found', `Batch ${batchId} not found`)
  return [...db.lines.values()]
    .filter((l) => l.batchId === batchId)
    .sort((a, b) => byText(a.dateOfService, b.dateOfService) || byText(a.id, b.id))
}

function writable(id: string, version: unknown): Line {
  const line = db.lines.get(id)
  if (!line) throw new ApiError(404, 'not_found', `Line ${id} not found`)
  if (db.batches.get(line.batchId)?.status === 'Posted') {
    throw new ApiError(409, 'batch_posted', 'Batch is posted and read-only')
  }
  if (version !== line.version) {
    throw new ApiError(409, 'stale_version', 'Line was changed by someone else', { current: line })
  }
  return line
}

function save(line: Line): Line {
  const next = { ...line, version: line.version + 1 }
  db.lines.set(next.id, next)
  return next
}

let delay: number | 'random' = 0
let failNext = false

const app = express()
app.use(express.json())

app.post('/__mock', (req, res) => {
  const body: { delay?: unknown; failNext?: unknown } = req.body ?? {}
  const d = body.delay
  if (d === 'random' || (typeof d === 'number' && Number.isInteger(d) && d >= 0)) delay = d
  if (typeof body.failNext === 'boolean') failNext = body.failNext
  res.json({ delay, failNext })
})

app.use(async (_req, res, next) => {
  const ms = delay === 'random' ? 100 + Math.floor(Math.random() * 1401) : delay
  if (ms) await new Promise((resolve) => setTimeout(resolve, ms))
  if (failNext) {
    failNext = false
    return sendError(res, new ApiError(500, 'internal', 'Simulated failure'))
  }
  next()
})

app.get('/batches/:id', (req, res) => {
  const lines = linesOf(req.params.id)
  const batch = db.batches.get(req.params.id)
  const totals: Record<LineState, number> = { Unmatched: 0, Matched: 0, Suspense: 0, Excluded: 0 }
  for (const l of lines) totals[l.state] += parseCents(l.paid)
  const canPost =
    batch?.status === 'Open' &&
    lines.every((l) => l.state !== 'Unmatched') &&
    totals.Matched + totals.Suspense + totals.Excluded === parseCents(batch.expectedAmount)
  res.json({
    ...batch,
    totals: Object.fromEntries(Object.entries(totals).map(([state, c]) => [state, toAmount(c)])),
    canPost,
  })
})

app.get('/batches/:id/lines', (req, res) => {
  res.json(linesOf(req.params.id))
})

app.get('/charges', (req, res) => {
  const q = String(req.query.q ?? '')
    .trim()
    .toLowerCase()
  if (!q) throw invalid({ q: ['Enter a claim id or code'] })
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50)
  res.json(
    [...db.charges.values()]
      .filter((c) => c.claimId.toLowerCase().startsWith(q) || c.code.toLowerCase().startsWith(q))
      .sort((a, b) => byText(a.claimId, b.claimId) || byText(a.id, b.id))
      .slice(0, limit),
  )
})

app.put('/lines/:id/match', (req, res) => {
  const body: { version?: unknown; chargeIds?: unknown } = req.body ?? {}
  const line = writable(req.params.id, body.version)
  if (!isValid(line)) throw invalid({ line: [INVALID_LINE] })
  const ids: unknown[] = Array.isArray(body.chargeIds) ? body.chargeIds : []
  const charges = ids.map((id) => db.charges.get(String(id)))
  if (
    !ids.length ||
    new Set(ids).size !== ids.length ||
    charges.some((c) => c?.claimId !== line.claimId)
  ) {
    throw invalid({ chargeIds: [`Choose one or more different charges on claim ${line.claimId}`] })
  }
  const shares = allocate(
    parseCents(line.paid),
    charges
      .filter((c): c is Charge => !!c)
      .map((c) => ({ id: c.id, amountCents: parseCents(c.amount) })),
  )
  res.json(
    save({
      ...line,
      state: 'Matched',
      reason: undefined,
      allocations: shares.map((s) => ({ chargeId: s.id, amount: toAmount(s.amountCents) })),
    }),
  )
})

const SETTABLE: LineState[] = ['Unmatched', 'Suspense', 'Excluded']

app.put('/lines/:id/state', (req, res) => {
  const body: { version?: unknown; state?: unknown; reason?: unknown } = req.body ?? {}
  const line = writable(req.params.id, body.version)
  const state = SETTABLE.find((s) => s === body.state)
  const reason = typeof body.reason === 'string' ? body.reason.trim() : ''
  if (!state) throw invalid({ state: ['Must be Unmatched, Suspense or Excluded'] })
  if (state === 'Excluded' && (reason.length < 1 || reason.length > 200)) {
    throw invalid({ reason: ['Give a reason of 1 to 200 characters'] })
  }
  if (state !== 'Excluded' && !isValid(line)) throw invalid({ line: [INVALID_LINE] })
  res.json(save({ ...line, state, allocations: [], reason: reason || undefined }))
})

app.use((_req, res) => sendError(res, new ApiError(404, 'not_found', 'No such endpoint')))

const onError: ErrorRequestHandler = (err: unknown, _req, res, _next) => {
  if (err instanceof ApiError) return sendError(res, err)
  if (err instanceof SyntaxError)
    return sendError(
      res,
      new ApiError(400, 'validation', 'Body is not valid JSON', {
        errors: { body: ['Body is not valid JSON'] },
      }),
    )
  console.error(err)
  sendError(res, new ApiError(500, 'internal', 'Unexpected server error'))
}
app.use(onError)

const PORT = Number(process.env.PORT ?? 3001)
app.listen(PORT, () => console.log(`Mock API on http://localhost:${PORT}`))
