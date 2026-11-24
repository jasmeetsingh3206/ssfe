<script setup lang="ts">
import { ref } from 'vue'
import Message from 'primevue/message'
import BatchHeader from '../components/BatchHeader.vue'
import LinesTable from '../components/LinesTable.vue'
import { ApiError, setLineState } from '../api/client'
import type { Line, StateRequest } from '../api/types'
import { useBatch } from '../composables/useBatch'
import { useLines } from '../composables/useLines'

const props = defineProps<{ id: string }>()

const { data: batch, loading: batchLoading, error: batchError } = useBatch(() => props.id)
const { data: lines, loading: linesLoading, error: linesError, replace } = useLines(() => props.id)

const announcement = ref('')

async function onSetState(line: Line, state: StateRequest['state'], reason?: string) {
  announcement.value = ''
  try {
    replace(await setLineState(line.id, { version: line.version, state, reason }))
  } catch (e) {
    if (!(e instanceof ApiError)) throw e
    const details = Object.values(e.errors ?? {}).flat()
    announcement.value = `${line.id}: ${details[0] ?? e.message}`
  }
}
</script>

<template>
  <main class="flex flex-col gap-4 px-6 py-6">
    <h1 class="text-2xl font-semibold">Batch {{ id }}</h1>

    <p v-if="batchLoading || linesLoading" class="text-slate-500">Loading…</p>

    <Message v-else-if="batchError || linesError" severity="error">
      {{ (batchError ?? linesError)?.message }}
    </Message>

    <template v-else-if="batch">
      <BatchHeader :batch="batch" :lines="lines" />

      <Message v-if="batch.status === 'Posted'" severity="info">
        This batch is posted and read-only.
      </Message>

      <LinesTable :lines="lines" :read-only="batch.status === 'Posted'" @set-state="onSetState" />
    </template>

    <div aria-live="polite" class="text-red-700">{{ announcement }}</div>
  </main>
</template>
