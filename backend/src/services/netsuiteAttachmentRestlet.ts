import { netsuiteAuth } from './netsuiteAuth.js'

const maximumAttempts = 4
const defaultConfiguration: RestletConfiguration = {
  scriptId: 'customscript_f3_vendor_attachment_rl',
  deploymentId: 'customdeploy_f3_vendor_attachment_rl',
}

type RestletConfiguration = {
  scriptId: string
  deploymentId: string
}

type AttachmentRestletResponse = {
  success?: boolean
  requestId?: string | number
  attachedFileIds?: Array<string | number>
  error?: string
}

type AuthorizationProvider = {
  getAuthorizationHeader(method: string, requestUrl: string): string
}

function retryDelay(attempt: number, retryAfter: string | null): number {
  const retryAfterSeconds = retryAfter ? Number(retryAfter) : Number.NaN
  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds >= 0) return retryAfterSeconds * 1000
  return 500 * (2 ** (attempt - 1))
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

function numericId(value: string, name: string): string {
  const normalized = value.trim()
  if (!/^\d+$/.test(normalized) || Number(normalized) < 1) {
    throw new Error(`${name} must be a positive NetSuite internal ID`)
  }
  return normalized
}

function getConfiguration(): RestletConfiguration {
  const scriptId = process.env.NS_ATTACHMENT_RESTLET_SCRIPT_ID?.trim() ?? ''
  const deploymentId = process.env.NS_ATTACHMENT_RESTLET_DEPLOY_ID?.trim() ?? ''

  if (!scriptId && !deploymentId) return defaultConfiguration
  if (!scriptId || !deploymentId) {
    throw new Error('NS_ATTACHMENT_RESTLET_SCRIPT_ID and NS_ATTACHMENT_RESTLET_DEPLOY_ID must be configured together')
  }

  return { scriptId, deploymentId }
}

export function buildAttachmentRestletUrl(configuration: RestletConfiguration): string {
  const accountId = process.env.NS_ACCOUNT_ID?.trim().toLowerCase().replace(/_/g, '-')
  if (!accountId) throw new Error('NS_ACCOUNT_ID is required for the NetSuite connection')

  const url = new URL(`https://${accountId}.restlets.api.netsuite.com/app/site/hosting/restlet.nl`)
  url.searchParams.set('script', configuration.scriptId)
  url.searchParams.set('deploy', configuration.deploymentId)
  return url.toString()
}

export class NetSuiteAttachmentRestletClient {
  constructor(
    private readonly fetcher: typeof fetch = fetch,
    private readonly authorizationProvider: AuthorizationProvider = netsuiteAuth,
  ) {}

  async attachFiles(requestId: string, fileIds: string[]): Promise<boolean> {
    if (fileIds.length === 0) return true

    const configuration = getConfiguration()

    const normalizedRequestId = numericId(requestId, 'Vendor Request ID')
    const normalizedFileIds = [...new Set(fileIds.map((fileId) => numericId(fileId, 'File ID')))]
    const requestUrl = buildAttachmentRestletUrl(configuration)

    for (let attempt = 1; attempt <= maximumAttempts; attempt += 1) {
      const response = await this.fetcher(requestUrl, {
        method: 'POST',
        headers: {
          Authorization: this.authorizationProvider.getAuthorizationHeader('POST', requestUrl),
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requestId: normalizedRequestId, fileIds: normalizedFileIds }),
        signal: AbortSignal.timeout(30_000),
      })

      const responseBody = await response.text()
      if (response.status === 429 && attempt < maximumAttempts) {
        const delay = retryDelay(attempt, response.headers.get('retry-after'))
        console.warn(`NetSuite attachment RESTlet reached its concurrency limit; retrying in ${delay}ms`)
        await wait(delay)
        continue
      }

      if (!response.ok) {
        console.error('NetSuite attachment RESTlet failed:', responseBody)
        throw new Error(`NetSuite attachment RESTlet failed (${response.status}): ${responseBody}`)
      }

      let result: AttachmentRestletResponse
      try {
        result = JSON.parse(responseBody) as AttachmentRestletResponse
      } catch {
        throw new Error('NetSuite attachment RESTlet returned a non-JSON response')
      }

      const attachedFileIds = new Set((result.attachedFileIds ?? []).map(String))
      const allFilesAttached = normalizedFileIds.every((fileId) => attachedFileIds.has(fileId))
      if (result.success !== true || String(result.requestId ?? '') !== normalizedRequestId || !allFilesAttached) {
        throw new Error(result.error || 'NetSuite attachment RESTlet returned an incomplete result')
      }

      console.info(`Attached ${normalizedFileIds.length} file(s) to Vendor Request #${normalizedRequestId} through SuiteScript`)
      return true
    }

    throw new Error('NetSuite attachment RESTlet failed after retrying')
  }
}

export const netsuiteAttachmentRestlet = new NetSuiteAttachmentRestletClient()
