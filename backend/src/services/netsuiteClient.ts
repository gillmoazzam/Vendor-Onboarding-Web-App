import { netsuiteAuth } from './netsuiteAuth.js'

type RequestMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE'
const maximumAttempts = 4

function retryDelay(attempt: number, retryAfter: string | null): number {
  const retryAfterSeconds = retryAfter ? Number(retryAfter) : Number.NaN
  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds >= 0) return retryAfterSeconds * 1000
  return 500 * (2 ** (attempt - 1))
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

function getBaseUrl(): string {
  const accountId = process.env.NS_ACCOUNT_ID?.trim().toLowerCase()
  if (!accountId) throw new Error('NS_ACCOUNT_ID is required for the NetSuite connection')

  return `https://${accountId}.suitetalk.api.netsuite.com/services/rest`
}

export class NetSuiteClient {
  private requestQueue: Promise<void> = Promise.resolve()

  async verifyConnection(): Promise<void> {
    await this.suiteql<unknown>('SELECT 1 AS healthCheck FROM DUAL')
  }

  async get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path)
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>('POST', path, body)
  }

  async patch<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>('PATCH', path, body)
  }

  async delete(path: string): Promise<void> {
    await this.request<void>('DELETE', path)
  }

  async suiteql<T>(query: string): Promise<T> {
    return this.request<T>('POST', '/query/v1/suiteql', { q: query }, { Prefer: 'transient' })
  }

  private async request<T>(method: RequestMethod, path: string, body?: unknown, headers: Record<string, string> = {}): Promise<T> {
    const operation = this.requestQueue.then(() => this.executeRequest<T>(method, path, body, headers))
    this.requestQueue = operation.then(() => undefined, () => undefined)
    return operation
  }

  private async executeRequest<T>(method: RequestMethod, path: string, body?: unknown, headers: Record<string, string> = {}): Promise<T> {
    const requestUrl = `${getBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`
    for (let attempt = 1; attempt <= maximumAttempts; attempt += 1) {
      const response = await fetch(requestUrl, {
        method,
        headers: {
          Authorization: netsuiteAuth.getAuthorizationHeader(method, requestUrl),
          Accept: 'application/json',
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
          ...headers,
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: AbortSignal.timeout(30_000),
      })

      const responseBody = await response.text()
      if (response.status === 429 && attempt < maximumAttempts) {
        const delay = retryDelay(attempt, response.headers.get('retry-after'))
        console.warn(`NetSuite ${method} ${path} reached its concurrency limit; retrying in ${delay}ms`)
        await wait(delay)
        continue
      }
      if (!response.ok) {
        console.error(`NetSuite ${method} ${path} failed:`, responseBody)
        throw new Error(`NetSuite ${method} ${path} failed (${response.status}): ${responseBody}`)
      }

      if (!responseBody) return undefined as T

      try {
        return JSON.parse(responseBody) as T
      } catch {
        console.error(`NetSuite ${method} ${path} returned a non-JSON response:`, responseBody)
        throw new Error(`NetSuite ${method} ${path} returned a non-JSON response`)
      }
    }

    throw new Error(`NetSuite ${method} ${path} failed after ${maximumAttempts} attempts`)
  }
}

export const netsuiteClient = new NetSuiteClient()
