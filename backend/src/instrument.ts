import 'dotenv/config'
import * as Sentry from '@sentry/node'

const enableSentry = process.env.BC_ENABLE_SENTRY?.trim().toLowerCase() === 'true'
const dsn = process.env.BC_SENTRY_DSN_BACKEND?.trim()
const rawRate = process.env.BC_SENTRY_TRACES_SAMPLE_RATE?.trim()
let tracesSampleRate = Number.parseFloat(rawRate || '1.0')
if (Number.isNaN(tracesSampleRate)) {
  console.warn('[Sentry] Invalid tracesSampleRate. Defaulting to 1.0')
  tracesSampleRate = 1.0
}

if (enableSentry && dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    // Adds request headers and IP for users, for more info visit:
    // https://docs.sentry.io/platforms/javascript/guides/node/configuration/options/#sendDefaultPii
    sendDefaultPii: true,
    // Set tracesSampleRate to 1.0 to capture 100%
    // of transactions for tracing.
    // We recommend adjusting this value in production
    // 0.1 means 10% of transactions will be sent to Sentry
    // Learn more at
    // https://docs.sentry.io/platforms/javascript/guides/node/configuration/options/#tracesSampleRate
    tracesSampleRate,
  })
  console.log('[Sentry] Initialized with DSN:', dsn)
} else {
  console.log('[Sentry] Skipped: Disabled or missing DSN.')
}
