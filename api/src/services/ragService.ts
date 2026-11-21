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
  confidence?: number
}

export interface ConversationMessage {
  senderType: 'customer' | 'assistant' | 'agent' | 'system'
  content: string
  createdAt: Date | string
}

export async function generateRagAnswer(
  workspaceId: string,
  question: string,
  limit = 5,
  options?: {
    conversationHistory?: ConversationMessage[]
    aiConfig?: { customInstructions?: string; tone?: string; responseLength?: string; includeSources?: boolean; maxSources?: number; fallbackMessage?: string; maxConversationHistory?: number }
  }
): Promise<RagAnswer> {
  const retrievedChunks = await searchKnowledgeChunks(workspaceId, question, limit)
  const ragContext = buildRagContext(retrievedChunks)

  if (ragContext.sources.length === 0) {
    const fallbackMessage = options?.aiConfig?.fallbackMessage || 'I could not find that information in this workspace knowledge base.'
    return {
      answer: fallbackMessage,
      grounded: false,
      model: env.OLLAMA_MODEL,
      citations: [],
      confidence: 0,
    }
  }

  // Build conversation context if available
  let conversationContext = ''
  if (options?.conversationHistory && options.conversationHistory.length > 0) {
    const maxHistory = options.aiConfig?.maxConversationHistory ?? 5
    const history = options.conversationHistory
      .slice(-maxHistory)
      .map((msg) => `${msg.senderType}: ${msg.content}`)
      .join('\n')
    conversationContext = `\n\nConversation history:\n${history}\n`
  }

  // Build custom instructions
  let customInstructions = ''
  if (options?.aiConfig?.customInstructions) {
    customInstructions = `\n\nCustom instructions:\n${options.aiConfig.customInstructions}\n`
  }

  const ragContextWithHistory = {
    ...ragContext,
    context: ragContext.context + conversationContext + customInstructions,
  }

  const generated = await generateOllamaAnswer(question, ragContextWithHistory)
  const citations = buildRagCitations(generated.citationIds, ragContext.sources)

  // A model response without a verifiable source is never returned as fact.
  if (citations.length === 0) {
    const fallbackMessage = options?.aiConfig?.fallbackMessage || 'I could not find that information in this workspace knowledge base.'
    return {
      answer: fallbackMessage,
      grounded: false,
      model: env.OLLAMA_MODEL,
      citations: [],
      confidence: 0,
    }
  }

  // Calculate confidence based on citation scores
  const avgScore = citations.reduce((sum, c) => sum + c.score, 0) / citations.length
  const confidence = Math.round(avgScore * 100)

  return {
    answer: generated.answer,
    grounded: true,
    model: env.OLLAMA_MODEL,
    citations,
    confidence,
  }
}
