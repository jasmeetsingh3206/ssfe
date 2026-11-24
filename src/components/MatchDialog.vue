<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Checkbox from 'primevue/checkbox'
import Message from 'primevue/message'
import type { Charge, Line } from '../api/types'
import { useCharges } from '../composables/useCharges'
import { allocate } from '../money/allocate'
import { formatCents, parseCents } from '../money/cents'

const props = defineProps<{ line: Line | null }>()

const emit = defineEmits<{
  close: []
  unmatch: [line: Line]
  confirm: [line: Line, shares: { chargeId: string; amountCents: number }[]]
}>()

const { data: charges, loading, error, search } = useCharges()
const query = ref('')
const selected = ref<Charge[]>([])
let opener: HTMLElement | null = null

watch(
  () => props.line,
  (line) => {
    if (!line) return
    opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    selected.value = []
    if (line.state === 'Matched') return
    query.value = line.claimId
    search(line.claimId)
  },
)

watch(query, (q) => search(q))

const viewOnly = computed(() => props.line?.state === 'Matched')

const money = (amount: string) => formatCents(parseCents(amount))

const isSelected = (charge: Charge) => selected.value.some((c) => c.id === charge.id)

const canSelect = (charge: Charge) => charge.claimId === props.line?.claimId

function toggle(charge: Charge) {
  selected.value = isSelected(charge)
    ? selected.value.filter((c) => c.id !== charge.id)
    : [...selected.value, charge]
}

const preview = computed(() => {
  if (!props.line || selected.value.length === 0) return []
  const picked = selected.value.map((c) => ({ id: c.id, amountCents: parseCents(c.amount) }))
  try {
    return allocate(parseCents(props.line.paid), picked)
  } catch {
    return []
  }
})

function confirm() {
  if (props.line && preview.value.length > 0) emit('confirm', props.line, preview.value)
}

function restoreFocus() {
  if (opener?.isConnected) opener.focus()
}
</script>

<template>
  <Dialog
    :visible="line !== null"
    modal
    :header="line ? (viewOnly ? `${line.id} is matched` : `Match ${line.id}`) : ''"
    class="w-full max-w-2xl"
    @update:visible="emit('close')"
    @after-hide="restoreFocus"
  >
    <div v-if="line" class="flex flex-col gap-4">
      <p class="text-slate-600">
        Claim {{ line.claimId }} · Code {{ line.code }} · {{ line.dateOfService }} · Paid
        <span class="font-semibold text-slate-900">{{ money(line.paid) }}</span>
      </p>

      <template v-if="viewOnly">
        <div class="overflow-hidden rounded-md border border-slate-200">
          <p
            class="border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold tracking-wide text-slate-600 uppercase"
          >
            {{ line.allocations.length > 1 ? 'Split across' : 'Matched to' }}
          </p>
          <ul class="divide-y divide-slate-200">
            <li
              v-for="allocation in line.allocations"
              :key="allocation.chargeId"
              class="flex justify-between px-3 py-2"
            >
              <span>{{ allocation.chargeId }}</span>
              <span class="font-medium tabular-nums">{{ money(allocation.amount) }}</span>
            </li>
          </ul>
        </div>
        <p class="text-slate-500">To change it, unmatch the line and match it again.</p>
        <div class="flex justify-end gap-2">
          <Button
            label="Unmatch"
            severity="secondary"
            outlined
            size="small"
            @click="emit('unmatch', line)"
          >
            <template #icon>
              <span class="mr-2 h-2 w-2 rounded-full bg-amber-500"></span>
            </template>
          </Button>
          <Button
            label="Close"
            severity="secondary"
            outlined
            size="small"
            autofocus
            @click="emit('close')"
          />
        </div>
      </template>

      <template v-else>
        <div class="flex flex-col gap-1">
          <label for="charge-search" class="text-slate-600">Search charges by claim or code</label>
          <InputText id="charge-search" v-model="query" type="search" size="small" autofocus />
        </div>

        <div class="max-h-64 overflow-y-auto rounded-md border border-slate-200">
          <p v-if="loading" class="p-3 text-slate-500">Searching…</p>
          <Message v-else-if="error" severity="error" class="m-3">{{ error.message }}</Message>
          <p v-else-if="charges.length === 0" class="p-3 text-slate-500">No charges found.</p>
          <ul v-else class="divide-y divide-slate-200">
            <li
              v-for="charge in charges"
              :key="charge.id"
              class="flex items-center gap-3 px-3 py-2"
              :class="canSelect(charge) ? '' : 'text-slate-400'"
            >
              <Checkbox
                :input-id="`charge-${charge.id}`"
                binary
                :model-value="isSelected(charge)"
                :disabled="!canSelect(charge)"
                @update:model-value="toggle(charge)"
              />
              <label :for="`charge-${charge.id}`" class="flex flex-1 justify-between gap-4">
                <span>
                  <span class="font-medium">{{ charge.id }}</span>
                  · {{ charge.claimId }} · {{ charge.code }} · {{ charge.dateOfService }}
                </span>
                <span class="tabular-nums">{{ money(charge.amount) }}</span>
              </label>
              <span v-if="!canSelect(charge)" class="text-xs">Other claim</span>
            </li>
          </ul>
        </div>

        <div v-if="preview.length" class="overflow-hidden rounded-md border border-slate-200">
          <p
            class="border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold tracking-wide text-slate-600 uppercase"
          >
            {{ preview.length > 1 ? 'Split preview' : 'Match preview' }}
          </p>
          <ul class="divide-y divide-slate-200">
            <li
              v-for="share in preview"
              :key="share.chargeId"
              class="flex justify-between px-3 py-2"
            >
              <span>{{ share.chargeId }}</span>
              <span class="font-medium tabular-nums">{{ formatCents(share.amountCents) }}</span>
            </li>
          </ul>
        </div>

        <div class="flex justify-end gap-2">
          <Button
            label="Cancel"
            severity="secondary"
            outlined
            size="small"
            @click="emit('close')"
          />
          <Button
            size="small"
            :label="selected.length > 1 ? `Split across ${selected.length} charges` : 'Match'"
            :disabled="preview.length === 0"
            @click="confirm"
          />
        </div>
      </template>
    </div>
  </Dialog>
</template>
