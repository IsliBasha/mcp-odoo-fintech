import { Redis } from 'ioredis'

const KEY_PREFIX = 'mcp:odoo:'
let _client: Redis | null = null

export function getRedisClient(): Redis | null {
  if (!process.env.REDIS_URL) return null
  if (!_client) _client = new Redis(process.env.REDIS_URL)
  return _client
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const client = getRedisClient()
  if (!client) return null
  const value = await client.get(`${KEY_PREFIX}${key}`)
  return value ? (JSON.parse(value) as T) : null
}

export async function cacheSet<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  const client = getRedisClient()
  if (!client) return
  await client.setex(`${KEY_PREFIX}${key}`, ttlSeconds, JSON.stringify(value))
}
