import Env from '../config/env.config'
import axiosRetry from 'axios-retry'

export const init = (axios) => {
    axiosRetry(axios, {
        retries: Env.AXIOS_RETRIES, // number of retries
        retryDelay: (retryCount) => {
            console.log(`retry attempt: ${retryCount}`)
            return retryCount * Env.AXIOS_RETRIES_INTERVAL // time interval between retries
        },
        retryCondition: (err) => {
            // if retry condition is not specified, by default idempotent requests are retried
            if (err?.request?._response) console.log(err?.request?._response)
            return true
        }
    })
}
