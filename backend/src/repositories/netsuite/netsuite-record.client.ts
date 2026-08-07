import { netsuiteAuth } from '../../services/netsuiteAuth.js'

function getBaseUrl(): string {
  const accountId = process.env.NS_ACCOUNT_ID?.trim().toLowerCase()
  if (!accountId) throw new Error('NS_ACCOUNT_ID is required for the NetSuite connection')

  return `https://${accountId}.suitetalk.api.netsuite.com/services/rest`
}

export async function createNetSuiteRecord(path: string, body: unknown): Promise<string> {
  const requestUrl = `${getBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`
  const response = await fetch(requestUrl, {
    method: 'POST',
    headers: {
      Authorization: netsuiteAuth.getAuthorizationHeader('POST', requestUrl),
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  })
  const responseBody = await response.text()

  if (!response.ok) {
    console.error(`NetSuite POST ${path} failed:`, responseBody)
    throw new Error(`NetSuite POST ${path} failed (${response.status}): ${responseBody}`)
  }

  const location = response.headers.get('location')
  if (!location) throw new Error(`NetSuite POST ${path} did not return a Location header`)

  const recordPath = new URL(location, getBaseUrl()).pathname
  const recordId = recordPath.split('/').filter(Boolean).at(-1)
  if (!recordId) throw new Error(`NetSuite POST ${path} returned an invalid Location header`)

  return decodeURIComponent(recordId)
}

export async function deleteNetSuiteRecord(path: string): Promise<void> {
  const requestUrl = `${getBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`
  const response = await fetch(requestUrl, {
    method: 'DELETE',
    headers: {
      Authorization: netsuiteAuth.getAuthorizationHeader('DELETE', requestUrl),
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(30_000),
  })
  const responseBody = await response.text()

  if (!response.ok) {
    console.error(`NetSuite DELETE ${path} failed:`, responseBody)
    throw new Error(`NetSuite DELETE ${path} failed (${response.status}): ${responseBody}`)
  }
}
