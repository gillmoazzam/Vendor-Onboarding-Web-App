/**
 * Attaches File Cabinet files to a Vendor Onboarding Request custom record.
 *
 * @NApiVersion 2.x
 * @NScriptType Restlet
 */
define(['N/error', 'N/file', 'N/log', 'N/record'], function (error, file, log, record) {
  'use strict';

  var REQUEST_RECORD_TYPE = 'customrecord_f3_vendor_onboarding';

  function positiveInternalId(value, name) {
    var normalized = String(value == null ? '' : value).trim();
    if (!/^\d+$/.test(normalized) || Number(normalized) < 1) {
      throw error.create({
        name: 'F3_INVALID_ATTACHMENT_REQUEST',
        message: name + ' must be a positive NetSuite internal ID',
        notifyOff: true
      });
    }
    return normalized;
  }

  function isAlreadyAttached(exception) {
    var code = String((exception && (exception.name || exception.code)) || '');
    var message = String((exception && exception.message) || '');
    return /ALREADY.*ATTACH|ATTACH.*ALREADY/i.test(code + ' ' + message);
  }

  function normalizeFileIds(suppliedFileIds) {
    var fileIds = [];
    var seen = {};
    var i;
    var fileId;

    for (i = 0; i < suppliedFileIds.length; i += 1) {
      fileId = positiveInternalId(suppliedFileIds[i], 'File ID');
      if (!seen[fileId]) {
        seen[fileId] = true;
        fileIds.push(fileId);
      }
    }

    return fileIds;
  }

  function post(context) {
    var requestId = positiveInternalId(context && context.requestId, 'Vendor Request ID');
    var suppliedFileIds = Array.isArray(context && context.fileIds) ? context.fileIds : [];
    var fileIds = normalizeFileIds(suppliedFileIds);
    var attachedFileIds = [];
    var i;
    var fileId;

    if (fileIds.length === 0) {
      throw error.create({
        name: 'F3_INVALID_ATTACHMENT_REQUEST',
        message: 'At least one File ID is required',
        notifyOff: true
      });
    }

    record.load({ type: REQUEST_RECORD_TYPE, id: requestId, isDynamic: false });

    for (i = 0; i < fileIds.length; i += 1) {
      fileId = fileIds[i];
      file.load({ id: fileId });
      try {
        record.attach({
          record: { type: record.Type.FILE, id: fileId },
          to: { type: REQUEST_RECORD_TYPE, id: requestId }
        });
      } catch (exception) {
        if (!isAlreadyAttached(exception)) {
          throw exception;
        }
      }
      attachedFileIds.push(fileId);
    }

    log.audit({
      title: 'Vendor request files attached',
      details: {
        requestId: requestId,
        attachedFileIds: attachedFileIds
      }
    });

    return {
      success: true,
      requestId: requestId,
      attachedFileIds: attachedFileIds
    };
  }

  return { post: post };
});
