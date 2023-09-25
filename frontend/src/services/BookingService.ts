import axios from 'axios'
import Env from '../config/env.config'
import * as UserService from './UserService'
import * as bookcarsTypes from 'bookcars-types'

/**
 * Complete the checkout process and create the Booking.
 *
 * @param {bookcarsTypes.BookPayload} data
 * @returns {Promise<number>}
 */
export const book = (data: bookcarsTypes.BookPayload): Promise<number> =>
  axios
    .post(
      `${Env.API_HOST}/api/book`,
      data
    )
    .then((res) => res.status)

/**
 * Update a Booking.
 *
 * @param {bookcarsTypes.UpsertBookingPayload} data
 * @returns {Promise<number>}
 */
export const update = (data: bookcarsTypes.UpsertBookingPayload): Promise<number> =>
  axios
    .put(`${Env.API_HOST}/api/update-booking`,
      data,
      { headers: UserService.authHeader() }
    )
    .then((res) => res.status)

/**
 * Get bookings.
 *
 * @param {bookcarsTypes.GetBookingsPayload} payload
 * @param {number} page
 * @param {number} size
 * @returns {Promise<bookcarsTypes.Result<bookcarsTypes.Booking>>}
 */
export const getBookings = (payload: bookcarsTypes.GetBookingsPayload, page: number, size: number): Promise<bookcarsTypes.Result<bookcarsTypes.Booking>> =>
  axios
    .post(
      `${Env.API_HOST}/api/bookings/${page}/${size}/${UserService.getLanguage()}`,
      payload,
      { headers: UserService.authHeader() }
    )
    .then((res) => res.data)

/**
 * Get a Booking by ID.
 *
 * @param {string} id
 * @returns {Promise<bookcarsTypes.Booking>}
 */
export const getBooking = (id: string): Promise<bookcarsTypes.Booking> =>
  axios
    .get(
      `${Env.API_HOST}/api/booking/${encodeURIComponent(id)}/${UserService.getLanguage()}`,
      { headers: UserService.authHeader() }
    )
    .then((res) => res.data)

/**
 * Cancel a Booking.
 *
 * @param {string} id
 * @returns {Promise<number>}
 */
export const cancel = (id: string): Promise<number> =>
  axios
    .post(
      `${Env.API_HOST}/api/cancel-booking/${encodeURIComponent(id)}`,
      null,
      { headers: UserService.authHeader() }
    ).then((res) => res.status)
