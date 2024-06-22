import * as bookcarsTypes from ':bookcars-types'
import axiosInstance from './axiosInstance'

/**
 * Validate Supplier name.
 *
 * @param {bookcarsTypes.ValidateSupplierPayload} data
 * @returns {Promise<number>}
 */
export const validate = (data: bookcarsTypes.ValidateSupplierPayload): Promise<number> =>
  axiosInstance
    .post(
      '/api/validate-supplier',
      data,
      { withCredentials: true }
    )
    .then((res) => res.status)

/**
 * Update a Supplier.
 *
 * @param {bookcarsTypes.UpdateSupplierPayload} data
 * @returns {Promise<number>}
 */
export const update = (data: bookcarsTypes.UpdateSupplierPayload): Promise<number> =>
  axiosInstance
    .put(
      '/api/update-supplier',
      data,
      { withCredentials: true }
    )
    .then((res) => res.status)

/**
 * Delete a Supplier.
 *
 * @param {string} id
 * @returns {Promise<number>}
 */
export const deleteSupplier = (id: string): Promise<number> =>
  axiosInstance
    .delete(
      `/api/delete-supplier/${encodeURIComponent(id)}`,
      { withCredentials: true }
    )
    .then((res) => res.status)

/**
 * Get a Supplier by ID.
 *
 * @param {string} id
 * @returns {Promise<bookcarsTypes.User>}
 */
export const getSupplier = (id: string): Promise<bookcarsTypes.User> =>
  axiosInstance
    .get(
      `/api/supplier/${encodeURIComponent(id)}`,
      { withCredentials: true }
    )
    .then((res) => res.data)

/**
 * Get Suppliers.
 *
 * @param {string} keyword
 * @param {number} page
 * @param {number} size
 * @returns {Promise<bookcarsTypes.Result<bookcarsTypes.User>>}
 */
export const getSuppliers = (keyword: string, page: number, size: number): Promise<bookcarsTypes.Result<bookcarsTypes.User>> =>
  axiosInstance
    .get(
      `/api/suppliers/${page}/${size}/?s=${encodeURIComponent(keyword)}`,
      { withCredentials: true }
    )
    .then((res) => res.data)

/**
 * Get all Suppliers.
 *
 * @returns {Promise<bookcarsTypes.User[]>}
 */
export const getAllSuppliers = (): Promise<bookcarsTypes.User[]> =>
  axiosInstance
    .get(
      '/api/all-suppliers',
      { withCredentials: true }
    )
    .then((res) => res.data)

/**
* Get backend suppliers.
*
* @param {bookcarsTypes.GetCarsPayload} data
* @returns {Promise<bookcarsTypes.User[]>}
*/
export const getBackendSuppliers = (data: bookcarsTypes.GetCarsPayload): Promise<bookcarsTypes.User[]> =>
  axiosInstance
    .post(
      '/api/backend-suppliers',
      data,
      { withCredentials: true }
    ).then((res) => res.data)
