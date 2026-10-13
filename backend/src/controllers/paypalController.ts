import { Request, Response } from 'express'
import i18n from '../lang/i18n'
import * as logger from '../utils/logger'
import * as bookcarsTypes from ':bookcars-types'
import * as env from '../config/env.config'
import Booking from '../models/Booking'
import User from '../models/User'
import Car from '../models/Car'
import * as bookingController from './bookingController'
import * as ipinfoHelper from '../utils/ipinfoHelper'
import { BookingConflictError, saveBookingWithAvailability } from '../utils/bookingReservationHelper'

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

    // 1. Retrieve the authoritative booking from database
    const booking = await Booking.findById(bookingId)
    if (!booking) {
      const msg = `Booking with id ${bookingId} not found`
      logger.info(`[paypal.createPayPalOrder] ${msg}`)
      res.status(204).send(msg)
      return
    }

    const clientIp = ipinfoHelper.getClientIp(req)
    const countryCode = await ipinfoHelper.getCountryCode(clientIp)

    // 2. Use booking.price derived server-side instead of client-supplied amount
    const orderId = await paypal.createOrder(bookingId, booking.price, currency, name, description, countryCode)

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
    const { bookingId, orderId } = req.params

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
    const paidAmount = Number.parseFloat(purchaseUnit?.amount?.value || '0')
    const invoiceId = purchaseUnit?.invoice_id

    // Check for invoice / booking reference mismatch or amount discrepancy
    if (invoiceId && invoiceId !== bookingId) {
      logger.error(`[paypal.checkPayPalOrder] Booking ID mismatch. Expected ${bookingId}, got ${invoiceId}`)
      res.status(400).send('Booking ID mismatch')
      return
    }

    // Round booking price to 2 decimal places for comparison
    const expectedPrice = Number.parseFloat(booking.price.toFixed(2))

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

      res.sendStatus(200)
      return
    }

    //
    // 4. Delete Booking if the payment didn't succeed
    //
    await booking.deleteOne()
    res.status(400).send(!isStatusCompleted ? order.status : 'PAYMENT_VERIFICATION_FAILED')
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
