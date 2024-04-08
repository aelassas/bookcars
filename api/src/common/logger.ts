import winston, { format, transports } from 'winston'

const production = process.env.NODE_ENV === 'production'
const logFormat = format.printf((info) => `${info.timestamp} ${info.level}: ${info.message}`)

const logger = winston.createLogger({
  level: production ? 'info' : 'debug',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.json(),
    format.prettyPrint(),
  ),
  transports: [
    new transports.Console({
      format: format.combine(
        format.colorize(),
        logFormat,
      ),
    }),
    //
    // - Write all logs with importance level of `error` or less to `logs/error.log`
    // - Write all logs with importance level of `info` or less to `logs/all.log`
    //
    new transports.File({ filename: 'logs/error.log', level: 'error', format: logFormat }),
    new transports.File({ filename: 'logs/all.log', format: logFormat }),
  ],
})

export const info = (message: string, obj?: any) => {
  if (obj) {
    logger.info(`${message} ${JSON.stringify(obj)}`)
  } else {
    logger.info(message)
  }
}

export const error = (message: string, err?: unknown) => {
  if (err instanceof Error) {
    logger.error(`${message} ${err.message} ${err.stack}`)
  } else {
    logger.error(message)
  }
}
