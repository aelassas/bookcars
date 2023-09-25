import axios from 'axios'
import Env from '../config/env.config'
import * as UserService from './UserService'
import * as bookcarsTypes from 'bookcars-types'

/**
 * Get all suppliers.
 *
 * @returns {Promise<bookcarsTypes.User[]>}
 */
export const getAllSuppliers = (): Promise<bookcarsTypes.User[]> =>
  axios
    .get(
      `${Env.API_HOST}/api/all-suppliers`,
      { headers: UserService.authHeader() })
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
      { headers: UserService.authHeader() }
    )
    .then((res) => res.data)
