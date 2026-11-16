import type { KnowledgeSearchResult } from './vectorSearchService.js'

export type RagContextSource = KnowledgeSearchResult & {
  citationId: string
}

export type RagContext = {
  sources: RagContextSource[]
  context: string
}

export const MAX_RAG_CONTEXT_CHARACTERS = 12_000

/**
 * Give each retrieved chunk a stable, request-local citation identifier.
 * The JSON context keeps source boundaries explicit for the language model.
 */
export function buildRagContext(results: KnowledgeSearchResult[]): RagContext {
  let remainingCharacters = MAX_RAG_CONTEXT_CHARACTERS
  const sources: RagContextSource[] = []

  for (const result of results) {
    const content = result.content.trim()
    if (!content || remainingCharacters <= 0) continue

    const excerpt = content.slice(0, remainingCharacters)
    remainingCharacters -= excerpt.length

    sources.push({
      ...result,
      content: excerpt,
      citationId: `S${sources.length + 1}`,
    })
  }

  const context = JSON.stringify(sources.map((source) => ({
    citationId: source.citationId,
    sourceName: source.sourceName,
    chunkIndex: source.chunkIndex,
    pageCount: source.pageCount,
    content: source.content,
  })), null, 2)

  return { sources, context }
}
