import { Types } from 'mongoose'
import { KnowledgeChunk } from '../models/KnowledgeChunk.js'
import { generateEmbeddings } from './embeddingService.js'
import { AppError } from '../utils/appError.js'

export const VECTOR_SEARCH_INDEX_NAME = 'knowledge_chunks_vector_index'
export const VECTOR_SEARCH_DIMENSIONS = 384

export type KnowledgeSearchResult = {
  id: string
  documentId: string
  chunkIndex: number
  content: string
  sourceName: string
  mimeType: string
  pageCount: number | null
  score: number
}

type VectorSearchRecord = {
  _id: unknown
  documentId: unknown
  chunkIndex: number
  content: string
  sourceName: string
  mimeType: string
  pageCount?: number | null
  score: number
}

export async function searchKnowledgeChunks(
  workspaceId: string,
  query: string,
  limit = 5,
): Promise<KnowledgeSearchResult[]> {
  if (!Types.ObjectId.isValid(workspaceId)) {
    throw new AppError('Workspace identifier is invalid', 400, 'INVALID_WORKSPACE_ID')
  }

  if (!query.trim()) {
    throw new AppError('Search query cannot be empty', 400, 'EMPTY_SEARCH_QUERY')
  }

  const embeddings = await generateEmbeddings([query])
  const queryVector = embeddings[0]

  if (
    !queryVector ||
    queryVector.length !== VECTOR_SEARCH_DIMENSIONS ||
    !queryVector.every((value) => Number.isFinite(value))
  ) {
    throw new AppError(
      'The embedding service returned an invalid query vector.',
      503,
      'INVALID_QUERY_EMBEDDING',
    )
  }

  const pipeline = [
    {
      $vectorSearch: {
        index: VECTOR_SEARCH_INDEX_NAME,
        path: 'embedding',
        queryVector,
        numCandidates: Math.max(limit * 20, 100),
        limit,
        filter: {
          workspaceId: new Types.ObjectId(workspaceId),
        },
      },
    },
    {
      $project: {
        _id: 1,
        documentId: 1,
        chunkIndex: 1,
        content: 1,
        sourceName: 1,
        mimeType: 1,
        pageCount: 1,
        score: { $meta: 'vectorSearchScore' },
      },
    },
  ]

  try {
    const records = await KnowledgeChunk.collection
      .aggregate(pipeline)
      .toArray() as unknown as VectorSearchRecord[]

    return records.map((record) => ({
      id: String(record._id),
      documentId: String(record.documentId),
      chunkIndex: record.chunkIndex,
      content: record.content,
      sourceName: record.sourceName,
      mimeType: record.mimeType,
      pageCount: record.pageCount ?? null,
      score: record.score,
    }))
  } catch (error) {
    console.error('MongoDB Vector Search failed:', error)

    throw new AppError(
      'Vector search is unavailable. Check that the Atlas index knowledge_chunks_vector_index exists and is READY.',
      503,
      'VECTOR_SEARCH_UNAVAILABLE',
    )
  }
}