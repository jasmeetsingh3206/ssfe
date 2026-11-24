import type { Batch, Line } from '../api/types'

export function readiness(batch: Batch, lines: Line[]): { ready: boolean; reasons: string[] } {
  throw new Error(`readiness(${batch.id}, ${lines.length} lines): not implemented`)
}
