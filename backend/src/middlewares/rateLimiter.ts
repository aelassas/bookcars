import type { Request, Response, NextFunction } from 'express'
import redis from '../config/redis'


const CAPACITY = 10         
const REFILL_RATE_MS = 2000 


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
      lastTime = now
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

export const rateLimiter = async (req: Request, res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV === 'test' && !req.headers['x-test-rate-limit']) {
    return next()
  }

  const ip = req.ip || req.socket.remoteAddress || '127.0.0.1'
  const redisKey = `ratelimit:auth:${ip}`
  const now = Date.now()

  try {
    const result = (await redis.eval(
      TOKEN_BUCKET_LUA,
      1,
      redisKey,
      CAPACITY,
      REFILL_RATE_MS,
      now
    )) as [number, number]

    const allowed = result[0] === 1
    const remainingTokens = result[1]

    res.setHeader('RateLimit-Limit', CAPACITY)
    res.setHeader('RateLimit-Remaining', remainingTokens)

    if (allowed) {
      return next()
    }

    return res.status(429).json({
      message: 'Too many requests, please try again later.',
    })
  } catch (error) {
    return next()
  }
}

export default rateLimiter
