export interface AllocationInput {
  id: string
  amountCents: number
}

export interface AllocationShare {
  chargeId: string
  amountCents: number
}

export function allocate(paidCents: number, charges: AllocationInput[]): AllocationShare[] {
  throw new Error(`allocate(${paidCents}, ${charges.length} charges): not implemented`)
}
