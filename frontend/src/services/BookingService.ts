import * as bookcarsTypes from ':bookcars-types'
import axiosInstance from './axiosInstance'
import * as UserService from './UserService'

/**
 * Complete the checkout process and create the Booking.
 *
 * @param {bookcarsTypes.CheckoutPayload} data
 * @returns {Promise<number>}
 */
export const checkout = (data: bookcarsTypes.CheckoutPayload): Promise<{ status: number, bookingId: string }> =>
  axiosInstance
    .post(
      '/api/checkout',
      data,
      { withCredentials: true }
    )
    .then((res) => ({ status: res.status, bookingId: res.data.bookingId }))

export interface TripDraftResult {
  provider: string
  degraded: boolean
  draftOnly: true
  requiresHumanConfirmation: true
  availabilityChecked: false
  priceQuoted: false
  bookingCreated: false
  terrainAdvisory: string | null
  extractedData: bookcarsTypes.BookingIntakeData
}

/** Parse a customer trip description into a reviewable draft. This never books or quotes. */
export const parseTripDraft = (request: string): Promise<TripDraftResult> =>
  axiosInstance.post('/api/ai/parse-trip', { request }).then((res) => res.data)

export interface PakistanQuote {
  currency: 'PKR'
  days: number
  rentalMode: bookcarsTypes.RentalMode
  tripScope: bookcarsTypes.TripScope
  baseRentPKR: number
  driverAllowancePKR: number
  outOfCitySurchargePKR: number
  securityDepositPKR: number
  totalPayablePKR: number
  terrainCapability: bookcarsTypes.TerrainCapability
}

export const calculatePakistanQuote = (input: {
  carId: string
  from: Date
  to: Date
  rentalMode: bookcarsTypes.RentalMode
  tripScope: bookcarsTypes.TripScope
  options?: bookcarsTypes.CarOptions
}): Promise<PakistanQuote> => axiosInstance.post('/api/bookings/calculate-quote', input).then((res) => res.data)

/**
 * Update a Booking.
 *
 * @param {bookcarsTypes.UpsertBookingPayload} data
 * @returns {Promise<number>}
 */
export const update = (data: bookcarsTypes.UpsertBookingPayload): Promise<number> =>
  axiosInstance
    .put(
      '/api/update-booking',
      data,
      { withCredentials: true }
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
  axiosInstance
    .post(
      `/api/bookings/${page}/${size}/${UserService.getLanguage()}`,
      payload,
      { withCredentials: true }
    )
    .then((res) => res.data)

/**
 * Get a Booking by ID.
 *
 * @param {string} id
 * @returns {Promise<bookcarsTypes.Booking>}
 */
export const getBooking = (id: string, sessionId?: string): Promise<bookcarsTypes.Booking> =>
  axiosInstance
    .get(
      `/api/booking/${encodeURIComponent(id)}/${UserService.getLanguage()}${sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : ''}`,
      { withCredentials: true }
    )
    .then((res) => res.data)

/**
 * Cancel a Booking.
 *
 * @param {string} id
 * @returns {Promise<number>}
 */
export const cancel = (id: string): Promise<number> =>
  axiosInstance
    .post(
      `/api/cancel-booking/${encodeURIComponent(id)}`,
      null,
      { withCredentials: true }
    ).then((res) => res.status)

/** Record a non-charging FYP payment simulation outcome for the signed-in customer. */
export const simulateFypPayment = (
  bookingId: string,
  outcome: bookcarsTypes.DemoPaymentOutcome,
  idempotencyKey: string,
  paymentMethod: bookcarsTypes.RentalPaymentMethod = bookcarsTypes.RentalPaymentMethod.CardDemo,
): Promise<bookcarsTypes.DemoPaymentAttempt & { simulated: boolean, charged: boolean, bookingStatus: string }> =>
  axiosInstance
    .post(
      `/api/fyp-demo-payment/${encodeURIComponent(bookingId)}`,
      { outcome, idempotencyKey, paymentMethod },
      { withCredentials: true },
    )
    .then((res) => res.data)

export const confirmDemoPayment = (
  bookingId: string,
  paymentMethod: bookcarsTypes.RentalPaymentMethod,
  mobileNumber: string,
  idempotencyKey: string,
): Promise<{ simulated: boolean, charged: false, reference: string, paymentState: string, paymentStatus: string, amount: number, currency: string }> =>
  axiosInstance.post('/api/payments/demo-confirm', { bookingId, paymentMethod, mobileNumber, idempotencyKey }, { withCredentials: true }).then((res) => res.data)

/**
 * Delete temporary Booking created from checkout session.
 *
 * @param {string} bookingId
 * @param {string} sessionId
 * @returns {Promise<number>}
 */
export const deleteTempBooking = (bookingId: string, sessionId: string): Promise<number> =>
  axiosInstance
    .delete(
      `/api/delete-temp-booking/${bookingId}/${sessionId}`,
    ).then((res) => res.status)

/**
* Get a Booking by sessionId.
*
* @param {string} id
* @returns {Promise<ohmjetTypes.Booking>}
*/
export const getBookingId = (sessionId: string): Promise<string> =>
  axiosInstance
    .get(
      `/api/booking-id/${encodeURIComponent(sessionId)}`,
      { withCredentials: true }
    )
    .then((res) => res.data)
