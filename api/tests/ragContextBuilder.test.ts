import { describe, expect, it } from 'vitest'
import {
  buildRagContext,
  MAX_RAG_CONTEXT_CHARACTERS,
} from '../src/services/ragContextBuilder.js'
import type { KnowledgeSearchResult } from '../src/services/vectorSearchService.js'

function makeChunk(overrides: Partial<KnowledgeSearchResult> = {}): KnowledgeSearchResult {
  return {
    id: 'chunk-1',
    documentId: 'document-1',
    chunkIndex: 0,
    content: 'Returns are accepted within 30 days.',
    sourceName: 'returns-policy.txt',
    mimeType: 'text/plain',
    pageCount: null,
    score: 0.87,
    ...overrides,
  }
}

describe('buildRagContext', () => {
  it('assigns request-local citation IDs and keeps source metadata', () => {
    const result = buildRagContext([
      makeChunk(),
      makeChunk({ id: 'chunk-2', sourceName: 'shipping-policy.txt', chunkIndex: 1 }),
    ])

    expect(result.sources.map((source) => source.citationId)).toEqual(['S1', 'S2'])
    expect(result.sources[0]).toMatchObject({
      id: 'chunk-1',
      sourceName: 'returns-policy.txt',
      content: 'Returns are accepted within 30 days.',
    })
    expect(result.context).toContain('returns-policy.txt')
    expect(result.context).toContain('shipping-policy.txt')
  })

  it('skips empty chunks', () => {
    const result = buildRagContext([makeChunk({ content: '   ' }), makeChunk()])

    expect(result.sources).toHaveLength(1)
    expect(result.sources[0]?.citationId).toBe('S1')
  })

  it('caps the combined context size', () => {
    const result = buildRagContext([
      makeChunk({ content: 'a'.repeat(8_000) }),
      makeChunk({ id: 'chunk-2', content: 'b'.repeat(8_000) }),
    ])

    const totalCharacters = result.sources.reduce((sum, source) => sum + source.content.length, 0)
    expect(totalCharacters).toBe(MAX_RAG_CONTEXT_CHARACTERS)
    expect(result.sources[1]?.content.length).toBe(4_000)
  })
})
