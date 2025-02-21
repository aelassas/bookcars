import axiosInstance from './axiosInstance'

/**
 * Returns Country ISO 2 code from client IP.
 *
 * @param {string} sessionId
 * @returns {Promise<number>}
 */
export const getCountryCode = (): Promise<string> =>
  axiosInstance
    .get(
      '/api/country-code',
    )
    .then((res) => res.data)
