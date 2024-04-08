import winston, { format, transports } from 'winston'

const logFormat = format.printf((info) => `${info.timestamp} ${info.level}: ${info.message}`)
const level = process.env.NODE_ENV === 'production' ? 'info' : 'debug'

const logger = winston.createLogger({
  level,
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
    new transports.File({ filename: 'logs/error.log', level: 'error', format: logFormat }),
    new transports.File({ filename: 'logs/all.log', level, format: logFormat }),
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

export const debug = (message: string, obj?: any) => {
  if (obj) {
    logger.debug(`${message} ${JSON.stringify(obj)}`)
  } else {
    logger.debug(message)
  }
}
