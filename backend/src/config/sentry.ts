import * as env from './env.config'
import * as Sentry from '@sentry/node'

/**  
 * Initializes Sentry for error tracking and performance monitoring.
 * 
*/
const initSentry = (): void => {
  if (env.ENABLE_SENTRY && env.SENTRY_DSN_BACKEND) {
    Sentry.init({
      dsn: env.SENTRY_DSN_BACKEND,
      tracesSampleRate: 1.0,
      environment: process.env.NODE_ENV || 'development',
      // Adds request headers and IP for users, for more info visit:
      // https://docs.sentry.io/platforms/javascript/guides/node/configuration/options/#sendDefaultPii
      sendDefaultPii: true,
    })
  }
}

export { Sentry, initSentry }
