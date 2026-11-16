import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../src/config/env.js', () => ({
  env: {
    OLLAMA_BASE_URL: 'http://127.0.0.1:11434',
    OLLAMA_MODEL: 'qwen2.5:1.5b-instruct',
    OLLAMA_TIMEOUT_MS: 30_000,
    OLLAMA_KEEP_ALIVE: '5m',
  },
}))

import { generateOllamaAnswer } from '../src/services/ollamaService.js'
import type { RagContext } from '../src/services/ragContextBuilder.js'

const context: RagContext = {
  sources: [],
  context: JSON.stringify([{ citationId: 'S1', sourceName: 'returns.txt', content: 'Returns within 30 days.' }]),
}

function mockResponse(content: string, status = 200): Response {
  return new Response(JSON.stringify({ message: { role: 'assistant', content } }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('generateOllamaAnswer', () => {
  it('sends a non-streaming structured chat request and parses the answer', async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockResponse(JSON.stringify({
      answer: 'Eligible orders can be returned within 30 days.',
      citationIds: ['S1'],
    })))
    vi.stubGlobal('fetch', fetchMock)

    const result = await generateOllamaAnswer('What is the return window?', context)

    expect(result).toEqual({
      answer: 'Eligible orders can be returned within 30 days.',
      citationIds: ['S1'],
    })
    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:11434/api/chat',
      expect.objectContaining({ method: 'POST' }),
    )
    const options = fetchMock.mock.calls[0]?.[1] as RequestInit
    const payload = JSON.parse(String(options.body)) as Record<string, any>
    expect(payload.model).toBe('qwen2.5:1.5b-instruct')
    expect(payload.stream).toBe(false)
    expect(payload.format.required).toEqual(['answer', 'citationIds'])
  })

  it('deduplicates citation identifiers', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse(JSON.stringify({
      answer: 'Returns are accepted for 30 days.',
      citationIds: ['S1', 'S1'],
    }))))

    await expect(generateOllamaAnswer('Return window?', context)).resolves.toEqual({
      answer: 'Returns are accepted for 30 days.',
      citationIds: ['S1'],
    })
  })

  it('returns a service error when Ollama is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')))

    await expect(generateOllamaAnswer('Question?', context)).rejects.toMatchObject({
      statusCode: 503,
      code: 'OLLAMA_UNAVAILABLE',
    })
  })

  it('returns a service error for non-successful Ollama responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse('model not found', 404)))

    await expect(generateOllamaAnswer('Question?', context)).rejects.toMatchObject({
      statusCode: 503,
      code: 'OLLAMA_UNAVAILABLE',
    })
  })

  it('rejects malformed model output', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse('not-json')))

    await expect(generateOllamaAnswer('Question?', context)).rejects.toMatchObject({
      statusCode: 502,
      code: 'OLLAMA_INVALID_RESPONSE',
    })
  })
})
