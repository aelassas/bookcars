import winston, { format, transports } from 'winston'

const logFormat = format.printf((info) => `${info.timestamp} ${info.level}: ${info.message}`)

const logger = winston.createLogger({
  level: 'info',
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
    new transports.File({ filename: 'logs/all.log', level: 'info', format: logFormat }),
  ],
})

export const info = (message: string, obj?: any) => {
  if (obj) {
    logger.info(`${message} ${JSON.stringify(obj)}`)
  } else {
    logger.info(message)
  }
}

export const error = (message: string, obj?: unknown) => {
  if (obj instanceof Error) {
    logger.error(`${message} ${obj.message}`) // ${err.stack}
  } else if (obj) {
    logger.error(`${message} ${JSON.stringify(obj)}`)
  } else {
    logger.error(message)
  }
}
