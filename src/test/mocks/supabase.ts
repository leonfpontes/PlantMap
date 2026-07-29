import { vi } from 'vitest'

export interface MockResult<T = unknown> {
  data: T
  error: { message: string } | null
  count?: number | null
}

const CHAINABLE = [
  'select', 'insert', 'update', 'upsert', 'delete',
  'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'is', 'not', 'or',
  'order', 'limit', 'range',
] as const

function makeQueryBuilder(getResult: () => MockResult) {
  const builder = {} as Record<string, unknown>
  for (const method of CHAINABLE) {
    builder[method] = vi.fn(() => builder)
  }
  builder.single = vi.fn(() => Promise.resolve(getResult()))
  builder.maybeSingle = vi.fn(() => Promise.resolve(getResult()))
  builder.then = (resolve: (v: MockResult) => unknown, reject?: (e: unknown) => unknown) =>
    Promise.resolve(getResult()).then(resolve, reject)
  return builder
}

/**
 * Dublê do client do Supabase para testar server actions sem bater no banco.
 * Cobre só o que as actions realmente usam: `.from(table)` e `.rpc(fn)`
 * encadeáveis (ambos podem terminar em `.single()`, como `getOccurrence`
 * faz com `get_occurrence_detail`), resolvendo num resultado configurado
 * por tabela/função.
 *
 * Uma tabela pode ser chamada mais de uma vez na mesma action com propósitos
 * diferentes (ex.: `getUserStats` faz duas queries em `occurrences`) — por
 * isso `queueTableResult` empilha respostas consumidas em FIFO, e
 * `setTableResult` define uma resposta fixa reusada em toda chamada
 * subsequente daquela tabela (usada quando só há uma query por tabela).
 */
export function createSupabaseMock() {
  const tableQueues = new Map<string, MockResult[]>()
  const tableDefaults = new Map<string, MockResult>()
  const rpcResults = new Map<string, MockResult>()
  const rpcCalls: { fn: string; params: unknown }[] = []
  const lastBuilders = new Map<string, ReturnType<typeof makeQueryBuilder>>()
  let currentUser: { id: string; email?: string } | null = null

  function nextTableResult(table: string): MockResult {
    const queue = tableQueues.get(table)
    if (queue && queue.length > 0) return queue.shift()!
    return tableDefaults.get(table) ?? { data: null, error: null }
  }

  const client = {
    auth: {
      getUser: vi.fn(async () => ({ data: { user: currentUser }, error: null })),
    },
    from: vi.fn((table: string) => {
      const builder = makeQueryBuilder(() => nextTableResult(table))
      lastBuilders.set(table, builder)
      return builder
    }),
    rpc: vi.fn((fn: string, params?: unknown) => {
      rpcCalls.push({ fn, params })
      return makeQueryBuilder(() => rpcResults.get(fn) ?? { data: null, error: null })
    }),

    setUser(user: { id: string; email?: string } | null) {
      currentUser = user
    },
    setTableResult(table: string, result: MockResult) {
      tableDefaults.set(table, result)
    },
    queueTableResult(table: string, result: MockResult) {
      const queue = tableQueues.get(table) ?? []
      queue.push(result)
      tableQueues.set(table, queue)
    },
    setRpcResult(fn: string, result: MockResult) {
      rpcResults.set(fn, result)
    },
    getRpcCalls() {
      return rpcCalls
    },
    /** Builder retornado pela última chamada `.from(table)` — útil pra checar `insert`/`update` recebidos. */
    getBuilder(table: string) {
      return lastBuilders.get(table)
    },
  }

  return client
}

export type SupabaseMock = ReturnType<typeof createSupabaseMock>
