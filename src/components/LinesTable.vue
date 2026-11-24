<script setup lang="ts">
import { computed, ref } from 'vue'
import DataTable, { type DataTableSortEvent } from 'primevue/datatable'
import Column from 'primevue/column'
import Select from 'primevue/select'
import Button from 'primevue/button'
import SplitButton from 'primevue/splitbutton'
import type { MenuItem } from 'primevue/menuitem'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Tooltip from 'primevue/tooltip'
import type { Line, LineState, StateRequest } from '../api/types'
import { formatCents, parseCents } from '../money/cents'

const props = defineProps<{ lines: Line[]; readOnly: boolean }>()

const emit = defineEmits<{
  match: [line: Line]
  setState: [line: Line, state: StateRequest['state'], reason?: string]
}>()

const stateOptions = [
  { label: 'All states', value: null },
  { label: 'Unmatched', value: 'Unmatched' },
  { label: 'Matched', value: 'Matched' },
  { label: 'Suspense', value: 'Suspense' },
  { label: 'Excluded', value: 'Excluded' },
]
const stateFilter = ref<LineState | null>(null)

const sortField = ref<'dateOfService' | 'paid'>('dateOfService')
const sortOrder = ref<1 | -1>(1)

function onSort(event: DataTableSortEvent) {
  sortField.value = event.sortField === 'paid' ? 'paid' : 'dateOfService'
  sortOrder.value = event.sortOrder === -1 ? -1 : 1
}

const search = ref('')

const searchText = (line: Line) =>
  [
    line.id,
    line.claimId,
    line.code,
    line.originalCode,
    line.dateOfService,
    line.state,
    line.remark,
    line.billed,
    line.paid,
    line.adjustments,
    ...line.allocations.map((a) => a.chargeId),
  ]
    .join(' ')
    .toLowerCase()

const rows = computed(() => {
  const query = search.value.trim().toLowerCase()
  const filtered = props.lines.filter(
    (l) =>
      (!stateFilter.value || l.state === stateFilter.value) &&
      (!query || searchText(l).includes(query)),
  )

  return [...filtered].sort((a, b) => {
    const byField =
      sortField.value === 'paid'
        ? parseCents(a.paid) - parseCents(b.paid)
        : a.dateOfService.localeCompare(b.dateOfService)
    return (byField || a.id.localeCompare(b.id)) * sortOrder.value
  })
})

const stateDot: Record<LineState, string> = {
  Matched: 'bg-green-600',
  Unmatched: 'bg-amber-500',
  Suspense: 'bg-sky-600',
  Excluded: 'bg-slate-400',
}

const vTooltip = Tooltip

const money = (amount: string) => formatCents(parseCents(amount))

const isValid = (line: Line) =>
  parseCents(line.billed) === parseCents(line.paid) + parseCents(line.adjustments)

const allocatedTo = (line: Line) =>
  line.allocations.map((a) => `${a.chargeId} ${money(a.amount)}`).join(', ')

const excluding = ref<Line | null>(null)
const reason = ref('')
const reasonOk = computed(
  () => reason.value.trim().length >= 1 && reason.value.trim().length <= 200,
)

function startExclude(line: Line) {
  excluding.value = line
  reason.value = ''
}

function moreActions(line: Line): MenuItem[] {
  const valid = isValid(line)
  return [
    {
      label: 'Suspense',
      state: 'Suspense',
      disabled: props.readOnly || !valid || line.state === 'Suspense',
      command: () => emit('setState', line, 'Suspense'),
    },
    {
      label: 'Exclude',
      state: 'Excluded',
      disabled: props.readOnly || line.state === 'Excluded',
      command: () => startExclude(line),
    },
    {
      label: 'Unmatch',
      state: 'Unmatched',
      disabled: props.readOnly || !valid || line.state === 'Unmatched',
      command: () => emit('setState', line, 'Unmatched'),
    },
  ]
}

function confirmExclude() {
  if (excluding.value && reasonOk.value) {
    emit('setState', excluding.value, 'Excluded', reason.value.trim())
  }
  excluding.value = null
}
</script>

<template>
  <section class="flex flex-col gap-3" aria-label="Lines">
    <div class="flex items-center justify-between gap-3">
      <div class="flex items-center gap-2">
        <label for="state-filter" class="text-slate-600">State</label>
        <Select
          v-model="stateFilter"
          input-id="state-filter"
          :options="stateOptions"
          option-label="label"
          option-value="value"
          size="small"
          class="w-40"
        />
        <span class="ml-2 text-slate-500">{{ rows.length }} of {{ lines.length }} lines</span>
      </div>
      <InputText
        v-model="search"
        type="search"
        size="small"
        placeholder="Search lines"
        aria-label="Search lines"
        class="w-64"
      />
    </div>

    <DataTable
      :value="rows"
      data-key="id"
      lazy
      :sort-field="sortField"
      :sort-order="sortOrder"
      scrollable
      scroll-height="600px"
      :virtual-scroller-options="lines.length > 100 ? { itemSize: 44 } : undefined"
      size="small"
      striped-rows
      class="overflow-hidden rounded-md border border-slate-200 whitespace-nowrap shadow-sm [&_th]:bg-slate-100 [&_th]:text-xs [&_th]:font-semibold [&_th]:tracking-wide [&_th]:text-slate-600 [&_th]:uppercase"
      @sort="onSort"
    >
      <template #empty>
        <p class="py-4 text-center text-slate-500">No lines match.</p>
      </template>
      <Column field="id" header="Line" body-class="font-medium" />
      <Column field="claimId" header="Claim" />
      <Column header="Code">
        <template #body="{ data }">
          {{ data.code }}
          <span v-if="data.originalCode" class="text-slate-500">
            (orig. {{ data.originalCode }})
          </span>
        </template>
      </Column>
      <Column field="dateOfService" header="Date" sortable />
      <Column
        header="Billed"
        header-class="[&>div]:justify-end"
        body-class="text-right tabular-nums"
      >
        <template #body="{ data }">{{ money(data.billed) }}</template>
      </Column>
      <Column
        field="paid"
        header="Paid"
        sortable
        header-class="[&>div]:justify-end"
        body-class="text-right tabular-nums"
      >
        <template #body="{ data }">{{ money(data.paid) }}</template>
      </Column>
      <Column
        header="Adjustments"
        header-class="[&>div]:justify-end"
        body-class="text-right tabular-nums"
      >
        <template #body="{ data }">{{ money(data.adjustments) }}</template>
      </Column>
      <Column header="State">
        <template #body="{ data }">
          <div class="flex items-center gap-3">
            <span class="inline-flex items-center gap-2">
              <span class="h-2 w-2 rounded-full" :class="stateDot[data.state as LineState]"></span>
              {{ data.state }}
            </span>
            <span
              v-if="!isValid(data)"
              v-tooltip.top="'Billed does not equal paid + adjustments. Only Exclude is allowed.'"
              class="inline-flex cursor-help items-center gap-1 text-xs font-medium text-red-700"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4" aria-hidden="true">
                <path
                  fill-rule="evenodd"
                  d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
                  clip-rule="evenodd"
                />
              </svg>
              Invalid
            </span>
          </div>
        </template>
      </Column>
      <Column header="Allocated to" body-class="text-slate-600">
        <template #body="{ data }">{{ allocatedTo(data) || '—' }}</template>
      </Column>
      <Column header="Remark" body-class="text-slate-600">
        <template #body="{ data }">
          <span class="block max-w-56 truncate" :title="data.remark">{{ data.remark }}</span>
        </template>
      </Column>
      <Column header="Actions">
        <template #body="{ data }">
          <SplitButton
            label="Match"
            outlined
            severity="success"
            size="small"
            :model="moreActions(data)"
            :disabled="readOnly"
            :button-props="{ disabled: readOnly || !isValid(data) }"
            :menu-button-props="{ 'aria-label': `More actions for ${data.id}` }"
            @click="emit('match', data)"
          >
            <template #menuitemicon="{ item }">
              <span
                class="mr-2 h-2 w-2 rounded-full"
                :class="stateDot[item.state as LineState]"
              ></span>
            </template>
          </SplitButton>
        </template>
      </Column>
    </DataTable>

    <Dialog
      :visible="excluding !== null"
      modal
      :header="`Exclude ${excluding?.id}`"
      class="w-full max-w-md"
      @update:visible="excluding = null"
    >
      <form class="flex flex-col gap-3" @submit.prevent="confirmExclude">
        <label for="exclude-reason">Reason (1 to 200 characters)</label>
        <InputText id="exclude-reason" v-model="reason" maxlength="200" autofocus />
        <div class="flex justify-end gap-2">
          <Button label="Cancel" severity="secondary" outlined @click="excluding = null" />
          <Button type="submit" label="Exclude" :disabled="!reasonOk" />
        </div>
      </form>
    </Dialog>
  </section>
</template>
