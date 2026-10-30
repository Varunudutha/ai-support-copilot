import { describe, expect, it } from 'vitest'
import { isTrustedFrontendOrigin } from '../src/middleware/requireTrustedOrigin.js'

describe('isTrustedFrontendOrigin', () => {
  const configuredOrigin = 'http://localhost:5173'

  it('accepts the exact configured frontend origin', () => {
    expect(isTrustedFrontendOrigin('http://localhost:5173', configuredOrigin, 'production')).toBe(true)
  })

  it('accepts alternate loopback ports in local development', () => {
    expect(isTrustedFrontendOrigin('http://localhost:5174', configuredOrigin, 'development')).toBe(true)
    expect(isTrustedFrontendOrigin('http://127.0.0.1:5173', configuredOrigin, 'development')).toBe(true)
  })

  it('does not allow alternate origins in production', () => {
    expect(isTrustedFrontendOrigin('http://localhost:5174', configuredOrigin, 'production')).toBe(false)
  })

  it('rejects non-loopback and deceptive hostnames', () => {
    expect(isTrustedFrontendOrigin('http://localhost.attacker.test:5173', configuredOrigin, 'development')).toBe(false)
    expect(isTrustedFrontendOrigin('http://192.168.1.20:5173', configuredOrigin, 'development')).toBe(false)
    expect(isTrustedFrontendOrigin('https://localhost:5174', configuredOrigin, 'development')).toBe(false)
  })

  it('rejects missing or malformed origins', () => {
    expect(isTrustedFrontendOrigin(undefined, configuredOrigin, 'development')).toBe(false)
    expect(isTrustedFrontendOrigin('not-an-origin', configuredOrigin, 'development')).toBe(false)
  })
})
