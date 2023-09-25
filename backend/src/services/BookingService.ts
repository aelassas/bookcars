import axios from 'axios'
import Env from '../config/env.config'
import * as UserService from './UserService'
import * as bookcarsTypes from 'bookcars-types'

/**
 * Create a Booking.
 *
 * @param {bookcarsTypes.UpsertBookingPayload} data
 * @returns {Promise<bookcarsTypes.Booking>}
 */
export const create = (data: bookcarsTypes.UpsertBookingPayload): Promise<bookcarsTypes.Booking> =>
  axios
    .post(
      `${Env.API_HOST}/api/create-booking`,
      data,
      { headers: UserService.authHeader() }
    )
    .then((res) => res.data)

/**
 * Update a Booking.
 *
 * @param {bookcarsTypes.UpsertBookingPayload} data
 * @returns {Promise<number>}
 */
export const update = (data: bookcarsTypes.UpsertBookingPayload): Promise<number> =>
  axios
    .put(
      `${Env.API_HOST}/api/update-booking`,
      data,
      { headers: UserService.authHeader() }
    )
    .then((res) => res.status)

/**
 * Update a Booking status.
 *
 * @param {bookcarsTypes.UpdateStatusPayload} data
 * @returns {Promise<number>}
 */
export const updateStatus = (data: bookcarsTypes.UpdateStatusPayload): Promise<number> =>
  axios
    .post(
      `${Env.API_HOST}/api/update-booking-status`,
      data,
      { headers: UserService.authHeader() }
    )
    .then((res) => res.status)

/**
 * Delete Bookings.
 *
 * @param {string[]} ids
 * @returns {Promise<number>}
 */
export const deleteBookings = (ids: string[]): Promise<number> =>
  axios
    .post(
      `${Env.API_HOST}/api/delete-bookings`,
      ids,
      { headers: UserService.authHeader() }
    )
    .then((res) => res.status)

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
 * Get Bookings.
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
