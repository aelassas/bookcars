import * as bookcarsTypes from ':bookcars-types'
import axiosInstance from './axiosInstance'

/**
 * Upsert BankDetails.
 *
 * @param {bookcarsTypes.ValidateCountryPayload} data
 * @returns {Promise<number>}
 */
export const upsertBankDetails = (data: bookcarsTypes.UpsertBankDetailsPayload): Promise<bookcarsTypes.Response<bookcarsTypes.BankDetails>> =>
  axiosInstance
    .post(
      '/api/upsert-bank-details',
      data,
      { withCredentials: true }
    )
    .then((res) => ({ status: res.status, data: res.data }))

/**
 * Get BankDetails.
 *
 * @param {bookcarsTypes.CountryName[]} data
 * @returns {Promise<number>}
 */
export const getBankDetails = (): Promise<bookcarsTypes.BankDetails | null> =>
  axiosInstance
    .get(
      '/api/bank-details',
      { withCredentials: true }
    )
    .then((res) => res.data)
