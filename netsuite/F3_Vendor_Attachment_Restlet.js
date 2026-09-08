/**
 * Attaches File Cabinet files to a Vendor Onboarding Request custom record.
 *
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define(['N/error', 'N/file', 'N/log', 'N/record'], (error, file, log, record) => {
  'use strict'

  const REQUEST_RECORD_TYPE = 'customrecord_f3_vendor_onboarding'

  function positiveInternalId(value, name) {
    const normalized = String(value == null ? '' : value).trim()
    if (!/^\d+$/.test(normalized) || Number(normalized) < 1) {
      throw error.create({
        name: 'F3_INVALID_ATTACHMENT_REQUEST',
        message: `${name} must be a positive NetSuite internal ID`,
        notifyOff: true,
      })
    }
    return normalized
  }

  function isAlreadyAttached(exception) {
    const code = String(exception && (exception.name || exception.code) || '')
    const message = String(exception && exception.message || '')
    return /ALREADY.*ATTACH|ATTACH.*ALREADY/i.test(`${code} ${message}`)
  }

  function post(context) {
    const requestId = positiveInternalId(context && context.requestId, 'Vendor Request ID')
    const suppliedFileIds = Array.isArray(context && context.fileIds) ? context.fileIds : []
    const fileIds = [...new Set(suppliedFileIds.map((fileId) => positiveInternalId(fileId, 'File ID')))]

    if (fileIds.length === 0) {
      throw error.create({
        name: 'F3_INVALID_ATTACHMENT_REQUEST',
        message: 'At least one File ID is required',
        notifyOff: true,
      })
    }

    record.load({ type: REQUEST_RECORD_TYPE, id: requestId, isDynamic: false })

    const attachedFileIds = []
    for (const fileId of fileIds) {
      file.load({ id: fileId })
      try {
        record.attach({
          record: { type: record.Type.FILE, id: fileId },
          to: { type: REQUEST_RECORD_TYPE, id: requestId },
        })
      } catch (exception) {
        if (!isAlreadyAttached(exception)) throw exception
      }
      attachedFileIds.push(fileId)
    }

    log.audit({
      title: 'Vendor request files attached',
      details: { requestId, attachedFileIds },
    })

    return { success: true, requestId, attachedFileIds }
  }

  return { post }
})
