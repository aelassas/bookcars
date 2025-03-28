import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import axiosInstance from './axiosInstance'
import * as env from '@/config/env.config'
import * as AsyncStorage from '@/common/AsyncStorage'

/**
 * Order item name max length 250 characters
 * https://docs.stripe.com/upgrades
 *
 * @type {250}
 */
export const ORDER_NAME_MAX_LENGTH = 250

/**
 * Order item description max length 500 characters
 * https://docs.stripe.com/api/metadata
 *
 * @type {500}
 */
export const ORDER_DESCRIPTION_MAX_LENGTH = 500

/**
 * Create Payment Intent
 *
 * @param {bookcarsTypes.CreatePaymentIntentPayload} payload
 * @returns {Promise<bookcarsTypes.CreatePaymentIntentResult>}
 */
export const createPaymentIntent = (payload: bookcarsTypes.CreatePaymentPayload): Promise<bookcarsTypes.PaymentResult> =>
  axiosInstance
    .post(
      '/api/create-payment-intent',
      payload
    )
    .then((res) => res.data)

/**
* Set currency.
*
* @param {string} currency
*/
export const setCurrency = async (currency: string) => {
  if (currency && bookcarsHelper.checkCurrency(currency.toUpperCase())) {
    await AsyncStorage.storeString('bc-currency', currency.toUpperCase())
  }
}

/**
 * Get currency.
 *
 * @returns {string}
 */
export const getCurrency = async () => {
  const currency = await AsyncStorage.getString('bc-currency')
  if (currency && bookcarsHelper.checkCurrency(currency.toUpperCase())) {
    return currency.toUpperCase()
  }
  return env.BASE_CURRENCY
}

/**
 * Return currency symbol.
 *
 * @param {string} code
 * @returns {string|undefined}
 */
export const getCurrencySymbol = async () => {
  const currency = await getCurrency()
  const currencySymbol = env.CURRENCIES.find((c) => c.code === currency)?.symbol || '$'
  return currencySymbol
}

/**
 * Convert a price to a given currency.
 *
 * @async
 * @param {number} amount
 * @param {string} to
 * @returns {Promise<number>}
 */
export const convertPrice = async (amount: number) => {
  const to = await getCurrency()

  if (to !== env.BASE_CURRENCY) {
    const res = await bookcarsHelper.convertPrice(amount, env.BASE_CURRENCY, to)
    return res
  }

  return amount
}

/**
 * Check if currency is written from right to left.
 *
 * @returns {*}
 */
export const currencyRTL = async () => {
  const currencySymbol = await getCurrencySymbol()
  const isRTL = bookcarsHelper.currencyRTL(currencySymbol)
  return isRTL
}
