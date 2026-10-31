import { mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// Resolves to api/storage/knowledge in both src/ and compiled dist/ layouts.
export const knowledgeStorageDirectory = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../storage/knowledge',
)

export async function ensureKnowledgeStorageDirectory(): Promise<void> {
  await mkdir(knowledgeStorageDirectory, { recursive: true })
}
