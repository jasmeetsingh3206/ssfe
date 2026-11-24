<script setup lang="ts">
import { ref } from 'vue'
import Message from 'primevue/message'
import ConfirmDialog from 'primevue/confirmdialog'
import { useConfirm } from 'primevue/useconfirm'
import BatchHeader from '../components/BatchHeader.vue'
import LinesTable from '../components/LinesTable.vue'
import MatchDialog from '../components/MatchDialog.vue'
import { ApiError, matchLine, setLineState } from '../api/client'
import type { Line, StateRequest } from '../api/types'
import { useBatch } from '../composables/useBatch'
import { useLines } from '../composables/useLines'

const props = defineProps<{ id: string }>()

const {
  data: batch,
  loading: batchLoading,
  error: batchError,
  reload: reloadBatch,
} = useBatch(() => props.id)
const { data: lines, loading: linesLoading, error: linesError, replace } = useLines(() => props.id)

const confirm = useConfirm()
const announcement = ref('')
const matching = ref<Line | null>(null)

async function save(line: Line, write: () => Promise<Line>) {
  announcement.value = ''
  try {
    replace(await write())
    reloadBatch()
  } catch (e) {
    if (!(e instanceof ApiError)) throw e
    const details = Object.values(e.errors ?? {}).flat()
    announcement.value = `${line.id}: ${details[0] ?? e.message}`
  }
}

function onSetState(line: Line, state: StateRequest['state'], reason?: string) {
  if (state === 'Unmatched') return confirmUnmatch(line)
  save(line, () => setLineState(line.id, { version: line.version, state, reason }))
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
    accept: () =>
      save(line, () => setLineState(line.id, { version: line.version, state: 'Unmatched' })),
  })
}

function onUnmatch(line: Line) {
  matching.value = null
  confirmUnmatch(line)
}

function onMatch(line: Line, chargeIds: string[]) {
  matching.value = null
  save(line, () => matchLine(line.id, { version: line.version, chargeIds }))
}
</script>

<template>
  <main class="flex flex-col gap-4 px-6 py-6">
    <h1 class="text-2xl font-semibold">Batch {{ id }}</h1>

    <p v-if="(batchLoading && !batch) || linesLoading" class="text-slate-500">Loading…</p>

    <Message v-else-if="(batchError && !batch) || linesError" severity="error">
      {{ (batchError ?? linesError)?.message }}
    </Message>

    <template v-else-if="batch">
      <BatchHeader :batch="batch" :lines="lines" :checking="batchLoading" />

      <p
        v-if="batch.status === 'Posted'"
        class="rounded-md border border-slate-200 bg-white px-4 py-2 text-slate-600 shadow-sm"
      >
        This batch is posted and read-only.
      </p>

      <LinesTable
        :lines="lines"
        :read-only="batch.status === 'Posted'"
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

    <ConfirmDialog class="w-full max-w-md" />

    <div aria-live="polite" class="text-red-700">{{ announcement }}</div>
  </main>
</template>
