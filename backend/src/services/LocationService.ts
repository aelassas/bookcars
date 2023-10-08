import axios from 'axios'
import * as bookcarsTypes from 'bookcars-types'
import Env from '../config/env.config'
import * as UserService from './UserService'

/**
 * Validate a Location name.
 *
 * @param {bookcarsTypes.ValidateLocationPayload} data
 * @returns {Promise<number>}
 */
export const validate = (data: bookcarsTypes.ValidateLocationPayload): Promise<number> =>
  axios
    .post(
`${Env.API_HOST}/api/validate-location`,
      data,
      { withCredentials: true }
    )
    .then((res) => res.status)

/**
 * Create a Location.
 *
 * @param {bookcarsTypes.LocationName[]} data
 * @returns {Promise<number>}
 */
export const create = (data: bookcarsTypes.LocationName[]): Promise<number> =>
  axios
    .post(
`${Env.API_HOST}/api/create-location`,
      data,
      { withCredentials: true }
    )
    .then((res) => res.status)

/**
 * Update a Location.
 *
 * @param {string} id
 * @param {bookcarsTypes.LocationName[]} data
 * @returns {Promise<number>}
 */
export const update = (id: string, data: bookcarsTypes.LocationName[]): Promise<number> =>
  axios
    .put(
`${Env.API_HOST}/api/update-location/${id}`,
      data,
      { withCredentials: true }
    )
    .then((res) => res.status)

/**
 * Delete a Location.
 *
 * @param {string} id
 * @returns {Promise<number>}
 */
export const deleteLocation = (id: string): Promise<number> =>
  axios
    .delete(
`${Env.API_HOST}/api/delete-location/${encodeURIComponent(id)}`,
      { withCredentials: true }
    )
    .then((res) => res.status)

/**
 * Get a Location by ID.
 *
 * @param {string} id
 * @returns {Promise<bookcarsTypes.Location>}
 */
export const getLocation = (id: string): Promise<bookcarsTypes.Location> =>
  axios
    .get(
      `${Env.API_HOST}/api/location/${encodeURIComponent(id)}/${UserService.getLanguage()}`,
      { withCredentials: true }
    )
    .then((res) => res.data)

/**
 * Get Locations.
 *
 * @param {string} keyword
 * @param {number} page
 * @param {number} size
 * @returns {Promise<bookcarsTypes.Result<bookcarsTypes.Location>>}
 */
export const getLocations = (keyword: string, page: number, size: number): Promise<bookcarsTypes.Result<bookcarsTypes.Location>> =>
  axios
    .get(
      `${Env.API_HOST}/api/locations/${page}/${size}/${UserService.getLanguage()}/?s=${encodeURIComponent(keyword)}`,
      { withCredentials: true }
    )
    .then((res) => res.data)

/**
 * Check if a Location is related to a Car.
 *
 * @param {string} id
 * @returns {Promise<number>}
 */
export const check = (id: string): Promise<number> =>
  axios
    .get(
      `${Env.API_HOST}/api/check-location/${encodeURIComponent(id)}`,
      { withCredentials: true }
    )
    .then((res) => res.status)
