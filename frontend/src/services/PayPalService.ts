import axiosInstance from './axiosInstance'
import * as UserService from '@/services/UserService'

/**
 * Returns PayPal locale.
 *
 * @returns {("fr_FR" | "es_ES" | "en_US")}
 */
export const getLocale = () => {
  const lang = UserService.getLanguage()

  if (lang === 'fr') {
    return 'fr_FR'
  }

  if (lang === 'es') {
    return 'es_ES'
  }

  // default is en_US
  return 'en_US'
}

/**
 * Create PayPal order.
 *
 * @param {string} sessionId
 * @returns {Promise<number>}
 */
export const createOrder = (bookingId: string, amount: number, currency: string, name: string): Promise<string> =>
  axiosInstance
    .post(
      '/api/create-paypal-order/',
      {
        bookingId,
        amount,
        currency,
        name,
      }
    )
    .then((res) => res.data)

/**
 * Check PayPal order.
 *
 * @param {string} sessionId
 * @returns {Promise<number>}
 */
export const checkOrder = (bookingId: string, orderId: string): Promise<number> =>
  axiosInstance
    .post(
      `/api/check-paypal-order/${bookingId}/${orderId}`,
      null
    )
    .then((res) => res.status)
