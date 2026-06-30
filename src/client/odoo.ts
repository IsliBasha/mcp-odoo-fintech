import axios, { type AxiosInstance } from 'axios'

export interface OdooConfig {
  url: string
  db: string
  apiKey: string
}

export interface SearchReadOptions {
  fields?: string[]
  limit?: number
  offset?: number
  order?: string
}

interface OdooJsonRpcResponse<T> {
  jsonrpc: '2.0'
  id: number
  result?: T
  error?: {
    code: number
    message: string
    data: { name: string; message: string; type: string }
  }
}

export class OdooError extends Error {
  constructor(
    message: string,
    public readonly data: { name: string; message: string; type: string }
  ) {
    super(message)
    this.name = 'OdooError'
  }
}

export class OdooClient {
  private readonly http: AxiosInstance
  private requestId = 0

  constructor(readonly config: OdooConfig) {
    this.http = axios.create({
      baseURL: config.url,
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
    })
  }

  async callKw<T>(
    model: string,
    method: string,
    args: unknown[] = [],
    kwargs: Record<string, unknown> = {}
  ): Promise<T> {
    const id = ++this.requestId
    const response = await this.http.post<OdooJsonRpcResponse<T>>(
      '/web/dataset/call_kw',
      {
        jsonrpc: '2.0',
        method: 'call',
        id,
        params: { model, method, args, kwargs },
      }
    )

    const data = response.data
    if (data.error) {
      throw new OdooError(data.error.message, data.error.data)
    }

    return data.result as T
  }

  async searchRead<T>(
    model: string,
    domain: unknown[][],
    options: SearchReadOptions = {}
  ): Promise<T[]> {
    return this.callKw<T[]>(model, 'search_read', [domain], {
      fields: options.fields ?? [],
      limit: options.limit ?? 80,
      offset: options.offset ?? 0,
      order: options.order ?? '',
    })
  }

  async authenticate(): Promise<boolean> {
    try {
      await this.callKw<unknown>('res.users', 'context_get')
      return true
    } catch {
      return false
    }
  }
}

let _client: OdooClient | null = null

export function getOdooClient(): OdooClient {
  if (!_client) {
    const { ODOO_URL, ODOO_DB, ODOO_API_KEY } = process.env
    if (!ODOO_URL || !ODOO_DB || !ODOO_API_KEY) {
      throw new Error('ODOO_URL, ODOO_DB, and ODOO_API_KEY must be set')
    }
    _client = new OdooClient({ url: ODOO_URL, db: ODOO_DB, apiKey: ODOO_API_KEY })
  }
  return _client
}

export function resetOdooClient(): void {
  _client = null
}
