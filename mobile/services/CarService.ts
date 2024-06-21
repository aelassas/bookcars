import axiosInstance from './axiosInstance'
import * as UserService from './UserService'
import * as bookcarsTypes from ':bookcars-types'

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
  axiosInstance
    .post(
      `/api/frontend-cars/${page}/${size}`,
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
  return axiosInstance
    .get(
      `/api/car/${encodeURIComponent(id)}/${language}`
    )
    .then((res) => res.data)
}
