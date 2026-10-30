export function durationToSeconds(value: string): number {
  const match = /^(\d+)(s|m|h|d)$/.exec(value)
  if (!match) throw new Error('ACCESS_TOKEN_TTL must use seconds, minutes, hours, or days (e.g. 15m)')
  const amount = Number(match[1])
  const multiplier: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86_400 }
  return amount * multiplier[match[2]]
}
