import { describe, expect, it } from 'vitest'
import { slugify } from '../src/utils/slug.js'
import { durationToSeconds } from '../src/utils/duration.js'

describe('slugify', () => {
  it('normalizes a workspace name into a URL-safe slug', () => {
    expect(slugify('  Acme Studio & Co.  ')).toBe('acme-studio-co')
  })

  it('returns a safe fallback when a name has no URL-safe characters', () => {
    expect(slugify('🔥')).toBe('workspace')
  })
})

describe('durationToSeconds', () => {
  it('converts supported JWT duration units', () => {
    expect(durationToSeconds('15m')).toBe(900)
    expect(durationToSeconds('2h')).toBe(7200)
    expect(durationToSeconds('30s')).toBe(30)
  })

  it('rejects an unsupported duration format', () => {
    expect(() => durationToSeconds('15 minutes')).toThrow(/ACCESS_TOKEN_TTL/)
  })
})
