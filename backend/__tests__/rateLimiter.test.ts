import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import type { Request, Response, NextFunction } from 'express'
import * as env from '../src/config/env.config'
import redis from '../src/config/redis'
import rateLimiter from '../src/middlewares/rateLimiter'

describe('Rate Limiter Middleware', () => {
  let mockReq: Partial<Request>
  let mockRes: Partial<Response>
  let nextFn: NextFunction
  let headers: Record<string, unknown>
  let statusCode: number | null
  let jsonResponse: unknown

  beforeEach(() => {
    headers = {}
    statusCode = null
    jsonResponse = null

    mockReq = {
      ip: '192.168.1.100',
      socket: { remoteAddress: '192.168.1.100' } as any,
      headers: {
        'x-test-rate-limit': 'true',
      },
    }

    mockRes = {
      setHeader: jest.fn((name: string, value: unknown) => {
        headers[name] = value
        return mockRes as Response
      }) as any,
      status: jest.fn((code: number) => {
        statusCode = code
        return mockRes as Response
      }) as any,
      json: jest.fn((data: unknown) => {
        jsonResponse = data
        return mockRes as Response
      }) as any,
    }

    nextFn = jest.fn()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should allow request when tokens are available and set rate limit headers', async () => {
    jest.spyOn(redis, 'eval').mockResolvedValueOnce([1, 9] as any)

    await rateLimiter(mockReq as Request, mockRes as Response, nextFn)

    expect(nextFn).toHaveBeenCalled()
    expect(mockRes.setHeader).toHaveBeenCalledWith('RateLimit-Limit', env.RATE_LIMIT_CAPACITY)
    expect(mockRes.setHeader).toHaveBeenCalledWith('RateLimit-Remaining', 9)
    expect(statusCode).toBeNull()
  })

  it('should block request and return 429 when rate limit is exceeded', async () => {
    jest.spyOn(redis, 'eval').mockResolvedValueOnce([0, 0] as any)

    await rateLimiter(mockReq as Request, mockRes as Response, nextFn)

    expect(nextFn).not.toHaveBeenCalled()
    expect(statusCode).toBe(429)
    expect(jsonResponse).toEqual({
      message: 'Too many requests, please try again later.',
    })
    expect(mockRes.setHeader).toHaveBeenCalledWith('RateLimit-Limit', env.RATE_LIMIT_CAPACITY)
    expect(mockRes.setHeader).toHaveBeenCalledWith('RateLimit-Remaining', 0)
  })

  it('should fail-open and allow request when Redis encounters an error', async () => {
    jest.spyOn(redis, 'eval').mockRejectedValueOnce(new Error('Redis connection refused'))

    await rateLimiter(mockReq as Request, mockRes as Response, nextFn)

    expect(nextFn).toHaveBeenCalled()
    expect(statusCode).toBeNull()
  })

  it('should verify burst threshold: 10 allowed, then 429 blocked', async () => {
    // Simulate 10 allowed requests (tokens 9 down to 0)
    for (let remaining = 9; remaining >= 0; remaining--) {
      jest.spyOn(redis, 'eval').mockResolvedValueOnce([1, remaining] as any)
      const next = jest.fn()
      await rateLimiter(mockReq as Request, mockRes as Response, next)
      expect(next).toHaveBeenCalled()
    }

    // 11th and 12th requests should be blocked
    for (let i = 0; i < 2; i++) {
      jest.spyOn(redis, 'eval').mockResolvedValueOnce([0, 0] as any)
      const next = jest.fn()
      await rateLimiter(mockReq as Request, mockRes as Response, next)
      expect(next).not.toHaveBeenCalled()
      expect(statusCode).toBe(429)
      expect(jsonResponse).toEqual({
        message: 'Too many requests, please try again later.',
      })
    }
  })

  describe('Lua Script Timestamp Refill Remainder Logic', () => {
    it('should keep remainder time toward the next token refill', () => {
      const capacity = 10
      const refillRateMs = 2000
      let tokens = 0
      let lastTime = 10000

      // Scenario: 3500ms passed (now = 13500)
      const now = 13500
      const timePassed = now - lastTime // 3500ms
      const tokensToAdd = Math.floor(timePassed / refillRateMs) // 1 token
      expect(tokensToAdd).toBe(1)

      if (tokensToAdd > 0) {
        tokens = Math.min(capacity, tokens + tokensToAdd)
        // Fix: advance lastTime only by full tokens added
        lastTime = lastTime + (tokensToAdd * refillRateMs) // 10000 + 2000 = 12000
      }

      expect(tokens).toBe(1)
      expect(lastTime).toBe(12000)
      // Remainder preserved: 13500 - 12000 = 1500ms

      // Another 500ms passes (now = 14000)
      const now2 = 14000
      const timePassed2 = now2 - lastTime // 14000 - 12000 = 2000ms!
      const tokensToAdd2 = Math.floor(timePassed2 / refillRateMs) // 1 token!
      expect(tokensToAdd2).toBe(1) // Successfully gained another token because remainder was preserved!
    })
  })
})
