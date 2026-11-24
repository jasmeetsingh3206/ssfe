<script setup lang="ts">
import { ref } from 'vue'
import Message from 'primevue/message'
import ConfirmDialog from 'primevue/confirmdialog'
import { useConfirm } from 'primevue/useconfirm'
import BatchHeader from '../components/BatchHeader.vue'
import LinesTable from '../components/LinesTable.vue'
import MatchDialog from '../components/MatchDialog.vue'
import ConflictDialog from '../components/ConflictDialog.vue'
import type { ApiError } from '../api/client'
import type { Line, StateRequest } from '../api/types'
import { useBatch } from '../composables/useBatch'
import { useLines } from '../composables/useLines'
import type { LineChange } from '../batch/changes'

const props = defineProps<{ id: string }>()

const {
  data: batch,
  loading: batchLoading,
  error: batchError,
  reload: reloadBatch,
} = useBatch(() => props.id)

const {
  data: lines,
  loading: linesLoading,
  error: linesError,
  pending,
  rowErrors,
  conflict,
  reload: reloadLines,
  apply,
  keepMine,
  takeTheirs,
} = useLines(() => props.id)

const confirm = useConfirm()
const announcement = ref('')
const matching = ref<Line | null>(null)

function report(line: Line, error: ApiError | null) {
  if (!error) return
  if (error.code === 'stale_version') {
    announcement.value = `${line.id} was changed by someone else. Choose which version to keep.`
  } else if (error.code === 'batch_posted') {
    reloadBatch()
    reloadLines()
    announcement.value = 'This batch has been posted. The screen is now read-only.'
  } else {
    announcement.value = `${line.id}: ${rowErrors.get(line.id) ?? error.message}`
  }
}

async function run(line: Line, change: LineChange) {
  announcement.value = ''
  report(line, await apply(line, change))
}

function onSetState(line: Line, state: StateRequest['state'], reason?: string) {
  if (state === 'Unmatched') return confirmUnmatch(line)
  run(line, { type: 'state', state, reason })
}

function confirmUnmatch(line: Line) {
  const charges = line.allocations.map((a) => a.chargeId).join(', ')
  confirm.require({
    header: `Unmatch ${line.id}?`,
    message: charges
      ? `This removes its allocation to ${charges} and moves it back to Unmatched.`
      : 'This moves it back to Unmatched.',
    defaultFocus: 'reject',
    rejectProps: { label: 'Cancel', severity: 'secondary', outlined: true, size: 'small' },
    acceptProps: { label: 'Unmatch', size: 'small' },
    accept: () => run(line, { type: 'state', state: 'Unmatched' }),
  })
}

function onUnmatch(line: Line) {
  matching.value = null
  confirmUnmatch(line)
}

function onMatch(line: Line, shares: { chargeId: string; amountCents: number }[]) {
  matching.value = null
  run(line, { type: 'match', shares })
}

async function onKeepMine() {
  const line = conflict.value?.theirs
  const error = await keepMine()
  if (line) report(line, error)
}

function onTakeTheirs() {
  const line = conflict.value?.theirs
  takeTheirs()
  if (line) announcement.value = `${line.id} now shows the server's version.`
}
</script>

<template>
  <main class="flex flex-col gap-4 px-6 py-6">
    <h1 class="text-2xl font-semibold">Batch {{ id }}</h1>

    <p v-if="(batchLoading && !batch) || (linesLoading && !lines.length)" class="text-slate-500">
      Loading…
    </p>

    <Message v-else-if="(batchError && !batch) || linesError" severity="error">
      {{ (batchError ?? linesError)?.message }}
    </Message>

    <template v-else-if="batch">
      <BatchHeader :batch="batch" :lines="lines" />

      <p
        v-if="batch.status === 'Posted'"
        class="rounded-md border border-slate-200 bg-white px-4 py-2 text-slate-600 shadow-sm"
      >
        This batch is posted and read-only.
      </p>

      <LinesTable
        :lines="lines"
        :read-only="batch.status === 'Posted'"
        :pending="pending"
        :row-errors="rowErrors"
        @set-state="onSetState"
        @match="(line) => (matching = line)"
      />
    </template>

    <MatchDialog
      :line="matching"
      @close="matching = null"
      @confirm="onMatch"
      @unmatch="onUnmatch"
    />

    <ConflictDialog :conflict="conflict" @keep-mine="onKeepMine" @take-theirs="onTakeTheirs" />

    <ConfirmDialog class="w-full max-w-md" />

    <div aria-live="polite" class="text-red-700">{{ announcement }}</div>
  </main>
</template>
