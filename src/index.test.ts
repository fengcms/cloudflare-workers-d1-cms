import { describe, expect, it } from 'vitest'
import app from './index'

describe('Cloudflare CMS API - Basic Setup', () => {
  it('should respond to health check', async () => {
    const req = new Request('http://localhost/health')
    const env = {
      ENVIRONMENT: 'development' as const,
      JWT_SECRET: 'test-secret',
      JWT_EXPIRATION: '7d',
    } as any

    const res = await app.fetch(req, env)
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data).toHaveProperty('status', 'ok')
    expect(data).toHaveProperty('environment', 'development')
    expect(data).toHaveProperty('timestamp')
  })

  it('should respond to API version endpoint', async () => {
    const req = new Request('http://localhost/api/v1')
    const env = {
      ENVIRONMENT: 'development' as const,
      JWT_SECRET: 'test-secret',
      JWT_EXPIRATION: '7d',
    } as any

    const res = await app.fetch(req, env)
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data).toHaveProperty('version', 'v1')
    expect(data).toHaveProperty('name', 'Cloudflare CMS API')
    expect(data).toHaveProperty('description')
  })
})
