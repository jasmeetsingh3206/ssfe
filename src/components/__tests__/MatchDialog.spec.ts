import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import PrimeVue from 'primevue/config'
import MatchDialog from '../MatchDialog.vue'
import { searchCharges } from '../../api/client'
import type { Charge, Line } from '../../api/types'

vi.mock('../../api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/client')>()),
  searchCharges: vi.fn<typeof searchCharges>(),
}))

const charge = (id: string, claimId: string, amount: string): Charge => ({
  id,
  labId: 'LAB-A',
  claimId,
  code: '88305',
  dateOfService: '2026-10-02',
  amount,
})

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

enableAutoUnmount(afterEach)

beforeEach(() => {
  vi.useFakeTimers()
  vi.mocked(searchCharges).mockClear()
  vi.mocked(searchCharges).mockResolvedValue([
    charge('CH-41', 'C-504', '250.00'),
    charge('CH-42', 'C-504', '250.00'),
    charge('CH-11', 'C-501', '250.00'),
  ])
})

afterEach(() => {
  vi.useRealTimers()
})

async function openFor(line: Line) {
  const wrapper = mount(MatchDialog, {
    props: { line: null },
    global: { plugins: [PrimeVue], stubs: { teleport: true } },
  })
  await wrapper.setProps({ line })
  await vi.advanceTimersByTimeAsync(300)
  return wrapper
}

const checkbox = (wrapper: Awaited<ReturnType<typeof openFor>>, id: string) =>
  wrapper.find(`#charge-${id}`)

describe('MatchDialog', () => {
  it("searches the line's claim as soon as it opens", async () => {
    const wrapper = await openFor(l6)
    expect(vi.mocked(searchCharges).mock.calls[0]?.[0]).toBe('C-504')
    expect(wrapper.text()).toContain('CH-41')
  })

  it('charges on another claim cannot be selected', async () => {
    const wrapper = await openFor(l6)
    expect(checkbox(wrapper, 'CH-11').attributes('disabled')).toBeDefined()
    expect(checkbox(wrapper, 'CH-41').attributes('disabled')).toBeUndefined()
  })

  it('previews the split to the cent and confirms with the chosen ids', async () => {
    const wrapper = await openFor(l6)
    await checkbox(wrapper, 'CH-41').setValue(true)
    await checkbox(wrapper, 'CH-42').setValue(true)

    expect(wrapper.text()).toContain('Split preview')
    expect(wrapper.text()).toContain('CH-41$100.00')
    expect(wrapper.text()).toContain('CH-42$100.00')

    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Split across 2 charges')
      ?.trigger('click')
    expect(wrapper.emitted('confirm')?.[0]).toEqual([
      l6,
      [
        { chargeId: 'CH-41', amountCents: 10000 },
        { chargeId: 'CH-42', amountCents: 10000 },
      ],
    ])
  })

  it('one charge is a simple match for the full paid amount', async () => {
    const wrapper = await openFor(l6)
    await checkbox(wrapper, 'CH-41').setValue(true)
    expect(wrapper.text()).toContain('Match preview')
    expect(wrapper.text()).toContain('CH-41$200.00')
  })

  it('a matched line shows its allocations instead of a search', async () => {
    const matched: Line = {
      ...l6,
      state: 'Matched',
      allocations: [
        { chargeId: 'CH-41', amount: '100.00' },
        { chargeId: 'CH-42', amount: '100.00' },
      ],
    }
    const wrapper = await openFor(matched)

    expect(searchCharges).not.toHaveBeenCalled()
    expect(wrapper.find('#charge-search').exists()).toBe(false)
    expect(wrapper.text()).toContain('L-6 is matched')
    expect(wrapper.text()).toContain('CH-41$100.00')
    expect(wrapper.text()).toContain('CH-42$100.00')
    expect(wrapper.text()).toContain('unmatch the line and match it again')

    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Unmatch')
      ?.trigger('click')
    expect(wrapper.emitted('unmatch')?.[0]).toEqual([matched])
  })
})
