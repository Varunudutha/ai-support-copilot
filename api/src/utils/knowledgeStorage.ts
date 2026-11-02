import { mkdir } from 'node:fs/promises'
import { basename, dirname, isAbsolute, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { AppError } from './appError.js'

// Resolves to api/storage/knowledge in both src/ and compiled dist/ layouts.
export const knowledgeStorageDirectory = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../storage/knowledge',
)

export async function ensureKnowledgeStorageDirectory(): Promise<void> {
  await mkdir(knowledgeStorageDirectory, { recursive: true })
}

/** Resolve only a generated storage filename, never a user-supplied path. */
export function resolveKnowledgeDocumentPath(storageKey: string): string {
  const normalizedKey = storageKey.replace(/\\/g, '/')
  const safeFilename = basename(normalizedKey)
  const filePath = resolve(knowledgeStorageDirectory, safeFilename)
  const storagePrefix = `${resolve(knowledgeStorageDirectory)}${sep}`

  if (
    !storageKey ||
    normalizedKey !== safeFilename ||
    safeFilename === '.' ||
    safeFilename === '..' ||
    isAbsolute(storageKey) ||
    !filePath.startsWith(storagePrefix)
  ) {
    throw new AppError('Stored document path is invalid', 500, 'INVALID_STORAGE_KEY')
  }

  return filePath
}
