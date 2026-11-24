import { afterEach, describe, expect, it } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import PrimeVue from 'primevue/config'
import SplitButton from 'primevue/splitbutton'
import type { MenuItem } from 'primevue/menuitem'
import LinesTable from '../LinesTable.vue'
import type { Line, LineState } from '../../api/types'

const line = (id: string, paid: string, state: LineState, extra: Partial<Line> = {}): Line => ({
  id,
  batchId: 'B-104',
  claimId: 'C-1',
  code: '88305',
  dateOfService: '2026-10-01',
  billed: paid,
  paid,
  adjustments: '0.00',
  state,
  allocations: [],
  version: 1,
  ...extra,
})

const lines = [
  line('L-1', '120.00', 'Matched', { allocations: [{ chargeId: 'CH-11', amount: '120.00' }] }),
  line('L-3', '-200.00', 'Matched', { dateOfService: '2026-10-02' }),
  line('L-8', '0.00', 'Matched', { remark: '<img src=x onerror=alert(1)>' }),
  line('L-9', '25.00', 'Unmatched', { billed: '40.00', adjustments: '10.00' }),
]

function mountTable(readOnly = false) {
  return mount(LinesTable, {
    props: { lines, readOnly },
    global: { plugins: [PrimeVue] },
    attachTo: document.body,
  })
}

const rowIds = (wrapper: ReturnType<typeof mountTable>) =>
  wrapper.findAll('tbody tr').map((tr) => tr.find('td').text())

const rowOf = (wrapper: ReturnType<typeof mountTable>, id: string) =>
  wrapper.findAll('tbody tr').find((tr) => tr.find('td').text() === id)

const matchButton = (wrapper: ReturnType<typeof mountTable>, id: string) =>
  rowOf(wrapper, id)
    ?.findAll('button')
    .find((b) => b.text() === 'Match')

const menuOf = (wrapper: ReturnType<typeof mountTable>, id: string): MenuItem[] =>
  rowOf(wrapper, id)?.findComponent(SplitButton).props('model') ?? []

const disabledItems = (items: MenuItem[]) =>
  Object.fromEntries(items.map((item) => [item.label, item.disabled]))

enableAutoUnmount(afterEach)

describe('LinesTable', () => {
  it('shows every line, sorted by date of service', () => {
    expect(rowIds(mountTable())).toEqual(['L-1', 'L-8', 'L-9', 'L-3'])
  })

  it('shows the HTML remark as plain text', () => {
    const wrapper = mountTable()
    expect(wrapper.find('tbody img').exists()).toBe(false)
    expect(wrapper.text()).toContain('<img src=x onerror=alert(1)>')
  })

  it('marks an invalid line with text and disables what R1 forbids', () => {
    const wrapper = mountTable()
    expect(wrapper.text()).toContain('Invalid')
    expect(matchButton(wrapper, 'L-9')?.attributes('disabled')).toBeDefined()
    expect(disabledItems(menuOf(wrapper, 'L-9'))).toEqual({
      Suspense: true,
      Exclude: false,
      Unmatch: true,
    })
  })

  it('a read-only batch disables every action', () => {
    const wrapper = mountTable(true)
    expect(matchButton(wrapper, 'L-1')?.attributes('disabled')).toBeDefined()
    const more = rowOf(wrapper, 'L-1')?.find('[aria-label="More actions for L-1"]')
    expect(more?.attributes('disabled')).toBeDefined()
  })

  it('sorts paid as money, including negatives', async () => {
    const wrapper = mountTable()
    await wrapper
      .findAll('th')
      .find((th) => th.text().includes('Paid'))
      ?.trigger('click')
    expect(rowIds(wrapper)).toEqual(['L-3', 'L-8', 'L-9', 'L-1'])
  })

  it('filters by state', async () => {
    const wrapper = mountTable()
    wrapper.findComponent({ name: 'Select' }).vm.$emit('update:modelValue', 'Unmatched')
    await wrapper.vm.$nextTick()
    expect(rowIds(wrapper)).toEqual(['L-9'])
  })

  it('searches across all text, case-insensitively', async () => {
    const wrapper = mountTable()
    const search = wrapper.find('input[aria-label="Search lines"]')

    await search.setValue('ch-11')
    expect(rowIds(wrapper)).toEqual(['L-1'])

    await search.setValue('ONERROR')
    expect(rowIds(wrapper)).toEqual(['L-8'])

    await search.setValue('-200.00')
    expect(rowIds(wrapper)).toEqual(['L-3'])

    await search.setValue('')
    expect(rowIds(wrapper)).toHaveLength(4)
  })

  it('combines search with the state filter', async () => {
    const wrapper = mountTable()
    wrapper.findComponent({ name: 'Select' }).vm.$emit('update:modelValue', 'Matched')
    await wrapper.find('input[aria-label="Search lines"]').setValue('L-9')
    expect(wrapper.text()).toContain('0 of 4 lines')
  })

  it('Match emits match for its row', async () => {
    const wrapper = mountTable()
    await matchButton(wrapper, 'L-1')?.trigger('click')
    expect(wrapper.emitted('match')?.[0]).toEqual([lines[0]])
  })

  it('emits a state change from the dropdown', () => {
    const wrapper = mountTable()
    const unmatch = menuOf(wrapper, 'L-1').find((item) => item.label === 'Unmatch')
    unmatch?.command?.({ originalEvent: new Event('click'), item: unmatch })
    expect(wrapper.emitted('setState')?.[0]).toEqual([lines[0], 'Unmatched'])
  })
})
