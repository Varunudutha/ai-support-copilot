import type { RagContextSource } from './ragContextBuilder.js'

export type RagCitation = {
  citationId: string
  id: string
  documentId: string
  chunkIndex: number
  sourceName: string
  mimeType: string
  pageCount: number | null
  score: number
  excerpt: string
}

/** Only citations that map to chunks retrieved for this request are returned. */
export function buildRagCitations(
  citationIds: string[],
  sources: RagContextSource[],
): RagCitation[] {
  const requestedIds = new Set(citationIds)

  return sources
    .filter((source) => requestedIds.has(source.citationId))
    .map((source) => ({
      citationId: source.citationId,
      id: source.id,
      documentId: source.documentId,
      chunkIndex: source.chunkIndex,
      sourceName: source.sourceName,
      mimeType: source.mimeType,
      pageCount: source.pageCount,
      score: source.score,
      excerpt: source.content,
    }))
}
