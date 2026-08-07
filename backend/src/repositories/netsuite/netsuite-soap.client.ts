import { createHmac, randomBytes } from 'node:crypto'

const soapVersion = '2025_2'
const messagesNamespace = `urn:messages_${soapVersion}.platform.webservices.netsuite.com`
const coreNamespace = `urn:core_${soapVersion}.platform.webservices.netsuite.com`
const fileCabinetNamespace = `urn:filecabinet_${soapVersion}.documents.webservices.netsuite.com`

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is required for the NetSuite connection`)
  return value
}

function escapeXml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&apos;', '"': '&quot;' })[character]!)
}

function createTokenPassport(): string {
  const account = requiredEnvironment('NS_ACCOUNT_ID').toUpperCase().replace(/-/g, '_')
  const consumerKey = requiredEnvironment('NS_CONSUMER_KEY')
  const consumerSecret = requiredEnvironment('NS_CONSUMER_SECRET')
  const token = requiredEnvironment('NS_TOKEN_ID')
  const tokenSecret = requiredEnvironment('NS_TOKEN_SECRET')
  const nonce = randomBytes(16).toString('hex')
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const signature = createHmac('sha256', `${consumerSecret}&${tokenSecret}`)
    .update(`${account}&${consumerKey}&${token}&${nonce}&${timestamp}`)
    .digest('base64')

  return `<platformMsgs:tokenPassport>
    <platformMsgs:account>${escapeXml(account)}</platformMsgs:account>
    <platformMsgs:consumerKey>${escapeXml(consumerKey)}</platformMsgs:consumerKey>
    <platformMsgs:token>${escapeXml(token)}</platformMsgs:token>
    <platformMsgs:nonce>${nonce}</platformMsgs:nonce>
    <platformMsgs:timestamp>${timestamp}</platformMsgs:timestamp>
    <platformMsgs:signature algorithm="HMAC_SHA256">${escapeXml(signature)}</platformMsgs:signature>
  </platformMsgs:tokenPassport>`
}

function createEnvelope(body: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:platformMsgs="${messagesNamespace}" xmlns:platformCore="${coreNamespace}" xmlns:fileCabinet="${fileCabinetNamespace}">
  <soapenv:Header>${createTokenPassport()}</soapenv:Header>
  <soapenv:Body>${body}</soapenv:Body>
</soapenv:Envelope>`
}

function getErrorMessage(xml: string): string {
  return xml.match(/<faultstring>([\s\S]*?)<\/faultstring>/)?.[1]
    ?? xml.match(/<(?:\w+:)?message>([\s\S]*?)<\/(?:\w+:)?message>/)?.[1]
    ?? 'Unknown NetSuite SOAP error'
}

function decodeXml(value: string): string {
  return value.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&')
}

async function sendSoapRequest(action: string, body: string): Promise<string> {
  const accountHost = requiredEnvironment('NS_ACCOUNT_ID').toLowerCase()
  const endpoint = `https://${accountHost}.suitetalk.api.netsuite.com/services/NetSuitePort_${soapVersion}`
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'text/xml; charset=utf-8', SOAPAction: action },
    body: createEnvelope(body),
    signal: AbortSignal.timeout(30_000),
  })
  const responseBody = await response.text()
  const succeeded = response.ok && /<(?:\w+:)?status\b[^>]*\bisSuccess="true"/.test(responseBody)
  if (!succeeded) {
    console.error(`NetSuite SOAP ${action} failed:`, responseBody)
    throw new Error(`NetSuite SOAP ${action} failed: ${getErrorMessage(responseBody)}`)
  }
  return responseBody
}

export type NetSuiteFileType = '_PDF' | '_WORD' | '_EXCEL'

export async function uploadNetSuiteFile(input: { fileName: string; fileType: NetSuiteFileType; folderId: string; content: Buffer }): Promise<string> {
  const body = `<platformMsgs:add>
    <platformMsgs:record xsi:type="fileCabinet:File">
      <fileCabinet:name>${escapeXml(input.fileName)}</fileCabinet:name>
      <fileCabinet:attachFrom>_computer</fileCabinet:attachFrom>
      <fileCabinet:fileType>${input.fileType}</fileCabinet:fileType>
      <fileCabinet:folder internalId="${escapeXml(input.folderId)}"/>
      <fileCabinet:content>${input.content.toString('base64')}</fileCabinet:content>
    </platformMsgs:record>
  </platformMsgs:add>`
  const responseBody = await sendSoapRequest('add', body)

  const fileId = responseBody.match(/<(?:\w+:)?baseRef\b[^>]*\binternalId="([^"]+)"/)?.[1]
  if (!fileId) throw new Error('NetSuite file upload did not return a file ID')
  return fileId
}

export async function deleteNetSuiteFile(fileId: string): Promise<void> {
  const body = `<platformMsgs:delete>
    <platformMsgs:baseRef internalId="${escapeXml(fileId)}" type="file" xsi:type="platformCore:RecordRef"/>
  </platformMsgs:delete>`
  await sendSoapRequest('delete', body)
}

export async function getNetSuiteFile(fileId: string): Promise<{ fileName: string; fileType: string; content: Buffer }> {
  const body = `<platformMsgs:get>
    <platformMsgs:baseRef internalId="${escapeXml(fileId)}" type="file" xsi:type="platformCore:RecordRef"/>
  </platformMsgs:get>`
  const responseBody = await sendSoapRequest('get', body)
  const fileName = responseBody.match(/<(?:\w+:)?name>([\s\S]*?)<\/(?:\w+:)?name>/)?.[1]
  const fileType = responseBody.match(/<(?:\w+:)?fileType>([\s\S]*?)<\/(?:\w+:)?fileType>/)?.[1]
  const content = responseBody.match(/<(?:\w+:)?content>([\s\S]*?)<\/(?:\w+:)?content>/)?.[1]
  if (!fileName || !fileType || !content) throw new Error('NetSuite file response was incomplete')
  return { fileName: decodeXml(fileName), fileType, content: Buffer.from(content.replace(/\s/g, ''), 'base64') }
}
