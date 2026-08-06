import { createHmac, randomBytes } from 'node:crypto'

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim()

  if (!value) throw new Error(`${name} is required for the NetSuite connection`)

  return value
}

function oauthEncode(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  )
}

function getRealm(accountId: string): string {
  return accountId.replace(/-([a-z0-9]+)/g, (_match, suffix: string) => `_${suffix.toUpperCase()}`)
}

export class NetSuiteAuthService {
  getAuthorizationHeader(method: string, requestUrl: string): string {
    const accountId = requiredEnvironment('NS_ACCOUNT_ID').toLowerCase()
    const consumerKey = requiredEnvironment('NS_CONSUMER_KEY')
    const consumerSecret = requiredEnvironment('NS_CONSUMER_SECRET')
    const tokenId = requiredEnvironment('NS_TOKEN_ID')
    const tokenSecret = requiredEnvironment('NS_TOKEN_SECRET')
    const url = new URL(requestUrl)
    const oauthParameters: Record<string, string> = {
      oauth_consumer_key: consumerKey,
      oauth_nonce: randomBytes(16).toString('hex'),
      oauth_signature_method: 'HMAC-SHA256',
      oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
      oauth_token: tokenId,
      oauth_version: '1.0',
    }
    const parameters = [...url.searchParams.entries(), ...Object.entries(oauthParameters)]
      .map(([key, value]) => [oauthEncode(key), oauthEncode(value)] as const)
      .sort(([leftKey, leftValue], [rightKey, rightValue]) =>
        leftKey === rightKey ? leftValue.localeCompare(rightValue) : leftKey.localeCompare(rightKey),
      )
      .map(([key, value]) => `${key}=${value}`)
      .join('&')
    const baseUrl = `${url.protocol}//${url.host}${url.pathname}`
    const baseString = [method.toUpperCase(), oauthEncode(baseUrl), oauthEncode(parameters)].join('&')
    const signingKey = `${oauthEncode(consumerSecret)}&${oauthEncode(tokenSecret)}`
    const signature = createHmac('sha256', signingKey).update(baseString).digest('base64')
    const headerParameters = {
      realm: getRealm(accountId),
      oauth_token: tokenId,
      oauth_consumer_key: consumerKey,
      oauth_nonce: oauthParameters.oauth_nonce,
      oauth_timestamp: oauthParameters.oauth_timestamp,
      oauth_signature_method: oauthParameters.oauth_signature_method,
      oauth_version: oauthParameters.oauth_version,
      oauth_signature: signature,
    }

    return `OAuth ${Object.entries(headerParameters)
      .map(([key, value]) => `${key}="${oauthEncode(value)}"`)
      .join(', ')}`
  }
}

export const netsuiteAuth = new NetSuiteAuthService()
