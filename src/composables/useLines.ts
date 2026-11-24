import { reactive, ref, shallowRef, toValue, watch, type MaybeRefOrGetter } from 'vue'
import { ApiError, getLines } from '../api/client'
import type { Line } from '../api/types'
import { previewChange, sendChange, type LineChange } from '../batch/changes'

export interface Conflict {
  change: LineChange
  theirs: Line
}

export function useLines(batchId: MaybeRefOrGetter<string>) {
  const data = shallowRef<Line[]>([])
  const loading = ref(false)
  const error = ref<ApiError | null>(null)
  const pending = reactive(new Set<string>())
  const rowErrors = reactive(new Map<string, string>())
  const conflict = shallowRef<Conflict | null>(null)
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

  async function apply(line: Line, change: LineChange): Promise<ApiError | null> {
    pending.add(line.id)
    rowErrors.delete(line.id)
    replace(previewChange(line, change))
    try {
      replace(await sendChange(line, change))
      return null
    } catch (e) {
      replace(line)
      if (!(e instanceof ApiError)) throw e
      if (e.code === 'stale_version' && e.current) {
        conflict.value = { change, theirs: e.current }
      }
      if (e.code === 'validation') {
        rowErrors.set(line.id, Object.values(e.errors ?? {}).flat()[0] ?? e.message)
      }
      return e
    } finally {
      pending.delete(line.id)
    }
  }

  async function keepMine(): Promise<ApiError | null> {
    if (!conflict.value) return null
    const { change, theirs } = conflict.value
    conflict.value = null
    replace(theirs)
    return apply(theirs, change)
  }

  function takeTheirs() {
    if (!conflict.value) return
    replace(conflict.value.theirs)
    conflict.value = null
  }

  watch(
    () => toValue(batchId),
    () => {
      pending.clear()
      rowErrors.clear()
      conflict.value = null
      reload()
    },
    { immediate: true },
  )

  return {
    data,
    loading,
    error,
    pending,
    rowErrors,
    conflict,
    reload,
    apply,
    keepMine,
    takeTheirs,
  }
}
