<template>
  <div class="min-h-screen bg-slate-50 text-sm text-slate-900">
    <header class="border-b border-slate-200 bg-white">
      <nav class="flex items-center gap-6 px-6 py-3">
        <img
          src="https://www.netsoftusa.com/wp-content/uploads/2026/01/logo-pro.jpg"
          alt="NetSoft"
          class="h-10 w-auto"
        />
        <RouterLink to="/batches/B-104" class="font-medium text-slate-700 hover:text-slate-900">
          Remittance Review
        </RouterLink>
      </nav>
    </header>

    <RouterView />
  </div>
</template>
