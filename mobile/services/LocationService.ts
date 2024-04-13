import axiosInstance from './axiosInstance'
import * as UserService from './UserService'
import * as bookcarsTypes from ':bookcars-types'

/**
 * Get locations.
 *
 * @async
 * @param {string} keyword
 * @param {number} page
 * @param {number} size
 * @returns {Promise<bookcarsTypes.Result<bookcarsTypes.Location>>}
 */
export const getLocations = async (keyword: string, page: number, size: number): Promise<bookcarsTypes.Result<bookcarsTypes.Location>> => {
  const language = await UserService.getLanguage()
  return axiosInstance
    .get(
      `/api/locations/${page}/${size}/${language}/?s=${encodeURIComponent(keyword)}`
    )
    .then((res) => res.data)
}

/**
 * Get a Location by ID.
 *
 * @async
 * @param {string} id
 * @returns {Promise<bookcarsTypes.Location>}
 */
export const getLocation = async (id: string): Promise<bookcarsTypes.Location> => {
  const language = await UserService.getLanguage()
  return axiosInstance
    .get(
      `/api/location/${encodeURIComponent(id)}/${language}`
    )
    .then((res) => res.data)
}
