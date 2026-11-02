import { PDFParse } from 'pdf-parse'
import mammoth from 'mammoth'
import { AppError } from '../utils/appError.js'

export const MAX_EXTRACTED_CHARACTERS = 1_000_000
export const DEFAULT_CHUNK_SIZE = 1_200
export const DEFAULT_CHUNK_OVERLAP = 180

export interface ExtractedDocumentText {
  text: string
  pageCount: number | null
}

function normalizeExtractedText(value: string): string {
  return value
    .replace(/\u0000/g, '')
    .replace(/\r\n?/g, '\n')
    .replace(/[\t\f\v ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export async function extractDocumentText(
  buffer: Buffer,
  mimeType: string,
): Promise<ExtractedDocumentText> {
  let rawText = ''
  let pageCount: number | null = null

  if (mimeType === 'text/plain') {
    try {
      rawText = new TextDecoder('utf-8', { fatal: true }).decode(buffer)
    } catch {
      throw new AppError('The TXT document is not valid UTF-8.', 400, 'INVALID_TEXT_ENCODING')
    }
  } else if (mimeType === 'application/pdf') {
    let parser: PDFParse | undefined
    try {
      parser = new PDFParse({ data: new Uint8Array(buffer) })
      const result = await parser.getText()
      rawText = result.text
      pageCount = Array.isArray(result.pages) ? result.pages.length : null
    } catch {
      throw new AppError('The PDF could not be read. It may be damaged or encrypted.', 422, 'PDF_EXTRACTION_FAILED')
    } finally {
      await parser?.destroy().catch(() => undefined)
    }
  } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    try {
      const result = await mammoth.extractRawText({ buffer })
      rawText = result.value
    } catch {
      throw new AppError('The DOCX document could not be read.', 422, 'DOCX_EXTRACTION_FAILED')
    }
  } else {
    throw new AppError('Unsupported document type.', 415, 'UNSUPPORTED_DOCUMENT_TYPE')
  }

  const text = normalizeExtractedText(rawText)
  if (!text) {
    throw new AppError('No readable text was found in this document.', 422, 'EMPTY_DOCUMENT_TEXT')
  }
  if (text.length > MAX_EXTRACTED_CHARACTERS) {
    throw new AppError('Extracted text exceeds the 1,000,000 character processing limit.', 413, 'EXTRACTED_TEXT_TOO_LARGE')
  }

  return { text, pageCount }
}

export function splitTextIntoChunks(
  input: string,
  chunkSize = DEFAULT_CHUNK_SIZE,
  overlap = DEFAULT_CHUNK_OVERLAP,
): string[] {
  if (!Number.isInteger(chunkSize) || chunkSize < 100) {
    throw new Error('chunkSize must be an integer of at least 100 characters')
  }
  if (!Number.isInteger(overlap) || overlap < 0 || overlap >= chunkSize) {
    throw new Error('overlap must be a non-negative integer smaller than chunkSize')
  }

  const text = normalizeExtractedText(input)
  if (!text) return []

  const chunks: string[] = []
  let start = 0

  while (start < text.length) {
    let end = Math.min(start + chunkSize, text.length)
    if (end < text.length) {
      const preferredBreak = text.lastIndexOf(' ', end)
      const minimumBreak = start + Math.floor(chunkSize * 0.65)
      if (preferredBreak >= minimumBreak) end = preferredBreak
    }

    const chunk = text.slice(start, end).trim()
    if (chunk) chunks.push(chunk)
    if (end >= text.length) break

    const nextStart = Math.max(start + 1, end - overlap)
    start = nextStart
    while (start < text.length && text[start] === ' ') start += 1
  }

  return chunks
}
