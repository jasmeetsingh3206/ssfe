import { ref, toValue, watch, type MaybeRefOrGetter } from 'vue'
import { ApiError, getBatch } from '../api/client'
import type { BatchSummary } from '../api/types'

export function useBatch(id: MaybeRefOrGetter<string>) {
  const data = ref<BatchSummary | null>(null)
  const loading = ref(false)
  const error = ref<ApiError | null>(null)
  let latestRequest = 0

  async function reload() {
    const request = ++latestRequest
    loading.value = true
    error.value = null
    try {
      const batch = await getBatch(toValue(id))
      if (request === latestRequest) data.value = batch
    } catch (e) {
      if (!(e instanceof ApiError)) throw e
      if (request === latestRequest) {
        data.value = null
        error.value = e
      }
    } finally {
      if (request === latestRequest) loading.value = false
    }
  }

  watch(() => toValue(id), reload, { immediate: true })

  return { data, loading, error, reload }
}
