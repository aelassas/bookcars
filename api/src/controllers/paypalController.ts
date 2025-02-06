import { Request, Response } from 'express'
import * as paypal from '../paypal'
import i18n from '../lang/i18n'
import * as logger from '../common/logger'
import * as bookcarsTypes from ':bookcars-types'
import * as env from '../config/env.config'
import Booking from '../models/Booking'
import User from '../models/User'
import Car from '../models/Car'
import * as bookingController from './bookingController'

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
    const { bookingId, amount, currency, name, description }: bookcarsTypes.CreatePayPalOrderPayload = req.body

    const orderId = await paypal.createOrder(bookingId, amount, currency, name, description)

    return res.json(orderId)
  } catch (err) {
    logger.error(`[paypal.createPayPalOrder] ${i18n.t('ERROR')}`, err)
    return res.status(400).send(i18n.t('ERROR') + err)
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
  try {
    const { bookingId, orderId } = req.params

    //
    // 1. Retrieve Checkout Sesssion and Booking
    //
    const booking = await Booking.findOne({ _id: bookingId, expireAt: { $ne: null } })
    if (!booking) {
      const msg = `Booking with id ${bookingId} not found`
      logger.info(`[paypal.checkPayPalOrder] ${msg}`)
      return res.status(204).send(msg)
    }

    let order
    try {
      order = await paypal.getOrder(orderId)
    } catch (err) {
      logger.error(`[paypal.checkPayPalOrder] retrieve paypal order error: ${orderId}`, err)
    }

    if (!order) {
      const msg = `Order ${order} not found`
      logger.info(`[paypal.checkPayPalOrder] ${msg}`)
      return res.status(204).send(msg)
    }

    //
    // 2. Update Booking if the payment succeeded
    // (Set BookingStatus to Paid and remove expireAt TTL index)
    //
    if (order.status === 'APPROVED') {
      booking.paypalOrderId = orderId
      booking.expireAt = undefined
      booking.status = booking.isDeposit ? bookcarsTypes.BookingStatus.Deposit : bookcarsTypes.BookingStatus.Paid
      await booking.save()

      // Mark car as unavailable
      // await Car.updateOne({ _id: booking.car }, { available: false })
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

      if (!await bookingController.confirm(user, supplier, booking, false)) {
        return res.sendStatus(400)
      }

      // Notify supplier
      i18n.locale = supplier.language
      let message = i18n.t('BOOKING_PAID_NOTIFICATION')
      await bookingController.notify(user, booking.id, supplier, message)

      // Notify admin
      const admin = !!env.ADMIN_EMAIL && await User.findOne({ email: env.ADMIN_EMAIL, type: bookcarsTypes.UserType.Admin })
      if (admin) {
        i18n.locale = admin.language
        message = i18n.t('BOOKING_PAID_NOTIFICATION')
        await bookingController.notify(user, booking.id, admin, message)
      }

      return res.sendStatus(200)
    }

    //
    // 3. Delete Booking if the payment didn't succeed
    //
    await booking.deleteOne()
    return res.status(400).send(order.status)
  } catch (err) {
    logger.error(`[paypal.checkPayPalOrder] ${i18n.t('ERROR')}`, err)
    return res.status(400).send(i18n.t('ERROR') + err)
  }
}
