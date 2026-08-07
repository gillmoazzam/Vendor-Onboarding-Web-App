import { extname } from 'node:path'
import { Router, type NextFunction, type Request, type Response } from 'express'
import multer from 'multer'
import { getReasons } from '../controllers/list.controller.js'
import { createCaptchaChallenge, createPublicVendorRequest, verifyCaptchaChallenge } from '../controllers/publicVendor.controller.js'

export const publicVendorRouter = Router()

const allowedTypes: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
}
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 10 },
  fileFilter: (_request, file, callback) => {
    const expectedMimeType = allowedTypes[extname(file.originalname).toLowerCase()]
    if (!expectedMimeType || expectedMimeType !== file.mimetype) {
      callback(new Error('Only PDF, Word, and Excel documents are allowed'))
      return
    }
    callback(null, true)
  },
})

function uploadDocuments(request: Request, response: Response, next: NextFunction): void {
  upload.array('documents', 10)(request, response, (error) => {
    if (error) {
      const message = error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE'
        ? 'Each document must be 10 MB or smaller'
        : error instanceof Error ? error.message : 'Unable to upload the selected documents'
      response.status(400).json({ success: false, message })
      return
    }
    next()
  })
}

publicVendorRouter.get('/reasons', getReasons)
publicVendorRouter.get('/captcha', createCaptchaChallenge)
publicVendorRouter.post('/captcha/verify', verifyCaptchaChallenge)
publicVendorRouter.post('/requests', uploadDocuments, createPublicVendorRequest)
