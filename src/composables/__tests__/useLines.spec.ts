import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope } from 'vue'
import { ApiError, getLines, setLineState } from '../../api/client'
import type { Line } from '../../api/types'
import type { LineChange } from '../../batch/changes'
import { useLines } from '../useLines'

vi.mock('../../api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/client')>()),
  getLines: vi.fn<typeof getLines>(),
  setLineState: vi.fn<typeof setLineState>(),
}))

const l6: Line = {
  id: 'L-6',
  batchId: 'B-104',
  claimId: 'C-504',
  code: '88305',
  dateOfService: '2026-10-02',
  billed: '500.00',
  paid: '200.00',
  adjustments: '300.00',
  state: 'Unmatched',
  allocations: [],
  version: 1,
}

const splitByOtherUser: Line = {
  ...l6,
  state: 'Matched',
  allocations: [
    { chargeId: 'CH-41', amount: '100.00' },
    { chargeId: 'CH-42', amount: '100.00' },
  ],
  version: 2,
}

const staleError = new ApiError({
  type: '/problems/stale_version',
  title: 'Line was changed by someone else',
  status: 409,
  code: 'stale_version',
  current: splitByOtherUser,
})

const suspense: LineChange = { type: 'state', state: 'Suspense' }

let scope: ReturnType<typeof effectScope>

async function setup() {
  const lines = scope.run(() => useLines('B-104'))!
  await vi.waitFor(() => expect(lines.data.value).toHaveLength(1))
  return lines
}

const row = (lines: Awaited<ReturnType<typeof setup>>) => lines.data.value[0]

beforeEach(() => {
  vi.mocked(getLines).mockResolvedValue([l6])
  vi.mocked(setLineState).mockReset()
  scope = effectScope()
})

afterEach(() => scope.stop())

describe('useLines save flow', () => {
  it('updates the row immediately, then keeps the server copy', async () => {
    const lines = await setup()
    let finish!: (line: Line) => void
    vi.mocked(setLineState).mockReturnValue(new Promise((resolve) => (finish = resolve)))

    const saving = lines.apply(l6, suspense)
    expect(row(lines)?.state).toBe('Suspense')
    expect(lines.pending.has('L-6')).toBe(true)

    finish({ ...l6, state: 'Suspense', version: 2 })
    expect(await saving).toBeNull()
    expect(row(lines)?.version).toBe(2)
    expect(lines.pending.has('L-6')).toBe(false)
  })

  it('409 stale_version: rolls back, then Keep mine sends the new version', async () => {
    const lines = await setup()
    vi.mocked(setLineState)
      .mockRejectedValueOnce(staleError)
      .mockResolvedValueOnce({ ...l6, state: 'Suspense', version: 3 })

    const error = await lines.apply(l6, suspense)

    expect(error?.code).toBe('stale_version')
    expect(row(lines)).toEqual(l6)
    expect(lines.conflict.value).toEqual({ change: suspense, theirs: splitByOtherUser })

    expect(await lines.keepMine()).toBeNull()

    expect(setLineState).toHaveBeenNthCalledWith(1, 'L-6', { version: 1, state: 'Suspense' })
    expect(setLineState).toHaveBeenNthCalledWith(2, 'L-6', { version: 2, state: 'Suspense' })
    expect(row(lines)).toMatchObject({ state: 'Suspense', version: 3 })
    expect(lines.conflict.value).toBeNull()
  })

  it('409 stale_version: Take theirs keeps the server line without sending again', async () => {
    const lines = await setup()
    vi.mocked(setLineState).mockRejectedValueOnce(staleError)

    await lines.apply(l6, suspense)
    lines.takeTheirs()

    expect(setLineState).toHaveBeenCalledTimes(1)
    expect(row(lines)).toEqual(splitByOtherUser)
    expect(lines.conflict.value).toBeNull()
  })

  it('422: rolls back and keeps the field error for the row', async () => {
    const lines = await setup()
    vi.mocked(setLineState).mockRejectedValue(
      new ApiError({
        type: '/problems/validation',
        title: 'The request is not valid',
        status: 422,
        code: 'validation',
        errors: { line: ['Invalid line: it can only be excluded'] },
      }),
    )

    const error = await lines.apply(l6, suspense)

    expect(error?.code).toBe('validation')
    expect(row(lines)).toEqual(l6)
    expect(lines.rowErrors.get('L-6')).toBe('Invalid line: it can only be excluded')
    expect(lines.conflict.value).toBeNull()
  })

  it('any other failure still rolls back', async () => {
    const lines = await setup()
    vi.mocked(setLineState).mockRejectedValue(
      new ApiError({ type: 'x', title: 'Simulated failure', status: 500, code: 'internal' }),
    )

    await lines.apply(l6, suspense)

    expect(row(lines)).toEqual(l6)
    expect(lines.pending.has('L-6')).toBe(false)
  })
})
