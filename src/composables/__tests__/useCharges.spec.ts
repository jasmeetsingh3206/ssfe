import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope } from 'vue'
import { ApiError, searchCharges } from '../../api/client'
import type { Charge } from '../../api/types'
import { useCharges } from '../useCharges'

vi.mock('../../api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/client')>()),
  searchCharges: vi.fn<typeof searchCharges>(),
}))

const charge = (id: string): Charge => ({
  id,
  labId: 'LAB-A',
  claimId: 'C-504',
  code: '88305',
  dateOfService: '2026-10-02',
  amount: '250.00',
})

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

const serverError = new ApiError({
  type: 'x',
  title: 'Server error',
  status: 500,
  code: 'internal',
})

let scope: ReturnType<typeof effectScope>
const setup = () => scope.run(() => useCharges())!

beforeEach(() => {
  vi.useFakeTimers()
  vi.mocked(searchCharges).mockReset()
  scope = effectScope()
})

afterEach(() => {
  scope.stop()
  vi.useRealTimers()
})

describe('useCharges', () => {
  it('waits 300 ms after the last keystroke before searching', async () => {
    vi.mocked(searchCharges).mockResolvedValue([charge('CH-41')])
    const charges = setup()

    charges.search('C')
    await vi.advanceTimersByTimeAsync(200)
    charges.search('C-5')
    await vi.advanceTimersByTimeAsync(299)
    expect(searchCharges).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1)
    expect(searchCharges).toHaveBeenCalledTimes(1)
    expect(vi.mocked(searchCharges).mock.calls[0]?.[0]).toBe('C-5')
  })

  it('a slow old response never overwrites a fast new one', async () => {
    const slow = deferred<Charge[]>()
    const fast = deferred<Charge[]>()
    vi.mocked(searchCharges).mockReturnValueOnce(slow.promise).mockReturnValueOnce(fast.promise)
    const charges = setup()

    charges.search('C-50')
    await vi.advanceTimersByTimeAsync(300)
    charges.search('C-504')
    await vi.advanceTimersByTimeAsync(300)

    fast.resolve([charge('CH-41')])
    await vi.advanceTimersByTimeAsync(0)
    slow.resolve([charge('CH-OLD')])
    await vi.advanceTimersByTimeAsync(0)

    expect(charges.data.value.map((c) => c.id)).toEqual(['CH-41'])
    expect(charges.loading.value).toBe(false)
  })

  it('an error from an old request never shows over new results', async () => {
    const old = deferred<Charge[]>()
    const fresh = deferred<Charge[]>()
    vi.mocked(searchCharges).mockReturnValueOnce(old.promise).mockReturnValueOnce(fresh.promise)
    const charges = setup()

    charges.search('C-50')
    await vi.advanceTimersByTimeAsync(300)
    charges.search('C-504')
    await vi.advanceTimersByTimeAsync(300)

    fresh.resolve([charge('CH-41')])
    await vi.advanceTimersByTimeAsync(0)
    old.reject(serverError)
    await vi.advanceTimersByTimeAsync(0)

    expect(charges.error.value).toBeNull()
    expect(charges.data.value.map((c) => c.id)).toEqual(['CH-41'])
  })

  it('cancels the old request when a new search starts', async () => {
    vi.mocked(searchCharges).mockReturnValue(new Promise(() => {}))
    const charges = setup()

    charges.search('C-50')
    await vi.advanceTimersByTimeAsync(300)
    const firstSignal = vi.mocked(searchCharges).mock.calls[0]?.[1]
    charges.search('C-504')

    expect(firstSignal?.aborted).toBe(true)
  })

  it('shows the error of the latest request', async () => {
    vi.mocked(searchCharges).mockRejectedValue(serverError)
    const charges = setup()

    charges.search('C-504')
    await vi.advanceTimersByTimeAsync(300)

    expect(charges.error.value).toBe(serverError)
    expect(charges.loading.value).toBe(false)
  })

  it('an empty query clears results without calling the API', async () => {
    const charges = setup()
    charges.search('   ')
    await vi.advanceTimersByTimeAsync(300)

    expect(searchCharges).not.toHaveBeenCalled()
    expect(charges.data.value).toEqual([])
    expect(charges.loading.value).toBe(false)
  })
})
