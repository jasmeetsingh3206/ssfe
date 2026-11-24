<script setup lang="ts">
import { computed } from 'vue'
import type { BatchSummary, Line, LineState } from '../api/types'
import { readiness } from '../batch/readiness'
import { formatCents, parseCents } from '../money/cents'
import { stateDot } from '../batch/stateColors'

const props = defineProps<{ batch: BatchSummary; lines: Line[] }>()

const states: LineState[] = ['Matched', 'Suspense', 'Excluded', 'Unmatched']

const totals = computed(() => {
  const sums: Record<LineState, number> = { Matched: 0, Suspense: 0, Excluded: 0, Unmatched: 0 }
  for (const line of props.lines) sums[line.state] += parseCents(line.paid)
  return sums
})

const difference = computed(() => {
  const resolved = totals.value.Matched + totals.value.Suspense + totals.value.Excluded
  return resolved - parseCents(props.batch.expectedAmount)
})

const status = computed(() => readiness(props.batch, props.lines))
</script>

<template>
  <section
    class="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm"
    aria-label="Batch summary"
  >
    <div
      class="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-slate-200 bg-slate-50 px-4 py-3"
    >
      <span class="inline-flex items-center gap-2 font-semibold">
        <span
          class="h-2.5 w-2.5 rounded-full"
          :class="status.ready ? 'bg-green-600' : 'bg-amber-500'"
        ></span>
        {{ status.ready ? 'Ready to post' : 'Not ready' }}
      </span>
      <span class="text-slate-600">{{ status.reasons.join(' · ') }}</span>
    </div>

    <dl class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
      <div class="border-slate-200 px-4 py-3 lg:border-r">
        <dt class="text-xs font-semibold tracking-wide text-slate-500 uppercase">Expected</dt>
        <dd class="mt-1 text-lg font-semibold tabular-nums">
          {{ formatCents(parseCents(batch.expectedAmount)) }}
        </dd>
      </div>
      <div v-for="state in states" :key="state" class="border-slate-200 px-4 py-3 lg:border-r">
        <dt
          class="flex items-center gap-2 text-xs font-semibold tracking-wide text-slate-500 uppercase"
        >
          <span class="h-2 w-2 rounded-full" :class="stateDot[state]"></span>
          {{ state }}
        </dt>
        <dd class="mt-1 text-lg tabular-nums">{{ formatCents(totals[state]) }}</dd>
      </div>
      <div class="px-4 py-3">
        <dt class="text-xs font-semibold tracking-wide text-slate-500 uppercase">Difference</dt>
        <dd
          class="mt-1 text-lg font-semibold tabular-nums"
          :class="difference === 0 ? 'text-green-700' : 'text-amber-700'"
        >
          {{ formatCents(difference) }}
        </dd>
      </div>
    </dl>
  </section>
</template>
