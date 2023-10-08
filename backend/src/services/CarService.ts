import axios from 'axios'
import * as bookcarsTypes from 'bookcars-types'
import Env from '../config/env.config'
import * as UserService from './UserService'

/**
 * Create a Car.
 *
 * @param {bookcarsTypes.CreateCarPayload} data
 * @returns {Promise<bookcarsTypes.Car>}
 */
export const create = (data: bookcarsTypes.CreateCarPayload): Promise<bookcarsTypes.Car> =>
  axios
    .post(
      `${Env.API_HOST}/api/create-car`,
      data,
      { withCredentials: true }
    )
    .then((res) => res.data)

/**
 * Update a Car.
 *
 * @param {bookcarsTypes.UpdateCarPayload} data
 * @returns {Promise<number>}
 */
export const update = (data: bookcarsTypes.UpdateCarPayload): Promise<number> =>
  axios
    .put(
      `${Env.API_HOST}/api/update-car`,
      data,
      { withCredentials: true }
    )
    .then((res) => res.status)

/**
 * Check if a Car is related to a booking.
 *
 * @param {string} id
 * @returns {Promise<number>}
 */
export const check = (id: string): Promise<number> =>
  axios
    .get(
      `${Env.API_HOST}/api/check-car/${encodeURIComponent(id)}`,
      { withCredentials: true }
    )
    .then((res) => res.status)

/**
 * Delete a Car.
 *
 * @param {string} id
 * @returns {Promise<number>}
 */
export const deleteCar = (id: string): Promise<number> =>
  axios
    .delete(
      `${Env.API_HOST}/api/delete-car/${encodeURIComponent(id)}`,
      { withCredentials: true }
    )
    .then((res) => res.status)

/**
 * Create a temporary Car image.
 *
 * @param {Blob} file
 * @returns {Promise<string>}
 */
export const createImage = (file: Blob): Promise<string> => {
  const formData = new FormData()
  formData.append('image', file)

  return axios
    .post(
      `${Env.API_HOST}/api/create-car-image`,
      formData,
      {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' }
      },
    )
    .then((res) => res.data)
}

/**
 * Update a Car image.
 *
 * @param {string} id
 * @param {Blob} file
 * @returns {Promise<number>}
 */
export const updateImage = (id: string, file: Blob): Promise<number> => {
  const formData = new FormData()
  formData.append('image', file)

  return axios
    .post(
      `${Env.API_HOST}/api/update-car-image/${encodeURIComponent(id)}`,
      formData,
      {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' }
      },
    )
    .then((res) => res.status)
}

/**
 * Delete a Car image.
 *
 * @param {string} id
 * @returns {Promise<number>}
 */
export const deleteImage = (id: string): Promise<number> =>
  axios
    .post(
      `${Env.API_HOST}/api/delete-car-image/${encodeURIComponent(id)}`,
      null,
      { withCredentials: true }
    )
    .then((res) => res.status)

/**
 * Delete a temporary Car image.
 *
 * @param {string} image
 * @returns {Promise<number>}
 */
export const deleteTempImage = (image: string): Promise<number> =>
  axios
    .post(
      `${Env.API_HOST}/api/delete-temp-car-image/${encodeURIComponent(image)}`,
      null,
      { withCredentials: true }
    )
    .then((res) => res.status)

/**
 * Get a Car by ID.
 *
 * @param {string} id
 * @returns {Promise<bookcarsTypes.Car>}
 */
export const getCar = (id: string): Promise<bookcarsTypes.Car> =>
  axios
    .get(
      `${Env.API_HOST}/api/car/${encodeURIComponent(id)}/${UserService.getLanguage()}`,
      { withCredentials: true }
    )
    .then((res) => res.data)

/**
 * Get Cars.
 *
 * @param {string} keyword
 * @param {bookcarsTypes.GetCarsPayload} data
 * @param {number} page
 * @param {number} size
 * @returns {Promise<bookcarsTypes.Result<bookcarsTypes.Car>>}
 */
export const getCars = (keyword: string, data: bookcarsTypes.GetCarsPayload, page: number, size: number): Promise<bookcarsTypes.Result<bookcarsTypes.Car>> =>
  axios
    .post(
      `${Env.API_HOST}/api/cars/${page}/${size}/?s=${encodeURIComponent(keyword)}`,
      data,
      { withCredentials: true }
    )
    .then((res) => res.data)

/**
 * Get Cars by supplier and location.
 *
 * @param {string} keyword
 * @param {bookcarsTypes.GetBookingCarsPayload} data
 * @param {number} page
 * @param {number} size
 * @returns {Promise<bookcarsTypes.Car[]>}
 */
export const getBookingCars = (keyword: string, data: bookcarsTypes.GetBookingCarsPayload, page: number, size: number): Promise<bookcarsTypes.Car[]> =>
  axios
    .post(
      `${Env.API_HOST}/api/booking-cars/${page}/${size}/?s=${encodeURIComponent(keyword)}`,
      data,
      { withCredentials: true }
    )
    .then((res) => res.data)
