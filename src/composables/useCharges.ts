import { onScopeDispose, ref, shallowRef } from 'vue'
import { ApiError, searchCharges } from '../api/client'
import type { Charge } from '../api/types'

export function useCharges() {
  const data = shallowRef<Charge[]>([])
  const loading = ref(false)
  const error = ref<ApiError | null>(null)

  let timer: ReturnType<typeof setTimeout> | undefined
  let current: AbortController | null = null

  function cancelPending() {
    clearTimeout(timer)
    current?.abort()
    current = null
  }

  function search(query: string) {
    cancelPending()
    error.value = null

    const q = query.trim()
    if (!q) {
      data.value = []
      loading.value = false
      return
    }

    loading.value = true
    timer = setTimeout(() => run(q), 300)
  }

  async function run(q: string) {
    const request = new AbortController()
    current = request
    try {
      const charges = await searchCharges(q, request.signal)
      if (current === request) data.value = charges
    } catch (e) {
      if (current !== request) return
      if (!(e instanceof ApiError)) throw e
      data.value = []
      error.value = e
    } finally {
      if (current === request) loading.value = false
    }
  }

  onScopeDispose(cancelPending)

  return { data, loading, error, search }
}
