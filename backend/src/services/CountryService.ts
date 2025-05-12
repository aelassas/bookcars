import * as bookcarsTypes from ':bookcars-types'
import axiosInstance from './axiosInstance'
import * as UserService from './UserService'

/**
 * Validate a Country name.
 *
 * @param {bookcarsTypes.ValidateCountryPayload} data
 * @returns {Promise<number>}
 */
export const validate = (data: bookcarsTypes.ValidateCountryPayload): Promise<number> =>
  axiosInstance
    .post(
      '/api/validate-country',
      data,
      { withCredentials: true }
    )
    .then((res) => res.status)

/**
 * Create a Country.
 *
 * @param {bookcarsTypes.CountryName[]} data
 * @returns {Promise<number>}
 */
export const create = (data: bookcarsTypes.UpsertCountryPayload): Promise<number> =>
  axiosInstance
    .post(
      '/api/create-country',
      data,
      { withCredentials: true }
    )
    .then((res) => res.status)

/**
 * Update a Country.
 *
 * @param {string} id
 * @param {bookcarsTypes.CountryName[]} data
 * @returns {Promise<number>}
 */
export const update = (id: string, data: bookcarsTypes.CountryName[]): Promise<number> =>
  axiosInstance
    .put(
      `/api/update-country/${id}`,
      data,
      { withCredentials: true }
    )
    .then((res) => res.status)

/**
 * Delete a Country.
 *
 * @param {string} id
 * @returns {Promise<number>}
 */
export const deleteCountry = (id: string): Promise<number> =>
  axiosInstance
    .delete(
      `/api/delete-country/${encodeURIComponent(id)}`,
      { withCredentials: true }
    )
    .then((res) => res.status)

/**
 * Get a Country by ID.
 *
 * @param {string} id
 * @returns {Promise<bookcarsTypes.Country>}
 */
export const getCountry = (id: string): Promise<bookcarsTypes.Country> =>
  axiosInstance
    .get(
      `/api/country/${encodeURIComponent(id)}/${UserService.getLanguage()}`,
      { withCredentials: true }
    )
    .then((res) => res.data)

/**
 * Get Countries.
 *
 * @param {string} keyword
 * @param {number} page
 * @param {number} size
 * @returns {Promise<bookcarsTypes.Result<bookcarsTypes.Country>>}
 */
export const getCountries = (keyword: string, page: number, size: number): Promise<bookcarsTypes.Result<bookcarsTypes.Country>> =>
  axiosInstance
    .get(
      `/api/countries/${page}/${size}/${UserService.getLanguage()}/?s=${encodeURIComponent(keyword)}`,
      { withCredentials: true }
    )
    .then((res) => res.data)

/**
 * Check if a Country is related to a Car.
 *
 * @param {string} id
 * @returns {Promise<number>}
 */
export const check = (id: string): Promise<number> =>
  axiosInstance
    .get(
      `/api/check-country/${encodeURIComponent(id)}`,
      { withCredentials: true }
    )
    .then((res) => res.status)
