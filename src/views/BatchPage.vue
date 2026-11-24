<script setup lang="ts">
defineProps<{ id: string }>()
</script>

<template>
  <main class="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6">
    <h1 class="text-2xl font-semibold">Batch {{ id }}</h1>

    <section class="rounded-md border border-slate-200 bg-white p-4" aria-label="Batch summary">
      <p class="text-slate-500">Header: expected amount, totals per state, ready to post</p>
    </section>

    <section class="rounded-md border border-slate-200 bg-white p-4" aria-label="Lines">
      <p class="text-slate-500">Lines table</p>
    </section>

    <div aria-live="polite"></div>
  </main>
</template>
