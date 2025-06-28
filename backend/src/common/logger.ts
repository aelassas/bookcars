import winston, { format, transports } from 'winston'
import * as helper from './helper'
import * as env from '../config/env.config'
import { Sentry } from '../config/sentry'

/**
 * Enables logging.
 *
 * @type {boolean}
 */
let enableLogs = true

/**
 * Enables error logging.
 *
 * @type {boolean}
 */
let enableErrorLogs = true

/**
 * Map of log levels to emoji prefixes.
 */
const prefixMap = {
  info: 'ℹ️',
  warn: '⚠️',
  success: '✅',
  error: '❌',
}

/**
 * Fixes the message formatting for specific terminals (e.g. VSCode)
 * by adding spaces after certain emojis to prevent squishing.
 *
 * @param {string} message - The log message to fix.
 * @returns {string} - The fixed message.
 */
const fixMessage = (message: string): string => {
  const isVSCodeTerminal = process.env.TERM_PROGRAM?.includes('vscode')
  return isVSCodeTerminal ? message.replace(/(ℹ️|⚠️)/g, '$1 ') : message
}

/**
 * Winston log message format.
 */
const logFormat = format.printf(({ timestamp, level, message }) =>
  `${timestamp} ${level}: ${message}`
)

/**
 * Winston logger instance configuration.
 */
const logger = winston.createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.json(),
    format.prettyPrint()
  ),
  transports: [
    new transports.Console({
      format: format.combine(format.colorize(), logFormat),
    }),
    new transports.File({ filename: 'logs/error.log', level: 'error', format: logFormat }),
    new transports.File({ filename: 'logs/all.log', level: 'info', format: logFormat }),
  ],
})

/**
 * Log levels supported.
 */
type LogLevel = 'info' | 'warn' | 'error'

/**
 * Core logging function used by exported log methods.
 *
 * @param {LogLevel} level - The log level ('info', 'warn', or 'error').
 * @param {string} prefix - Emoji prefix for the log message.
 * @param {string} message - The main log message.
 * @param {*} [obj] - Optional additional data to log (object or string).
 */
const log = (level: LogLevel, prefix: string, message: string, obj?: any): void => {
  if (!enableLogs || (level === 'error' && !enableErrorLogs)) {
    return
  }

  const baseMessage = fixMessage(`${prefix} ${message}`)
  const finalMessage = obj ? `${baseMessage} ${typeof obj === 'string' ? obj : helper.safeStringify(obj)}` : baseMessage

  if (level === 'error') {
    if (obj instanceof Error) {
      logger.error(`${baseMessage} ${obj.message}\n${obj.stack}`)

      // Report to Sentry
      if (env.ENABLE_SENTRY) {
        // Capture the error and stack trace
        Sentry.withScope((scope) => {
          scope.setLevel('error')
          scope.setExtra('log_message', message)
          scope.setExtra('log_obj', helper.safeStringify(obj))
          Sentry.captureException(obj)
        })
      }
    } else {
      logger[level](finalMessage)

      if (env.ENABLE_SENTRY) {
        if (obj) {
          // If obj is not an Error but some extra data, add it as extra info
          Sentry.withScope(scope => {
            scope.setExtra('extra_data', helper.safeStringify(obj))
            Sentry.captureMessage(message)
          })
        } else {
          // No extra data; just capture the message
          Sentry.captureMessage(message)
        }
      }
    }
  } else {
    logger[level](finalMessage)
  }
}

/**
 * Logs an informational message.
 *
 * @param {string} message - The message to log.
 * @param {*} [obj] - Optional additional data.
 */
export const info = (message: string, obj?: any): void => log('info', prefixMap.info, message, obj)

/**
 * Logs a warning message.
 *
 * @param {string} message - The message to log.
 * @param {*} [obj] - Optional additional data.
 */
export const warn = (message: string, obj?: any): void => log('warn', prefixMap.warn, message, obj)

/**
 * Logs a success message (treated as info level).
 *
 * @param {string} message - The message to log.
 * @param {*} [obj] - Optional additional data.
 */
export const success = (message: string, obj?: any): void => log('info', prefixMap.success, message, obj)

/**
 * Logs an error message.
 *
 * @param {string} message - The message to log.
 * @param {unknown} [obj] - Optional additional error or data.
 */
export const error = (message: string, obj?: unknown): void => log('error', prefixMap.error, message, obj)

/**
 * Enables all logging.
 */
export const enableLogging = (): void => {
  enableLogs = true
}

/**
 * Disables all logging.
 */
export const disableLogging = (): void => {
  enableLogs = false
}

/**
 * Enables error logging.
 */
export const enableErrorLogging = (): void => {
  enableErrorLogs = true
}

/**
 * Disables error logging.
 */
export const disableErrorLogging = (): void => {
  enableErrorLogs = false
}
