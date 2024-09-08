import { AxiosInstance } from 'axios'
import axiosRetry from 'axios-retry'
import * as env from '@/config/env.config'

/**
 * Initialize axios-retry.
 *
 * @param {AxiosInstance} axiosInstance
 */
export const init = (axiosInstance: AxiosInstance) => {
  axiosRetry(axiosInstance, {
    retries: env.AXIOS_RETRIES, // number of retries
    retryDelay: (retryCount) => {
      console.log(`retry attempt: ${retryCount}`)
      return retryCount * env.AXIOS_RETRIES_INTERVAL // time interval between retries
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
