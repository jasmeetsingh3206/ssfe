import axios from 'axios'
import type {
  BatchSummary,
  Charge,
  Line,
  MatchRequest,
  Problem,
  ProblemCode,
  StateRequest,
} from './types'

export class ApiError extends Error {
  status: number
  code: ProblemCode
  current?: Line
  errors?: Record<string, string[]>

  constructor(problem: Problem) {
    super(problem.title)
    this.status = problem.status
    this.code = problem.code
    this.current = problem.current
    this.errors = problem.errors
  }
}

const http = axios.create({ baseURL: '/api' })

http.interceptors.response.use(undefined, (error: unknown) => {
  if (axios.isCancel(error)) throw error

  if (axios.isAxiosError<Problem>(error) && error.response?.data?.code) {
    throw new ApiError(error.response.data)
  }

  throw new ApiError({
    type: 'network',
    title: 'Could not reach the server',
    status: 0,
    code: 'internal',
  })
})

export async function getBatch(id: string): Promise<BatchSummary> {
  const res = await http.get<BatchSummary>(`/batches/${encodeURIComponent(id)}`)
  return res.data
}

export async function getLines(batchId: string): Promise<Line[]> {
  const res = await http.get<Line[]>(`/batches/${encodeURIComponent(batchId)}/lines`)
  return res.data
}

export async function searchCharges(q: string, signal?: AbortSignal): Promise<Charge[]> {
  const res = await http.get<Charge[]>('/charges', { params: { q }, signal })
  return res.data
}

export async function matchLine(id: string, body: MatchRequest): Promise<Line> {
  const res = await http.put<Line>(`/lines/${encodeURIComponent(id)}/match`, body)
  return res.data
}

export async function setLineState(id: string, body: StateRequest): Promise<Line> {
  const res = await http.put<Line>(`/lines/${encodeURIComponent(id)}/state`, body)
  return res.data
}
