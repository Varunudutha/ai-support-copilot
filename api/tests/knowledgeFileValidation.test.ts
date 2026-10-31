import { describe, expect, it } from 'vitest'
import { isValidKnowledgeFileContent } from '../src/utils/knowledgeFileValidation.js'

describe('isValidKnowledgeFileContent', () => {
  it('accepts a PDF signature with an EOF marker', () => {
    const content = Buffer.from('%PDF-1.7\nexample\n%%EOF')
    expect(isValidKnowledgeFileContent('.pdf', content)).toBe(true)
  })

  it('rejects a renamed text file presented as a PDF', () => {
    expect(isValidKnowledgeFileContent('.pdf', Buffer.from('hello world'))).toBe(false)
  })

  it('accepts a DOCX ZIP header containing the main document parts', () => {
    const content = Buffer.from([
      0x50, 0x4b, 0x03, 0x04,
      ...Buffer.from('[Content_Types].xml word/document.xml'),
    ])
    expect(isValidKnowledgeFileContent('.docx', content)).toBe(true)
  })

  it('rejects a generic ZIP renamed as DOCX', () => {
    const content = Buffer.from([0x50, 0x4b, 0x03, 0x04, ...Buffer.from('readme.txt')])
    expect(isValidKnowledgeFileContent('.docx', content)).toBe(false)
  })

  it('accepts valid UTF-8 text', () => {
    expect(isValidKnowledgeFileContent('.txt', Buffer.from('Support hours: 9 AM–6 PM', 'utf8'))).toBe(true)
  })

  it('rejects binary content with null bytes as TXT', () => {
    expect(isValidKnowledgeFileContent('.txt', Buffer.from([0x41, 0x00, 0x42]))).toBe(false)
  })

  it('rejects empty and unsupported files', () => {
    expect(isValidKnowledgeFileContent('.txt', Buffer.alloc(0))).toBe(false)
    expect(isValidKnowledgeFileContent('.exe', Buffer.from('binary'))).toBe(false)
  })
})
