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

/**
 * Update Settings.
 *
 * @param {bookcarsTypes.ValidateCountryPayload} data
 * @returns {Promise<number>}
 */
export const updateSettings = (data: bookcarsTypes.UpdateSettingsPayload): Promise<bookcarsTypes.Response<bookcarsTypes.Setting>> =>
  axiosInstance
    .put(
      '/api/update-settings',
      data,
      { withCredentials: true }
    )
    .then((res) => ({ status: res.status, data: res.data }))
