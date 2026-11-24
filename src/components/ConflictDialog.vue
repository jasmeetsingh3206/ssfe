<script setup lang="ts">
import { watch } from 'vue'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import type { Line } from '../api/types'
import type { Conflict } from '../composables/useLines'
import { describeChange } from '../batch/changes'
import { formatCents, parseCents } from '../money/cents'

const props = defineProps<{ conflict: Conflict | null }>()

const emit = defineEmits<{
  keepMine: []
  takeTheirs: []
}>()

let opener: HTMLElement | null = null

watch(
  () => props.conflict,
  (conflict) => {
    if (conflict) {
      opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    }
  },
)

function restoreFocus() {
  if (opener?.isConnected) opener.focus()
}

const describe = (line: Line) => {
  const allocations = line.allocations
    .map((a) => `${a.chargeId} ${formatCents(parseCents(a.amount))}`)
    .join(', ')
  if (allocations) return `${line.state}: ${allocations}`
  if (line.reason) return `${line.state}: ${line.reason}`
  return line.state
}
</script>

<template>
  <Dialog
    :visible="conflict !== null"
    modal
    :closable="false"
    :header="conflict ? `${conflict.theirs.id} was changed by someone else` : ''"
    class="w-full max-w-xl"
    @after-hide="restoreFocus"
  >
    <div v-if="conflict" class="flex flex-col gap-4">
      <p class="text-slate-600">Your change was not saved. Choose which version to keep.</p>

      <div class="grid grid-cols-2 overflow-hidden rounded-md border border-slate-200">
        <div class="border-r border-slate-200 p-3">
          <p class="text-xs font-semibold tracking-wide text-slate-500 uppercase">Your change</p>
          <p class="mt-1 font-medium">{{ describeChange(conflict.change) }}</p>
        </div>
        <div class="p-3">
          <p class="text-xs font-semibold tracking-wide text-slate-500 uppercase">
            Server now (version {{ conflict.theirs.version }})
          </p>
          <p class="mt-1 font-medium">{{ describe(conflict.theirs) }}</p>
        </div>
      </div>

      <div class="flex justify-end gap-2">
        <Button
          label="Take theirs"
          severity="secondary"
          outlined
          size="small"
          autofocus
          @click="emit('takeTheirs')"
        />
        <Button label="Keep mine" size="small" @click="emit('keepMine')" />
      </div>
    </div>
  </Dialog>
</template>
