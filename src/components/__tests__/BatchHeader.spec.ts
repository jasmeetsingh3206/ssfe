import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import BatchHeader from '../BatchHeader.vue'
import type { BatchSummary, Line, LineState } from '../../api/types'

const batch = (status: 'Open' | 'Posted' = 'Open', canPost = false): BatchSummary => ({
  id: 'B-104',
  labId: 'LAB-A',
  expectedAmount: '505.00',
  status,
  totals: { Matched: '230.00', Unmatched: '275.00', Suspense: '0.00', Excluded: '0.00' },
  canPost,
})

const line = (id: string, paid: string, state: LineState): Line => ({
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
})

const afterImport = [
  line('L-1', '120.00', 'Matched'),
  line('L-2', '30.00', 'Matched'),
  line('L-3', '-200.00', 'Matched'),
  line('L-4', '180.00', 'Matched'),
  line('L-5', '100.00', 'Matched'),
  line('L-6', '200.00', 'Unmatched'),
  line('L-7', '50.00', 'Unmatched'),
  line('L-8', '0.00', 'Matched'),
  line('L-9', '25.00', 'Unmatched'),
]

describe('BatchHeader', () => {
  it('B-104 after import: totals, difference and every reason', () => {
    const text = mount(BatchHeader, { props: { batch: batch(), lines: afterImport } }).text()
    expect(text).toContain('Expected$505.00')
    expect(text).toContain('Matched$230.00')
    expect(text).toContain('Unmatched$275.00')
    expect(text).toContain('Difference-$275.00')
    expect(text).toContain('Not ready')
    expect(text).toContain('3 lines unmatched')
    expect(text).toContain('Totals differ by $275.00')
  })

  it('recalculates when a line changes', async () => {
    const wrapper = mount(BatchHeader, { props: { batch: batch(), lines: afterImport } })
    const resolved = afterImport.map((l) =>
      l.state === 'Unmatched' ? { ...l, state: 'Suspense' as const } : l,
    )
    await wrapper.setProps({ lines: resolved })
    expect(wrapper.text()).toContain('Ready to post')
    expect(wrapper.text()).toContain('Difference$0.00')
  })

  it('a Posted batch is not ready', () => {
    const text = mount(BatchHeader, { props: { batch: batch('Posted'), lines: [] } }).text()
    expect(text).toContain('Not ready')
    expect(text).toContain('Batch is already posted')
  })

  it('agrees with the server: no warning when both say not ready', () => {
    const text = mount(BatchHeader, { props: { batch: batch(), lines: afterImport } }).text()
    expect(text).not.toContain('The server says')
  })

  it('warns when the server canPost disagrees', () => {
    const text = mount(BatchHeader, {
      props: { batch: batch('Open', true), lines: afterImport },
    }).text()
    expect(text).toContain('The server says this batch is ready')
  })

  it('does not warn while the server summary is reloading', () => {
    const text = mount(BatchHeader, {
      props: { batch: batch('Open', true), lines: afterImport, checking: true },
    }).text()
    expect(text).not.toContain('The server says')
  })
})
