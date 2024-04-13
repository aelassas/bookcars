import axiosInstance from './axiosInstance'
import * as bookcarsTypes from ':bookcars-types'

/**
 * Get all suppliers.
 *
 * @returns {Promise<bookcarsTypes.User[]>}
 */
export const getAllSuppliers = (): Promise<bookcarsTypes.User[]> =>
  axiosInstance
    .get(
      '/api/all-suppliers'
    )
    .then((res) => res.data)
