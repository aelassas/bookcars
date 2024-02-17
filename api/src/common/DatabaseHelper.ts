import mongoose, { ConnectOptions } from 'mongoose'
import * as env from '../config/env.config'

/**
 * Connect to database.
 *
 * @export
 * @async
 * @param {boolean} debug
 * @returns {Promise<boolean>}
 */
export async function Connect(debug: boolean): Promise<boolean> {
    let options: ConnectOptions = {}
    if (env.DB_SSL) {
        options = {
            tls: true,
            tlsCertificateKeyFile: env.DB_SSL_CERT,
            tlsCAFile: env.DB_SSL_CA,
        }
    }

    mongoose.set('debug', debug)
    mongoose.Promise = globalThis.Promise
    try {
        await mongoose.connect(env.DB_URI, options)
        console.log('Database is connected')
        return true
    } catch (err) {
        console.error('Cannot connect to the database:', err)
        return false
    }
}

/**
 * Close database connection.
 *
 * @export
 * @async
 * @param {boolean} force
 * @returns {*}
 */
export async function Close(force: boolean): Promise<void> {
    await mongoose.connection.close(force)
}
