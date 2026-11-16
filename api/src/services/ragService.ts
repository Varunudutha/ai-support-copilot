import { env } from '../config/env.js'
import { searchKnowledgeChunks } from './vectorSearchService.js'
import { buildRagContext } from './ragContextBuilder.js'
import { generateOllamaAnswer } from './ollamaService.js'
import { buildRagCitations } from './citationBuilder.js'

export const RAG_NO_ANSWER = 'I could not find that information in this workspace knowledge base.'

export type RagAnswer = {
  answer: string
  grounded: boolean
  model: string
  citations: ReturnType<typeof buildRagCitations>
}

export async function generateRagAnswer(
  workspaceId: string,
  question: string,
  limit = 5,
): Promise<RagAnswer> {
  const retrievedChunks = await searchKnowledgeChunks(workspaceId, question, limit)
  const ragContext = buildRagContext(retrievedChunks)

  if (ragContext.sources.length === 0) {
    return {
      answer: RAG_NO_ANSWER,
      grounded: false,
      model: env.OLLAMA_MODEL,
      citations: [],
    }
  }

  const generated = await generateOllamaAnswer(question, ragContext)
  const citations = buildRagCitations(generated.citationIds, ragContext.sources)

  // A model response without a verifiable source is never returned as fact.
  if (citations.length === 0) {
    return {
      answer: RAG_NO_ANSWER,
      grounded: false,
      model: env.OLLAMA_MODEL,
      citations: [],
    }
  }

  return {
    answer: generated.answer,
    grounded: true,
    model: env.OLLAMA_MODEL,
    citations,
  }
}
