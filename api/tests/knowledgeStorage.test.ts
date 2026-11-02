import { describe, expect, it } from 'vitest'
import { resolve } from 'node:path'
import {
  knowledgeStorageDirectory,
  resolveKnowledgeDocumentPath,
} from '../src/utils/knowledgeStorage.js'

describe('resolveKnowledgeDocumentPath', () => {
  it('resolves a generated filename inside the knowledge storage directory', () => {
    expect(resolveKnowledgeDocumentPath('generated-file.pdf')).toBe(
      resolve(knowledgeStorageDirectory, 'generated-file.pdf'),
    )
  })

  it('rejects POSIX path traversal', () => {
    expect(() => resolveKnowledgeDocumentPath('../outside.pdf')).toThrow(
      'Stored document path is invalid',
    )
  })

  it('rejects Windows path traversal', () => {
    expect(() => resolveKnowledgeDocumentPath('..\\outside.pdf')).toThrow(
      'Stored document path is invalid',
    )
  })

  it('rejects absolute paths', () => {
    expect(() => resolveKnowledgeDocumentPath('/tmp/outside.pdf')).toThrow(
      'Stored document path is invalid',
    )
  })

  it('rejects empty storage keys', () => {
    expect(() => resolveKnowledgeDocumentPath('')).toThrow(
      'Stored document path is invalid',
    )
  })
})
