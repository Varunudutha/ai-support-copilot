import { env } from '../config/env.js'
import { AppError } from '../utils/appError.js'

export const EMBEDDING_DIMENSIONS = 384
const MAX_TEXTS_PER_REQUEST = 32

type EmbeddingApiResponse = {
  model: string
  dimensions: number
  count: number
  embeddings: number[][]
}

function unavailableError(): AppError {
  return new AppError(
    'The local embedding service is unavailable or returned an invalid response. Ensure the Python AI service is running.',
    503,
    'EMBEDDING_SERVICE_UNAVAILABLE',
  )
}

function validateResponse(payload: unknown, expectedCount: number): number[][] {
  if (typeof payload !== 'object' || payload === null) {
    throw unavailableError()
  }

  const result = payload as Partial<EmbeddingApiResponse>

  if (
    typeof result.model !== 'string' ||
    result.dimensions !== EMBEDDING_DIMENSIONS ||
    result.count !== expectedCount ||
    !Array.isArray(result.embeddings) ||
    result.embeddings.length !== expectedCount
  ) {
    throw unavailableError()
  }

  const vectors: number[][] = []

  for (const vector of result.embeddings) {
    if (
      !Array.isArray(vector) ||
      vector.length !== EMBEDDING_DIMENSIONS ||
      !vector.every((value) => typeof value === 'number' && Number.isFinite(value))
    ) {
      throw unavailableError()
    }

    vectors.push(vector)
  }

  return vectors
}

/**
 * Generate local MiniLM embeddings.
 * The Python service accepts at most 32 texts per request, so larger
 * document batches are split into sequential requests.
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) {
    return []
  }

  const endpoint = `${env.AI_SERVICE_URL.replace(/\/+$/, '')}/embeddings`
  const allEmbeddings: number[][] = []

  for (let start = 0; start < texts.length; start += MAX_TEXTS_PER_REQUEST) {
    const batch = texts.slice(start, start + MAX_TEXTS_PER_REQUEST)

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texts: batch }),
        signal: AbortSignal.timeout(env.AI_SERVICE_TIMEOUT_MS),
      })

      if (!response.ok) {
        throw unavailableError()
      }

      const payload: unknown = await response.json()
      const embeddings = validateResponse(payload, batch.length)
      allEmbeddings.push(...embeddings)
    } catch (error) {
      if (error instanceof AppError) {
        throw error
      }
      throw unavailableError()
    }
  }

  return allEmbeddings
}