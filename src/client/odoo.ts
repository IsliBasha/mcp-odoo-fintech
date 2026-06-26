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

/** Odoo JSON-2 API client — replaces deprecated XML-RPC protocol */
export class OdooClient {
  private readonly http: AxiosInstance

  constructor(private readonly config: OdooConfig) {
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
    // TODO P1.1: POST to /json/2/<model>/<method> with jsonrpc envelope
    void model; void method; void args; void kwargs
    throw new Error('Not implemented')
  }

  async searchRead<T>(model: string, domain: unknown[][], options: SearchReadOptions = {}): Promise<T[]> {
    return this.callKw<T[]>(model, 'search_read', [domain], options)
  }

  async authenticate(): Promise<boolean> {
    // TODO P1.1: Verify via res.users/context_get
    throw new Error('Not implemented')
  }
}
