import axios from 'axios'
import * as Env from '../config/env.config'
import * as UserService from './UserService'
import * as AxiosHelper from '../common/AxiosHelper'
import * as bookcarsTypes from '../miscellaneous/bookcarsTypes'

AxiosHelper.init(axios)

/**
 * Get cars.
 *
 * @async
 * @param {bookcarsTypes.GetCarsPayload} data
 * @param {number} page
 * @param {number} size
 * @returns {Promise<bookcarsTypes.Result<bookcarsTypes.Car>>}
 */
export const getCars = async (data: bookcarsTypes.GetCarsPayload, page: number, size: number): Promise<bookcarsTypes.Result<bookcarsTypes.Car>> =>
  axios
    .post(
      `${Env.API_HOST}/api/frontend-cars/${page}/${size}}`,
      data
    )
    .then((res) => res.data)

/**
 * Get a Car by ID.
 *
 * @async
 * @param {string} id
 * @returns {Promise<bookcarsTypes.Car>}
 */
export const getCar = async (id: string): Promise<bookcarsTypes.Car> => {
  const language = await UserService.getLanguage()
  return axios
    .get(
      `${Env.API_HOST}/api/car/${encodeURIComponent(id)}/${language}`
    )
    .then((res) => res.data)
}
