import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../src/config/env.js', () => ({
  env: {
    AI_SERVICE_URL: 'http://127.0.0.1:8000',
    AI_SERVICE_TIMEOUT_MS: 5000,
  },
}))

import { generateEmbeddings } from '../src/services/embeddingService.js'

function mockResponse(
  count: number,
  dimensions = 384,
  status = 200,
): Response {
  return new Response(JSON.stringify({
    model: 'sentence-transformers/all-MiniLM-L6-v2',
    dimensions,
    count,
    embeddings: Array.from(
      { length: count },
      () => Array( dimensions ).fill(0.25),
    ),
  }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('generateEmbeddings', () => {
  it('returns valid 384-dimensional vectors', async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockResponse(2))
    vi.stubGlobal('fetch', fetchMock)

    const texts = ['How can I return an order?', 'Where is my refund?']
    const vectors = await generateEmbeddings(texts)

    expect(vectors).toHaveLength(2)
    expect(vectors[0]).toHaveLength(384)
    expect(vectors[1]).toHaveLength(384)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    const requestOptions = fetchMock.mock.calls[0][1] as RequestInit
    expect(requestOptions.method).toBe('POST')
    expect(JSON.parse(String(requestOptions.body))).toEqual({ texts })
  })

  it('splits more than 32 texts into multiple requests', async () => {
    const batches: string[][] = []
    const fetchMock = vi.fn().mockImplementation(
      async (_url: unknown, options: RequestInit) => {
        const payload = JSON.parse(String(options.body)) as { texts: string[] }
        batches.push(payload.texts)
        return mockResponse(payload.texts.length)
      },
    )
    vi.stubGlobal('fetch', fetchMock)

    const texts = Array.from({ length: 33 }, (_, index) => `Document chunk ${index}`)
    const vectors = await generateEmbeddings(texts)

    expect(vectors).toHaveLength(33)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(batches[0]).toHaveLength(32)
    expect(batches[1]).toHaveLength(1)
  })

  it('returns an empty array without calling the service for empty input', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await expect(generateEmbeddings([])).resolves.toEqual([])
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects an unsuccessful AI service response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse(1, 384, 503)))

    await expect(generateEmbeddings(['hello'])).rejects.toMatchObject({
      statusCode: 503,
      code: 'EMBEDDING_SERVICE_UNAVAILABLE',
    })
  })

  it('rejects an unexpected embedding dimension', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse(1, 128)))

    await expect(generateEmbeddings(['hello'])).rejects.toMatchObject({
      statusCode: 503,
      code: 'EMBEDDING_SERVICE_UNAVAILABLE',
    })
  })

  it('handles connection failures with a clear service error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Connection refused')))

    await expect(generateEmbeddings(['hello'])).rejects.toMatchObject({
      statusCode: 503,
      code: 'EMBEDDING_SERVICE_UNAVAILABLE',
    })
  })
})