import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals'
import express from 'express'
import request from 'supertest'

describe('POST /api/send-email', () => {
  let app: express.Express
  let frontendHost: string
  let verificationResponse: Record<string, unknown>
  let verificationError: boolean
  let emailError: boolean
  let rateLimitTokens: number
  let redisUnavailable: boolean
  let rateLimitCapacity = 10
  let axiosPost: jest.Mock
  let sendMail: jest.Mock
  let redisEval: jest.Mock
  let previousContactEmail: string | undefined
  let previousRecaptchaSecret: string | undefined
  let previousNodeEnv: string | undefined

  beforeEach(async () => {
    jest.resetModules()
    previousContactEmail = process.env.BC_CONTACT_EMAIL
    previousRecaptchaSecret = process.env.BC_RECAPTCHA_SECRET
    previousNodeEnv = process.env.NODE_ENV
    process.env.BC_CONTACT_EMAIL = 'contact@example.com'
    process.env.BC_RECAPTCHA_SECRET = 'test-secret'

    verificationResponse = { success: true, action: 'submit', score: 0.9 }
    verificationError = false
    emailError = false
    rateLimitTokens = 10
    redisUnavailable = false
    axiosPost = jest.fn(async () => {
      if (verificationError) {
        throw new Error('verification failure')
      }
      return { data: verificationResponse }
    })
    sendMail = jest.fn(async () => {
      if (emailError) {
        throw new Error('SMTP credentials or personal data must not reach the response')
      }
      return { messageId: 'mock-message' }
    })
    redisEval = jest.fn(async () => {
      if (redisUnavailable) {
        throw new Error('Redis unavailable')
      }
      if (rateLimitTokens === 0) {
        return [0, 0]
      }
      rateLimitTokens -= 1
      return [1, rateLimitTokens]
    })

    jest.unstable_mockModule('axios', () => ({
      default: { post: axiosPost },
    }))
    jest.unstable_mockModule('../src/utils/mailHelper.js', () => ({
      sendMail,
    }))
    jest.unstable_mockModule('../src/config/redis.js', () => ({
      default: { eval: redisEval },
    }))

    const env = await import('../src/config/env.config.js')
    frontendHost = env.FRONTEND_HOST
    rateLimitCapacity = env.RATE_LIMIT_CAPACITY
    rateLimitTokens = rateLimitCapacity
    const userRoutes = (await import('../src/routes/userRoutes.js')).default

    app = express()
    app.use(express.json())
    app.use(userRoutes)
  })

  afterEach(() => {
    if (previousContactEmail === undefined) {
      delete process.env.BC_CONTACT_EMAIL
    } else {
      process.env.BC_CONTACT_EMAIL = previousContactEmail
    }

    if (previousRecaptchaSecret === undefined) {
      delete process.env.BC_RECAPTCHA_SECRET
    } else {
      process.env.BC_RECAPTCHA_SECRET = previousRecaptchaSecret
    }

    if (previousNodeEnv === undefined) {
      delete process.env.NODE_ENV
    } else {
      process.env.NODE_ENV = previousNodeEnv
    }
  })

  const validPayload = () => ({
    from: 'sender@example.com',
    subject: 'Help',
    message: 'Please contact me.',
    isContactForm: true,
    recaptchaToken: 'valid-token',
  })

  const submit = (payload: object) =>
    request(app)
      .post('/api/send-email')
      .set('Origin', frontendHost)
      .send(payload)

  it('sends valid contact submissions only to the configured recipient', async () => {
    const response = await submit({ ...validPayload(), to: 'attacker@example.net' })

    expect(response.statusCode).toBe(200)
    expect(axiosPost).toHaveBeenCalledTimes(1)
    expect(axiosPost).toHaveBeenCalledWith(
      'https://www.google.com/recaptcha/api/siteverify',
      expect.any(URLSearchParams),
      { timeout: 5000 }
    )
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'contact@example.com',
      from: expect.any(String),
    }))
    expect(sendMail.mock.calls[0][0]).not.toHaveProperty('to', 'attacker@example.net')
  })

  it('escapes user-provided HTML before converting message newlines', async () => {
    const response = await submit({
      ...validPayload(),
      subject: '<img src=x onerror=alert(1)> & "subject"',
      message: 'first line\n<script>alert(1)</script>\r\nlast line',
    })
    const sentMail = sendMail.mock.calls[0][0] as { html: string, text: string }

    expect(response.statusCode).toBe(200)
    expect(sentMail.html).toContain('&lt;img src=x onerror=alert(1)&gt; &amp; &quot;subject&quot;')
    expect(sentMail.html).toContain('first line<br>&lt;script&gt;alert(1)&lt;&#x2F;script&gt;<br>last line')
    expect(sentMail.html).not.toContain('<script>')
    expect(sentMail.text).toContain('first line\n<script>alert(1)</script>\r\nlast line')
  })

  it('rejects HTML injection in the email-address field', async () => {
    const response = await submit({
      ...validPayload(),
      from: '"><script>alert(1)</script>@example.com',
    })

    expect(response.statusCode).toBe(400)
    expect(sendMail).not.toHaveBeenCalled()
    expect(axiosPost).not.toHaveBeenCalled()
  })

  it('requires a token when server-side reCAPTCHA is enabled', async () => {
    const payload = validPayload()
    delete (payload as Partial<typeof payload>).recaptchaToken

    const response = await submit(payload)

    expect(response.statusCode).toBe(400)
    expect(axiosPost).not.toHaveBeenCalled()
    expect(sendMail).not.toHaveBeenCalled()
  })

  it('allows reCAPTCHA to be disabled in development without a server secret', async () => {
    delete process.env.BC_RECAPTCHA_SECRET
    jest.resetModules()

    const env = await import('../src/config/env.config.js')

    expect(env.RECAPTCHA_REQUIRED).toBe(false)
  })

  it('requires reCAPTCHA in production even when the server secret is missing', async () => {
    process.env.NODE_ENV = 'production'
    delete process.env.BC_RECAPTCHA_SECRET
    jest.resetModules()

    const env = await import('../src/config/env.config.js')

    expect(env.RECAPTCHA_REQUIRED).toBe(true)
  })

  it('uses the shared server-side verifier for the existing reCAPTCHA endpoint', async () => {
    const response = await request(app)
      .post('/api/verify-recaptcha/valid-token/203.0.113.10')

    expect(response.statusCode).toBe(200)
    expect(axiosPost).toHaveBeenCalledTimes(1)
    expect((axiosPost.mock.calls[0][1] as URLSearchParams).get('remoteip')).not.toBe('203.0.113.10')
  })

  it.each([
    ['unsuccessful', { success: false, action: 'submit', score: 0.9 }],
    ['expired or duplicate', { success: false, 'error-codes': ['timeout-or-duplicate'] }],
    ['wrong action', { success: true, action: 'other', score: 0.9 }],
    ['low score', { success: true, action: 'submit', score: 0.1 }],
    ['missing score', { success: true, action: 'submit' }],
  ])('rejects %s reCAPTCHA verification results', async (_label, result) => {
    verificationResponse = result

    const response = await submit(validPayload())

    expect(response.statusCode).toBe(400)
    expect(sendMail).not.toHaveBeenCalled()
  })

  it('fails closed when the reCAPTCHA verification service errors', async () => {
    verificationError = true

    const response = await submit(validPayload())

    expect(response.statusCode).toBe(503)
    expect(response.body.message).toBe('reCAPTCHA verification is unavailable.')
    expect(JSON.stringify(response.body)).not.toContain('test-secret')
    expect(sendMail).not.toHaveBeenCalled()
  })

  it('sends newsletter subscriptions to the same configured recipient', async () => {
    const response = await submit({
      ...validPayload(),
      subject: 'New Newsletter Subscription',
      message: '',
      isContactForm: false,
    })

    expect(response.statusCode).toBe(200)
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'contact@example.com',
      subject: 'New Newsletter Subscription',
    }))
  })

  it('returns 429 after the Redis-backed email limit is exhausted', async () => {
    for (let attempt = 0; attempt < rateLimitCapacity; attempt += 1) {
      const allowedResponse = await request(app)
        .post('/api/send-email')
        .set('Origin', frontendHost)
        .set('x-test-rate-limit', 'true')
        .send(validPayload())
      expect(allowedResponse.statusCode).toBe(200)
    }

    const limitedResponse = await request(app)
      .post('/api/send-email')
      .set('Origin', frontendHost)
      .set('x-test-rate-limit', 'true')
      .send(validPayload())

    expect(limitedResponse.statusCode).toBe(429)
    expect(limitedResponse.body.message).toBe('Too many requests, please try again later.')
    expect(sendMail).toHaveBeenCalledTimes(rateLimitCapacity)
  })

it('fails closed when the Redis limiter is unavailable in production', async () => {
  const originalEnv = process.env.NODE_ENV
  process.env.NODE_ENV = 'production'
  redisUnavailable = true

  try {
    const response = await request(app)
      .post('/api/send-email')
      .set('Origin', frontendHost)
      .set('x-test-rate-limit', 'true')
      .send(validPayload())

    expect(response.statusCode).toBe(503)
    expect(sendMail).not.toHaveBeenCalled()
  } finally {
    process.env.NODE_ENV = originalEnv
    redisUnavailable = false
  }
})

  it.each([
    ['invalid email', { from: 'not-an-email' }],
    ['empty subject', { subject: ' ' }],
    ['oversized subject', { subject: 'a'.repeat(201) }],
    ['non-string message', { message: 42 }],
    ['oversized message', { message: 'a'.repeat(5001) }],
    ['oversized token', { recaptchaToken: 'a'.repeat(4097) }],
  ])('rejects %s request fields', async (_label, override) => {
    const response = await submit({ ...validPayload(), ...override })

    expect(response.statusCode).toBe(400)
    expect(sendMail).not.toHaveBeenCalled()
    expect(axiosPost).not.toHaveBeenCalled()
  })

  it('returns a safe error response when SMTP sending fails', async () => {
    emailError = true

    const response = await submit(validPayload())

    expect(response.statusCode).toBe(500)
    expect(response.body.message).toBe('Unable to send email.')
    expect(JSON.stringify(response.body)).not.toContain('SMTP credentials')
  })
})
