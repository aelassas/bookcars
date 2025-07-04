import * as bookcarsTypes from ':bookcars-types'
import axiosInstance from './axiosInstance'

/**
 * Get Settings.
 *
 * @param {bookcarsTypes.CountryName[]} data
 * @returns {Promise<number>}
 */
export const getSettings = (): Promise<bookcarsTypes.Setting | null> =>
  axiosInstance
    .get(
      '/api/settings',
    )
    .then((res) => res.data)
