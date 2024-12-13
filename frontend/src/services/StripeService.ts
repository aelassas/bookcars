import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import axiosInstance from './axiosInstance'
import env from '@/config/env.config'

/**
 * Create Checkout Session.
 *
 * @param {bookcarsTypes.CreatePaymentPayload} payload
 * @returns {Promise<bookcarsTypes.PaymentResult>}
 */
export const createCheckoutSession = (payload: bookcarsTypes.CreatePaymentPayload): Promise<bookcarsTypes.PaymentResult> =>
  axiosInstance
    .post(
      '/api/create-checkout-session',
      payload
    )
    .then((res) => res.data)

/**
 * Check Checkout Session.
 *
 * @param {string} sessionId
 * @returns {Promise<number>}
 */
export const checkCheckoutSession = (sessionId: string): Promise<number> =>
  axiosInstance
    .post(
      `/api/check-checkout-session/${sessionId}`,
      null
    )
    .then((res) => res.status)

/**
 * Create Payment Intent.
 *
 * @param {bookcarsTypes.CreatePaymentPayload} payload
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
export const setCurrency = (currency: string) => {
  if (currency && bookcarsHelper.checkCurrency(currency.toUpperCase())) {
    localStorage.setItem('bc-fe-currency', currency.toUpperCase())
  }
}

/**
 * Get currency.
 *
 * @returns {string}
 */
export const getCurrency = () => {
  const currency = localStorage.getItem('bc-fe-currency')
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
export const getCurrencySymbol = () => env.CURRENCIES.find((c) => c.code === getCurrency())?.symbol || '$'

/**
 * Convert a price to a given currency.
 *
 * @async
 * @param {number} amount
 * @param {string} to
 * @returns {Promise<number>}
 */
export const convertPrice = async (amount: number) => {
  const to = getCurrency()

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
export const currencyRTL = () => {
  const currencySymbol = getCurrencySymbol()
  const isRTL = bookcarsHelper.currencyRTL(currencySymbol)
  return isRTL
}
