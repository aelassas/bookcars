import type { Request, Response, NextFunction } from 'express'
import redis from '../config/redis'
import * as env from '../config/env.config'
import * as logger from '../utils/logger'

const TOKEN_BUCKET_LUA = `
  local key = KEYS[1]
  local capacity = tonumber(ARGV[1])
  local refillRateMs = tonumber(ARGV[2])
  local now = tonumber(ARGV[3])

  local data = redis.call('HMGET', key, 'tokens', 'lastTime')
  local tokens = tonumber(data[1])
  local lastTime = tonumber(data[2])

  if not tokens then
    tokens = capacity
    lastTime = now
  else
    local timePassed = now - lastTime
    local tokensToAdd = math.floor(timePassed / refillRateMs)
    if tokensToAdd > 0 then
      tokens = math.min(capacity, tokens + tokensToAdd)
      lastTime = lastTime + (tokensToAdd * refillRateMs)
    end
  end

  if tokens > 0 then
    tokens = tokens - 1
    redis.call('HMSET', key, 'tokens', tokens, 'lastTime', lastTime)
    redis.call('EXPIRE', key, 3600) 
    return {1, tokens}
  else
    redis.call('HMSET', key, 'tokens', tokens, 'lastTime', lastTime)
    redis.call('EXPIRE', key, 3600)
    return {0, tokens}
  end
`

const isTest = env.CI || process.env.NODE_ENV === 'test'

export const createRateLimiter = (namespace: string, failClosedOrFn: boolean | (() => boolean) = false) =>
  async (req: Request, res: Response, next: NextFunction) => {
    const failClosed = typeof failClosedOrFn === 'function' ? failClosedOrFn() : failClosedOrFn
    if (isTest && !req.headers['x-test-rate-limit']) {
      return next()
    }

    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1'
    const redisKey = `ratelimit:${namespace}:${ip}`
    const now = Date.now()

    try {
      const result = (await redis.eval(
        TOKEN_BUCKET_LUA,
        1,
        redisKey,
        env.RATE_LIMIT_CAPACITY,
        env.RATE_LIMIT_REFILL_RATE_MS,
        now
      )) as [number, number]

      const allowed = result[0] === 1
      const remainingTokens = result[1]

      res.setHeader('RateLimit-Limit', env.RATE_LIMIT_CAPACITY)
      res.setHeader('RateLimit-Remaining', remainingTokens)

      if (allowed) {
        return next()
      }

      return res.status(429).json({
        message: 'Too many requests, please try again later.',
      })
    } catch {
      if (failClosed) {
        logger.error(`[rateLimiter.${namespace}] Redis unavailable`)
        return res.status(503).json({
          message: 'Service temporarily unavailable.',
        })
      }
      return next()
    }
  }

export const rateLimiter = createRateLimiter('auth')
export default rateLimiter
