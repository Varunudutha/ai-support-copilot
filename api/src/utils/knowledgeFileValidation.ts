/**
 * Lightweight file-signature validation before a file is accepted into the
 * knowledge base. This is not a substitute for safe document parsing: the
 * extraction stage must still parse each format defensively and enforce
 * resource/time limits.
 */
export function isValidKnowledgeFileContent(extension: string, content: Buffer): boolean {
  if (content.length === 0) return false

  switch (extension.toLowerCase()) {
    case '.pdf': {
      if (content.length < 8 || content.subarray(0, 5).toString('ascii') !== '%PDF-') {
        return false
      }
      // Reject obviously truncated PDFs while allowing trailing bytes after EOF.
      return content.subarray(Math.max(0, content.length - 2048)).includes(Buffer.from('%%EOF'))
    }

    case '.docx': {
      // DOCX is a ZIP package containing the main Word document part.
      const hasZipHeader =
        content.length >= 4 &&
        content[0] === 0x50 &&
        content[1] === 0x4b &&
        [0x03, 0x05, 0x07].includes(content[2]) &&
        [0x04, 0x06, 0x08].includes(content[3])
      const hasDocumentPart = content.includes(Buffer.from('word/document.xml'))
      const hasContentTypes = content.includes(Buffer.from('[Content_Types].xml'))
      return hasZipHeader && hasDocumentPart && hasContentTypes
    }

    case '.txt': {
      if (content.includes(0)) return false
      try {
        new TextDecoder('utf-8', { fatal: true }).decode(content)
        return true
      } catch {
        return false
      }
    }

    default:
      return false
  }
}
