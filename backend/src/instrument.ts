import 'dotenv/config'
import * as Sentry from '@sentry/node'
import * as env from './config/env.config'
import * as logger from './common/logger'

if (env.ENABLE_SENTRY) {
  if (env.SENTRY_TRACES_SAMPLE_RATE === 0) {
    logger.info('[Sentry] Traces sample rate is set to 0, no transactions will be sent.')
  }
  Sentry.init({
    dsn: env.SENTRY_DSN_BACKEND,
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
    tracesSampleRate: env.SENTRY_TRACES_SAMPLE_RATE,
  })
  logger.info('[Sentry] Initialized with DSN:', env.SENTRY_DSN_BACKEND)
} else {
  logger.info('[Sentry] Skipped: Disabled or missing DSN.')
}
