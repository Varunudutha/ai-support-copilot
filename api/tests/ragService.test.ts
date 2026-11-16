import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../src/config/env.js', () => ({
  env: { OLLAMA_MODEL: 'qwen2.5:1.5b-instruct' },
}))

vi.mock('../src/services/vectorSearchService.js', () => ({
  searchKnowledgeChunks: vi.fn(),
}))

vi.mock('../src/services/ollamaService.js', () => ({
  generateOllamaAnswer: vi.fn(),
}))

import { searchKnowledgeChunks } from '../src/services/vectorSearchService.js'
import { generateOllamaAnswer } from '../src/services/ollamaService.js'
import { generateRagAnswer, RAG_NO_ANSWER } from '../src/services/ragService.js'
import type { KnowledgeSearchResult } from '../src/services/vectorSearchService.js'

const chunk: KnowledgeSearchResult = {
  id: 'chunk-1',
  documentId: 'document-1',
  chunkIndex: 0,
  content: 'Returns are accepted within 30 days.',
  sourceName: 'returns-policy.txt',
  mimeType: 'text/plain',
  pageCount: null,
  score: 0.88,
}

const searchMock = vi.mocked(searchKnowledgeChunks)
const ollamaMock = vi.mocked(generateOllamaAnswer)

afterEach(() => {
  vi.clearAllMocks()
})

describe('generateRagAnswer', () => {
  it('returns an answer with only citations validated against retrieved sources', async () => {
    searchMock.mockResolvedValue([chunk])
    ollamaMock.mockResolvedValue({
      answer: 'Returns are accepted within 30 days.',
      citationIds: ['S1', 'S99'],
    })

    const result = await generateRagAnswer('workspace-1', 'What is the return window?')

    expect(result).toMatchObject({
      answer: 'Returns are accepted within 30 days.',
      grounded: true,
      model: 'qwen2.5:1.5b-instruct',
    })
    expect(result.citations).toHaveLength(1)
    expect(result.citations[0]).toMatchObject({
      citationId: 'S1',
      id: 'chunk-1',
      sourceName: 'returns-policy.txt',
      excerpt: 'Returns are accepted within 30 days.',
    })
  })

  it('does not call Ollama when vector search returns no chunks', async () => {
    searchMock.mockResolvedValue([])

    const result = await generateRagAnswer('workspace-1', 'What is our refund policy?')

    expect(result).toMatchObject({ answer: RAG_NO_ANSWER, grounded: false, citations: [] })
    expect(ollamaMock).not.toHaveBeenCalled()
  })

  it('abstains when Ollama returns no verifiable citation IDs', async () => {
    searchMock.mockResolvedValue([chunk])
    ollamaMock.mockResolvedValue({
      answer: 'The return period is 90 days.',
      citationIds: ['made-up-source'],
    })

    const result = await generateRagAnswer('workspace-1', 'What is the return window?')

    expect(result).toMatchObject({ answer: RAG_NO_ANSWER, grounded: false, citations: [] })
  })
})
