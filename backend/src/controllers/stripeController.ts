import { Request, Response } from 'express'
import Stripe from 'stripe'
import i18n from '../lang/i18n'
import * as logger from '../utils/logger'
import * as bookcarsTypes from ':bookcars-types'
import * as env from '../config/env.config'
import * as helper from '../utils/helper'
import Booking from '../models/Booking'
import User from '../models/User'
import Car from '../models/Car'
import * as bookingController from './bookingController'

/**
 * Create Checkout Session.
 *
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const createCheckoutSession = async (req: Request, res: Response) => {
  try {
    const stripeAPI = (await import('../payment/stripe.js')).default
    const {
      amount,
      currency,
      locale,
      receiptEmail,
      name,
      description,
      customerName,
    }: bookcarsTypes.CreatePaymentPayload = req.body

    //
    // 1. Create the customer if he does not already exist
    //
    const customers = await stripeAPI.customers.list({ email: receiptEmail })

    let customer: Stripe.Customer
    if (customers.data.length === 0) {
      customer = await stripeAPI.customers.create({
        email: receiptEmail,
        name: customerName,
      })
    } else {
      [customer] = customers.data
    }

    //
    // 2. Create checkout session
    //
    const expireAt = Math.floor((Date.now() / 1000) + env.STRIPE_SESSION_EXPIRE_AT)

    const session = await stripeAPI.checkout.sessions.create({
      ui_mode: 'embedded',
      line_items: [
        {
          price_data: {
            product_data: {
              name,
            },
            unit_amount: Math.floor(amount * 100),
            currency: currency.toLowerCase(),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      return_url: `${helper.trimEnd(env.FRONTEND_HOST, '/')}/checkout-session/{CHECKOUT_SESSION_ID}`,
      customer: customer.id,
      locale: helper.getStripeLocale(locale),
      payment_intent_data: {
        description,
      },
      expires_at: expireAt,
    })

    const result: bookcarsTypes.PaymentResult = {
      sessionId: session.id,
      customerId: customer.id,
      clientSecret: session.client_secret,
    }
    res.json(result)
  } catch (err) {
    logger.error(`[stripe.createCheckoutSession] ${i18n.t('ERROR')}`, err)
    res.status(400).send(i18n.t('ERROR') + err)
  }
}

/**
 * Check Checkout Session and update booking if the payment succeeded.
 *
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const checkCheckoutSession = async (req: Request, res: Response) => {
  try {
    const stripeAPI = (await import('../payment/stripe.js')).default
    const { sessionId } = req.params

    //
    // 1. Retrieve Checkout Sesssion and Booking
    //
    let session: Stripe.Checkout.Session | undefined
    try {
      session = await stripeAPI.checkout.sessions.retrieve(sessionId)
    } catch (err) {
      logger.error(`[stripe.checkCheckoutSession] retrieve session error: ${sessionId}`, err)
    }

    if (!session) {
      const msg = `Session ${sessionId} not found`
      logger.info(`[stripe.checkCheckoutSession] ${msg}`)
      res.status(204).send(msg)
      return
    }

    const booking = await Booking.findOne({ sessionId, expireAt: { $ne: null } })
    if (!booking) {
      const msg = `Booking with sessionId ${sessionId} not found`
      logger.info(`[stripe.checkCheckoutSession] ${msg}`)
      res.status(204).send(msg)
      return
    }

    //
    // 2. Update Booking if the payment succeeded
    // (Set BookingStatus to Paid and remove expireAt TTL index)
    //
    if (session.payment_status === 'paid') {
      booking.expireAt = undefined

      let status = bookcarsTypes.BookingStatus.Paid
      if (booking.isDeposit) {
        status = bookcarsTypes.BookingStatus.Deposit
      } else if (booking.isPayedInFull) {
        status = bookcarsTypes.BookingStatus.PaidInFull
      }
      booking.status = status

      await booking.save()

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
      await bookingController.notify(user, booking.id, supplier, message)

      // Notify admin
      const admin = !!env.ADMIN_EMAIL && (await User.findOne({ email: env.ADMIN_EMAIL, type: bookcarsTypes.UserType.Admin }))
      if (admin) {
        i18n.locale = admin.language
        message = i18n.t('BOOKING_PAID_NOTIFICATION')
        await bookingController.notify(user, booking.id, admin, message)
      }

      res.sendStatus(200)
      return
    }

    //
    // 3. Delete Booking if the payment didn't succeed
    //
    await booking.deleteOne()
    res.status(400).send(session.payment_status)
  } catch (err) {
    logger.error(`[stripe.checkCheckoutSession] ${i18n.t('ERROR')}`, err)
    res.status(400).send(i18n.t('ERROR') + err)
  }
}

/**
 * Create Payment Intent.
 *
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const createPaymentIntent = async (req: Request, res: Response) => {
  try {
    const stripeAPI = (await import('../payment/stripe.js')).default
    const {
      amount,
      currency,
      receiptEmail,
      description,
      customerName,
    }: bookcarsTypes.CreatePaymentPayload = req.body


    //
    // 1. Create the customer if he does not already exist
    //
    const customers = await stripeAPI.customers.list({ email: receiptEmail })

    let customer: Stripe.Customer
    if (customers.data.length === 0) {
      customer = await stripeAPI.customers.create({
        email: receiptEmail,
        name: customerName,
      })
    } else {
      [customer] = customers.data
    }

    //
    // 2. Create payment intent
    //
    const paymentIntent = await stripeAPI.paymentIntents.create({
      //
      // All API requests expect amounts to be provided in a currency’s smallest unit.
      // For example, to charge 10 USD, provide an amount value of 1000 (that is, 1000 cents).
      //
      amount: Math.floor(amount * 100),
      currency: currency.toLowerCase(),
      receipt_email: receiptEmail,
      description,
      customer: customer.id,
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never',
      },
    })

    //
    // 3. Send result
    //
    const result: bookcarsTypes.PaymentResult = {
      paymentIntentId: paymentIntent.id,
      customerId: customer.id,
      clientSecret: paymentIntent.client_secret,
    }
    res.json(result)
  } catch (err) {
    logger.error(`[stripe.createPaymentIntent] ${i18n.t('ERROR')}`, err)
    res.status(400).send(i18n.t('ERROR') + err)
  }
}
