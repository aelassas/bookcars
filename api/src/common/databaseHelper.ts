import mongoose, { ConnectOptions } from 'mongoose'
import * as env from '../config/env.config'
import * as logger from './logger'

/**
 * Connect to database.
 *
 * @export
 * @async
 * @param {string} uri
 * @param {boolean} ssl
 * @param {boolean} debug
 * @returns {Promise<boolean>}
 */
export const Connect = async (uri: string, ssl: boolean, debug: boolean): Promise<boolean> => {
    let options: ConnectOptions = {}

    if (ssl) {
        options = {
            tls: true,
            tlsCertificateKeyFile: env.DB_SSL_CERT,
            tlsCAFile: env.DB_SSL_CA,
        }
    }

    mongoose.set('debug', debug)
    mongoose.Promise = globalThis.Promise

    try {
        await mongoose.connect(uri, options)
        logger.info('Database is connected')
        return true
    } catch (err) {
        logger.error('Cannot connect to the database:', err)
        return false
    }
}

/**
 * Close database connection.
 *
 * @export
 * @async
 * @param {boolean} force
 * @returns {Promise<void>}
 */
export const Close = async (force: boolean = false): Promise<void> => {
    await mongoose.connection.close(force)
}
