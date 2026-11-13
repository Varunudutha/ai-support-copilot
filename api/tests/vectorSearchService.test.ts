import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Types } from 'mongoose'

vi.mock('../src/models/KnowledgeChunk.js', () => ({
  KnowledgeChunk: {
    collection: {
      aggregate: vi.fn(),
    },
  },
}))

vi.mock('../src/services/embeddingService.js', () => ({
  generateEmbeddings: vi.fn(),
}))

import { KnowledgeChunk } from '../src/models/KnowledgeChunk.js'
import { generateEmbeddings } from '../src/services/embeddingService.js'
import {
  searchKnowledgeChunks,
  VECTOR_SEARCH_INDEX_NAME,
} from '../src/services/vectorSearchService.js'

const workspaceId = '64b000000000000000000001'
const queryVector = Array(384).fill(0.1)
const chunkId = new Types.ObjectId('64b000000000000000000002')
const documentId = new Types.ObjectId('64b000000000000000000003')

const records = [{
  _id: chunkId,
  documentId,
  chunkIndex: 0,
  content: 'Returns are accepted within 30 days.',
  sourceName: 'returns-policy.txt',
  mimeType: 'text/plain',
  pageCount: null,
  score: 0.87,
}]

const aggregateMock = vi.mocked(KnowledgeChunk.collection.aggregate)
const embeddingMock = vi.mocked(generateEmbeddings)

beforeEach(() => {
  embeddingMock.mockResolvedValue([queryVector])

  aggregateMock.mockReturnValue({
    toArray: vi.fn().mockResolvedValue(records),
  } as never)
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('searchKnowledgeChunks', () => {
  it('returns matching chunks with source details and scores', async () => {
    const results = await searchKnowledgeChunks(
      workspaceId,
      'What is the returns policy?',
      5,
    )

    expect(results).toHaveLength(1)
    expect(results[0]).toMatchObject({
      id: String(chunkId),
      documentId: String(documentId),
      chunkIndex: 0,
      sourceName: 'returns-policy.txt',
      score: 0.87,
    })
  })

  it('uses the local embedding model for the query', async () => {
    await searchKnowledgeChunks(workspaceId, 'Where is my refund?')

    expect(embeddingMock).toHaveBeenCalledWith(['Where is my refund?'])
  })

  it('pre-filters the vector search by workspace ObjectId', async () => {
    await searchKnowledgeChunks(workspaceId, 'Returns policy', 5)

    const pipeline = aggregateMock.mock.calls[0]?.[0] as Array<Record<string, any>>
    const vectorStage = pipeline[0]?.$vectorSearch

    expect(vectorStage.index).toBe(VECTOR_SEARCH_INDEX_NAME)
    expect(vectorStage.path).toBe('embedding')
    expect(vectorStage.filter.workspaceId).toEqual(new Types.ObjectId(workspaceId))
  })

  it('uses at least 20 candidates per requested result', async () => {
    await searchKnowledgeChunks(workspaceId, 'Returns policy', 5)

    const pipeline = aggregateMock.mock.calls[0]?.[0] as Array<Record<string, any>>
    expect(pipeline[0]?.$vectorSearch.numCandidates).toBe(100)
    expect(pipeline[0]?.$vectorSearch.limit).toBe(5)
  })

  it('rejects an invalid workspace ID', async () => {
    await expect(
      searchKnowledgeChunks('invalid-workspace', 'Returns policy'),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: 'INVALID_WORKSPACE_ID',
    })

    expect(embeddingMock).not.toHaveBeenCalled()
  })

  it('rejects an empty query', async () => {
    await expect(
      searchKnowledgeChunks(workspaceId, '   '),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: 'EMPTY_SEARCH_QUERY',
    })
  })

  it('rejects an invalid query embedding', async () => {
    embeddingMock.mockResolvedValueOnce([])

    await expect(
      searchKnowledgeChunks(workspaceId, 'Returns policy'),
    ).rejects.toMatchObject({
      statusCode: 503,
      code: 'INVALID_QUERY_EMBEDDING',
    })
  })

  it('returns no results when Atlas finds no matching chunks', async () => {
    aggregateMock.mockReturnValue({
      toArray: vi.fn().mockResolvedValue([]),
    } as never)

    await expect(
      searchKnowledgeChunks(workspaceId, 'Unknown policy'),
    ).resolves.toEqual([])
  })
})