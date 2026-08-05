import PDFDocument from 'pdfkit'
import type { Response } from 'express'
import { questions } from '../config/questions.js'
import type { VendorRequest } from '../types/domain.js'

export function streamQuestionnairePdf(request: VendorRequest, response: Response): void {
  const document = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true })
  const generatedAt = new Date().toLocaleString()

  function drawHeader() {
    document.rect(0, 0, document.page.width, 76).fill('#E8272C')
    document.fillColor('#FFFFFF').fontSize(22).font('Helvetica-Bold').text('Vendor Questionnaire', 50, 27)
    document.fillColor('#1F2937').font('Helvetica').fontSize(10)
    document.y = 100
  }

  document.on('pageAdded', drawHeader)
  document.pipe(response)
  drawHeader()
  document.fontSize(18).font('Helvetica-Bold').text(request.vendorName)
  document.moveDown(0.4)
  document.fontSize(10).font('Helvetica').fillColor('#4B5563').text(`Vendor ID: ${request.createdVendorId ?? 'Not assigned'}`)
  document.text(`Submission Date: ${request.questionnaireSubmittedDate ? new Date(request.questionnaireSubmittedDate).toLocaleString() : 'Not submitted'}`)
  document.moveDown(1.2)

  for (const question of questions) {
    if (document.y > document.page.height - 150) document.addPage()
    document.fillColor('#111827').font('Helvetica-Bold').fontSize(11).text(`${question.id}. ${question.label}`, { lineGap: 3 })
    document.moveDown(0.35)
    document.fillColor('#374151').font('Helvetica').fontSize(10).text(request.answers[question.key], { lineGap: 3 })
    document.moveDown(1)
  }

  const pageRange = document.bufferedPageRange()
  for (let pageIndex = pageRange.start; pageIndex < pageRange.start + pageRange.count; pageIndex += 1) {
    document.switchToPage(pageIndex)
    document.fillColor('#6B7280').font('Helvetica').fontSize(8).text(`Generated ${generatedAt}`, 50, document.page.height - 60, { width: document.page.width - 100, align: 'center', lineBreak: false })
  }

  document.end()
}
