import { ref, shallowRef, toValue, watch, type MaybeRefOrGetter } from 'vue'
import { ApiError, getLines } from '../api/client'
import type { Line } from '../api/types'

export function useLines(batchId: MaybeRefOrGetter<string>) {
  const data = shallowRef<Line[]>([])
  const loading = ref(false)
  const error = ref<ApiError | null>(null)
  let latestRequest = 0

  async function reload() {
    const request = ++latestRequest
    loading.value = true
    error.value = null
    try {
      const lines = await getLines(toValue(batchId))
      if (request === latestRequest) data.value = lines
    } catch (e) {
      if (!(e instanceof ApiError)) throw e
      if (request === latestRequest) {
        data.value = []
        error.value = e
      }
    } finally {
      if (request === latestRequest) loading.value = false
    }
  }

  function replace(line: Line) {
    data.value = data.value.map((l) => (l.id === line.id ? line : l))
  }

  watch(() => toValue(batchId), reload, { immediate: true })

  return { data, loading, error, reload, replace }
}
