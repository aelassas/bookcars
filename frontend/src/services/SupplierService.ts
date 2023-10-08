import axios from 'axios'
import * as bookcarsTypes from 'bookcars-types'
import Env from '../config/env.config'

/**
 * Get all suppliers.
 *
 * @returns {Promise<bookcarsTypes.User[]>}
 */
export const getAllSuppliers = (): Promise<bookcarsTypes.User[]> =>
  axios
    .get(
      `${Env.API_HOST}/api/all-suppliers`,
      { withCredentials: true }
)
    .then((res) => res.data)

/**
 * Get suppliers.
 *
 * @param {string} keyword
 * @param {number} page
 * @param {number} size
 * @returns {Promise<bookcarsTypes.Result<bookcarsTypes.User>>}
 */
export const getSuppliers = (keyword: string, page: number, size: number): Promise<bookcarsTypes.Result<bookcarsTypes.User>> =>
  axios
    .get(
      `${Env.API_HOST}/api/suppliers/${page}/${size}/?s=${encodeURIComponent(keyword)}`,
      { withCredentials: true }
    )
    .then((res) => res.data)
