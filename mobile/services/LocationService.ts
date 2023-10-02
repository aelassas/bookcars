import axios from 'axios'
import * as Env from '../config/env.config'
import * as UserService from './UserService'
import * as AxiosHelper from '../common/AxiosHelper'
import * as bookcarsTypes from '../miscellaneous/bookcarsTypes'

AxiosHelper.init(axios)

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
  return axios
    .get(
      `${Env.API_HOST}/api/locations/${page}/${size}/${language}/?s=${encodeURIComponent(keyword)}`
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
  return axios
    .get(
      `${Env.API_HOST}/api/location/${encodeURIComponent(id)}/${language}`
    )
    .then((res) => res.data)
}
