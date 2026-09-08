import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { buildAttachmentRestletUrl, NetSuiteAttachmentRestletClient } from './netsuiteAttachmentRestlet.js'

const managedVariables = [
  'NS_ACCOUNT_ID',
  'NS_ATTACHMENT_RESTLET_SCRIPT_ID',
  'NS_ATTACHMENT_RESTLET_DEPLOY_ID',
] as const

const originalEnvironment = Object.fromEntries(managedVariables.map((name) => [name, process.env[name]]))

afterEach(() => {
  for (const name of managedVariables) {
    const value = originalEnvironment[name]
    if (value === undefined) delete process.env[name]
    else process.env[name] = value
  }
})

test('builds an account-specific RESTlet URL', () => {
  process.env.NS_ACCOUNT_ID = '1234567_SB1'
  const url = buildAttachmentRestletUrl({
    scriptId: 'customscript_f3_vendor_attachment_rl',
    deploymentId: 'customdeploy_f3_vendor_attachment_rl',
  })

  assert.equal(
    url,
    'https://1234567-sb1.restlets.api.netsuite.com/app/site/hosting/restlet.nl?script=customscript_f3_vendor_attachment_rl&deploy=customdeploy_f3_vendor_attachment_rl',
  )
})

test('does not call NetSuite until the RESTlet is configured', async () => {
  delete process.env.NS_ATTACHMENT_RESTLET_SCRIPT_ID
  delete process.env.NS_ATTACHMENT_RESTLET_DEPLOY_ID
  let requested = false
  const client = new NetSuiteAttachmentRestletClient(async () => {
    requested = true
    return new Response()
  }, { getAuthorizationHeader: () => 'OAuth test' })

  assert.equal(await client.attachFiles('1601', ['5001']), false)
  assert.equal(requested, false)
})

test('attaches every uploaded file through the configured RESTlet', async () => {
  process.env.NS_ACCOUNT_ID = '1234567_SB1'
  process.env.NS_ATTACHMENT_RESTLET_SCRIPT_ID = 'customscript_f3_vendor_attachment_rl'
  process.env.NS_ATTACHMENT_RESTLET_DEPLOY_ID = 'customdeploy_f3_vendor_attachment_rl'
  let requestBody = ''
  const client = new NetSuiteAttachmentRestletClient(async (_url, init) => {
    requestBody = String(init?.body ?? '')
    return new Response(JSON.stringify({
      success: true,
      requestId: '1601',
      attachedFileIds: ['5001', '5002'],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }, { getAuthorizationHeader: () => 'OAuth test' })

  assert.equal(await client.attachFiles('1601', ['5001', '5002']), true)
  assert.deepEqual(JSON.parse(requestBody), { requestId: '1601', fileIds: ['5001', '5002'] })
})

test('rejects a partial RESTlet configuration', async () => {
  process.env.NS_ATTACHMENT_RESTLET_SCRIPT_ID = 'customscript_f3_vendor_attachment_rl'
  delete process.env.NS_ATTACHMENT_RESTLET_DEPLOY_ID
  const client = new NetSuiteAttachmentRestletClient()

  await assert.rejects(
    client.attachFiles('1601', ['5001']),
    /must be configured together/,
  )
})
