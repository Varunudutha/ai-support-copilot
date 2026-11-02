import { describe, expect, it } from 'vitest'
import {
  DEFAULT_CHUNK_OVERLAP,
  DEFAULT_CHUNK_SIZE,
  splitTextIntoChunks,
} from '../src/services/documentExtractionService.js'

describe('splitTextIntoChunks', () => {
  it('returns no chunks for empty input', () => {
    expect(splitTextIntoChunks('   ')).toEqual([])
  })

  it('keeps short text in a single chunk', () => {
    expect(splitTextIntoChunks('Support is available Monday to Friday.')).toEqual([
      'Support is available Monday to Friday.',
    ])
  })

  it('splits long text into bounded chunks with overlap', () => {
    const input = Array.from({ length: 100 }, (_, index) => `paragraph${index}`).join(' ')
    const chunks = splitTextIntoChunks(input, 200, 30)

    expect(chunks.length).toBeGreaterThan(1)
    expect(chunks.every((chunk) => chunk.length <= 200)).toBe(true)
    expect(chunks[0]).toContain('paragraph0')
    expect(chunks[chunks.length - 1]).toContain('paragraph99')
  })

  it('uses the documented defaults', () => {
    expect(DEFAULT_CHUNK_SIZE).toBe(1_200)
    expect(DEFAULT_CHUNK_OVERLAP).toBe(180)
  })

  it('rejects invalid chunk configuration', () => {
    expect(() => splitTextIntoChunks('some text', 50, 10)).toThrow(/chunkSize/)
    expect(() => splitTextIntoChunks('some text', 100, 100)).toThrow(/overlap/)
  })
})
