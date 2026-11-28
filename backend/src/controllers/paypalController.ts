import { Request, Response } from 'express'
import i18n from '../lang/i18n'
import * as logger from '../utils/logger'
import * as bookcarsTypes from ':bookcars-types'
import * as env from '../config/env.config'
import * as helper from '../utils/helper'
import Booking from '../models/Booking'
import User from '../models/User'
import Car from '../models/Car'
import * as bookingController from './bookingController'
import * as ipinfoHelper from '../utils/ipinfoHelper'
import { BookingConflictError, saveBookingWithAvailability } from '../utils/bookingReservationHelper'

/**
 * Get the amount to charge for a booking: the booking price, the deposit,
 * or the booking price plus the deposit, depending on the payment option chosen at checkout.
 *
 * @async
 * @param {env.Booking} booking
 * @returns {Promise<number>}
 */
const getBookingPaymentAmount = async (booking: env.Booking) => {
  if (!booking.isDeposit && !booking.isPayedInFull) {
    return booking.price
  }

  const car = await Car.findById(booking.car, { deposit: 1 }).lean()
  if (!car) {
    throw new Error(`Car ${booking.car} not found`)
  }
  const supplier = await User.findById(booking.supplier, { priceChangeRate: 1 }).lean()

  return helper.getPaymentAmount(booking.price, car.deposit, supplier?.priceChangeRate || 0, booking.isDeposit, booking.isPayedInFull)
}

/**
 * Create PayPal order.
 *
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const createPayPalOrder = async (req: Request, res: Response) => {
  try {
    const paypal = await import('../payment/paypal.js')
    const { bookingId, currency, name, description }: bookcarsTypes.CreatePayPalOrderPayload = req.body

    // Payments are only accepted in the base currency
    if (typeof currency !== 'string' || currency.toUpperCase() !== env.BASE_CURRENCY.toUpperCase()) {
      const message = `Payment currency mismatch: expected ${env.BASE_CURRENCY}, got ${currency}`
      logger.error(`[paypal.createPayPalOrder] ${message}`)
      res.status(400).send(message)
      return
    }
    // 1. Retrieve the authoritative booking from database
    const booking = await Booking.findById(bookingId)
    if (!booking) {
      const msg = `Booking with id ${bookingId} not found`
      logger.info(`[paypal.createPayPalOrder] ${msg}`)
      res.status(204).send(msg)
      return
    }

    // A booking that is no longer awaiting its payment (already paid, for example)
    // must not get a new order, otherwise the customer can be charged twice
    if (booking.status !== bookcarsTypes.BookingStatus.Void) {
      const msg = `Booking ${bookingId} is not awaiting payment`
      logger.info(`[paypal.createPayPalOrder] ${msg}`)
      res.status(400).send(msg)
      return
    }

    const clientIp = ipinfoHelper.getClientIp(req)
    const countryCode = await ipinfoHelper.getCountryCode(clientIp)

    // 2. Use the amount derived server-side from the booking instead of client-supplied amount
    const amount = await getBookingPaymentAmount(booking)
    const orderId = await paypal.createOrder(bookingId, amount, env.BASE_CURRENCY, name, description, countryCode)

    res.json(orderId)
  } catch (err) {
    logger.error(`[paypal.createPayPalOrder] ${i18n.t('ERROR')}`, err)
    res.status(400).send(i18n.t('ERROR') + err)
  }
}

/**
 * Check Paypal order and update booking if the payment succeeded.
 *
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const checkPayPalOrder = async (req: Request, res: Response) => {
  let captureId: string | undefined
  try {
    const paypal = await import('../payment/paypal.js')
    const { bookingId, orderId } = req.params as { bookingId: string, orderId: string }

    //
    // 1. Retrieve Checkout Session and Booking
    //
    const booking = await Booking.findOne({ _id: bookingId, expireAt: { $ne: null } })
    if (!booking) {
      const msg = `Booking with id ${bookingId} not found`
      logger.info(`[paypal.checkPayPalOrder] ${msg}`)
      res.status(204).send(msg)
      return
    }

    let order
    try {
      order = await paypal.getOrder(orderId)
    } catch (err) {
      logger.error(`[paypal.checkPayPalOrder] retrieve paypal order error: ${orderId}`, err)
    }

    if (!order) {
      const msg = `Order ${orderId} not found`
      logger.info(`[paypal.checkPayPalOrder] ${msg}`)
      res.status(204).send(msg)
      return
    }

    //
    // 2. Reconcile PayPal purchase unit data against database booking
    //
    const purchaseUnit = order.purchase_units?.[0]
    const paidAmount = Number(Number.parseFloat(purchaseUnit?.amount?.value || '0').toFixed(2))
    const paidCurrency = purchaseUnit?.amount?.currency_code
    const invoiceId = purchaseUnit?.invoice_id

    // Check for invoice / booking reference mismatch or amount discrepancy
    if (invoiceId && invoiceId !== bookingId) {
      logger.error(`[paypal.checkPayPalOrder] Booking ID mismatch. Expected ${bookingId}, got ${invoiceId}`)
      res.status(400).send('Booking ID mismatch')
      return
    }

    // Currency Reconciliation
    const expectedCurrency = env.BASE_CURRENCY
    if (!paidCurrency || paidCurrency.toUpperCase() !== expectedCurrency.toUpperCase()) {
      logger.error(`[paypal.checkPayPalOrder] Currency mismatch. Expected ${expectedCurrency}, got ${paidCurrency}`)
      res.status(400).send('Payment currency mismatch')
      return
    }

    // Round the amount to charge to 2 decimal places for comparison
    const expectedPrice = Number.parseFloat((await getBookingPaymentAmount(booking)).toFixed(2))

    if (paidAmount !== expectedPrice) {
      logger.error(`[paypal.checkPayPalOrder] Price mismatch. Expected ${expectedPrice}, got ${paidAmount}`)
      res.status(400).send('Payment amount mismatch')
      return
    }

    //
    // 3. Update Booking if the payment succeeded
    // (Set BookingStatus to Paid and remove expireAt TTL index)
    //
    if (order.status === 'COMPLETED') {
      captureId = purchaseUnit?.payments?.captures?.[0]?.id
      booking.paypalOrderId = orderId
      booking.expireAt = undefined

      let status = bookcarsTypes.BookingStatus.Paid
      if (booking.isDeposit) {
        status = bookcarsTypes.BookingStatus.Deposit
      } else if (booking.isPayedInFull) {
        status = bookcarsTypes.BookingStatus.PaidInFull
      }
      booking.status = status

      const saved = await saveBookingWithAvailability(booking, {
        expectedStatus: bookcarsTypes.BookingStatus.Void,
        requireExpireAt: true,
      })
      if (!saved) {
        res.sendStatus(200)
        return
      }

      const car = await Car.findById(booking.car)
      if (!car) {
        throw new Error(`Car ${booking.car} not found`)
      }
      car.trips += 1
      await car.save()

      const supplier = await User.findById(booking.supplier)
      if (!supplier) {
        throw new Error(`Supplier ${booking.supplier} not found`)
      }

      // Send confirmation email to customer
      const user = await User.findById(booking.driver)
      if (!user) {
        throw new Error(`Driver ${booking.driver} not found`)
      }

      user.expireAt = undefined
      await user.save()

      // The order is paid and the booking is saved as paid: a failing email or
      // notification is logged and does not turn the paid order into an error
      try {
        if (!(await bookingController.confirm(user, supplier, booking, false))) {
          res.sendStatus(400)
          return
        }

        // Notify supplier
        i18n.locale = supplier.language
        let message = i18n.t('BOOKING_PAID_NOTIFICATION')
        await bookingController.notify(user, booking._id.toString(), supplier, message)

        // Notify admin
        const admin = !!env.ADMIN_EMAIL && (await User.findOne({ email: env.ADMIN_EMAIL, type: bookcarsTypes.UserType.Admin }))
        if (admin) {
          i18n.locale = admin.language
          message = i18n.t('BOOKING_PAID_NOTIFICATION')
          await bookingController.notify(user, booking._id.toString(), admin, message)
        }
      } catch (notifyErr) {
        logger.error(`[paypal.checkPayPalOrder] Booking ${booking._id.toString()} paid, but sending emails or notifications failed`, notifyErr)
      }

      res.sendStatus(200)
      return
    }

    //
    // 4. Delete Booking if the payment didn't succeed
    //
    await booking.deleteOne()
    res.status(400).send(order.status)
  } catch (err) {
    if (err instanceof BookingConflictError) {
      if (!captureId) {
        logger.error('[paypal.checkPayPalOrder] Completed order has no capture id', req.params.orderId)
        res.status(500).send('Booking unavailable. Payment refund requires support review.')
        return
      }
      try {
        const paypal = await import('../payment/paypal.js')
        await paypal.refundCapture(captureId, `bc-refund-${req.params.bookingId}`)
        await Booking.deleteOne({ _id: req.params.bookingId, status: bookcarsTypes.BookingStatus.Void })
      } catch (refundError) {
        logger.error('[paypal.checkPayPalOrder] Failed to refund payment after booking conflict', refundError)
        res.status(500).send('Booking unavailable. Payment refund requires support review.')
        return
      }
      res.status(409).send(err.message)
      return
    }
    logger.error(`[paypal.checkPayPalOrder] ${i18n.t('ERROR')}`, err)
    res.status(400).send(i18n.t('ERROR') + err)
  }
}
