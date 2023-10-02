import { AxiosStatic } from 'axios'
import axiosRetry from 'axios-retry'
import * as Env from '../config/env.config'

/**
 * Initialize axios-retry.
 *
 * @param {AxiosStatic} axios
 */
export const init = (axios: AxiosStatic) => {
  axiosRetry(axios, {
    retries: Env.AXIOS_RETRIES, // number of retries
    retryDelay: (retryCount) => {
      console.log(`retry attempt: ${retryCount}`)
      return retryCount * Env.AXIOS_RETRIES_INTERVAL // time interval between retries
    },
    retryCondition: (err) => {
      // if retry condition is not specified, by default idempotent requests are retried
      if (err?.request?._response) {
        console.log(err?.request?._response)
      }
      return true
    },
  })
}
