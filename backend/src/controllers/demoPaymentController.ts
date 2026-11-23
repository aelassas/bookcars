import { randomUUID } from 'node:crypto'
import type { Request, Response } from 'express'
import * as bookcarsTypes from ':bookcars-types'
import * as env from '../config/env.config'
import Booking from '../models/Booking'
import User from '../models/User'
import * as logger from '../utils/logger'
import * as helper from '../utils/helper'

/**
 * Record an explicitly simulated FYP payment response. It never calls a payment
 * provider and deliberately leaves the authoritative booking/payment status intact.
 */
export const simulate = async (req: Request, res: Response) => {
  if (process.env.NODE_ENV !== 'development' || !env.FYP_DEMO_MODE) {
    res.sendStatus(404)
    return
  }

  try {
    const { bookingId } = req.params
    const { outcome, idempotencyKey, paymentMethod }: {
      outcome?: bookcarsTypes.DemoPaymentOutcome
      idempotencyKey?: string
      paymentMethod?: bookcarsTypes.RentalPaymentMethod
    } = req.body

    if (
      !['success', 'failed', 'cancelled'].includes(String(outcome))
      || typeof idempotencyKey !== 'string'
      || idempotencyKey.length < 8
      || idempotencyKey.length > 120
      || (paymentMethod !== undefined && !Object.values(bookcarsTypes.RentalPaymentMethod).includes(paymentMethod))
    ) {
      res.status(400).send('Invalid FYP payment simulation request')
      return
    }

    const [booking, customer] = await Promise.all([
      Booking.findById(bookingId),
      User.findById(req.user?._id),
    ])

    if (!booking || !customer) {
      res.sendStatus(404)
      return
    }

    if (
      customer.type !== bookcarsTypes.UserType.User
      || !booking.driver.equals(customer._id)
    ) {
      res.sendStatus(403)
      return
    }

    if (![bookcarsTypes.BookingStatus.Pending, bookcarsTypes.BookingStatus.Reserved].includes(booking.status)) {
      res.status(409).send('Payment simulation is only available for an active booking request')
      return
    }
    if (booking.paymentState === 'CONFIRMED') {
      res.status(409).send('This booking already has a demo payment confirmation')
      return
    }
    if (booking.paymentStatus === bookcarsTypes.RentalPaymentStatus.Paid) {
      res.status(409).send('This demo booking already has a successful payment result')
      return
    }

    const existing = booking.demoPaymentAttempts?.find((attempt) => attempt.idempotencyKey === idempotencyKey)
    if (existing) {
      res.status(200).json({
        reference: existing.reference,
        idempotencyKey: existing.idempotencyKey,
        outcome: existing.outcome,
        amount: existing.amount,
        currency: existing.currency,
        createdAt: existing.createdAt,
        simulated: true,
        charged: false,
        bookingStatus: booking.status,
        paymentStatus: booking.paymentStatus,
      })
      return
    }

    const attempt: bookcarsTypes.DemoPaymentAttempt = {
      reference: `FYP-${randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()}`,
      idempotencyKey,
      outcome: outcome as bookcarsTypes.DemoPaymentOutcome,
      paymentMethod: paymentMethod || bookcarsTypes.RentalPaymentMethod.CardDemo,
      amount: booking.price,
      currency: env.BASE_CURRENCY,
      createdAt: new Date(),
    }

    booking.demoPaymentAttempts = [...(booking.demoPaymentAttempts || []), attempt]
    booking.paymentMethod = attempt.paymentMethod
    booking.paymentStatus = attempt.outcome === 'success'
      ? bookcarsTypes.RentalPaymentStatus.Paid
      : attempt.outcome === 'failed'
        ? bookcarsTypes.RentalPaymentStatus.Failed
        : bookcarsTypes.RentalPaymentStatus.PendingPayment
    if (attempt.outcome === 'success') {
      booking.transactionRef = attempt.reference
    }
    await booking.save()

    res.status(200).json({
      ...attempt,
      simulated: true,
      charged: false,
      bookingStatus: booking.status,
      paymentStatus: booking.paymentStatus,
    })
  } catch (err) {
    logger.error(`[demoPayment.simulate] Failed to record local test outcome for ${req.params.bookingId}`, err)
    res.status(400).send('Could not record the FYP payment simulation')
  }
}

/** Persist a clearly simulated demo confirmation; no PSP or bank is contacted. */
export const confirm = async (req: Request, res: Response) => {
  if (process.env.NODE_ENV !== 'development' || !env.FYP_DEMO_MODE) {
    res.sendStatus(404)
    return
  }
  try {
    const { bookingId, paymentMethod, mobileNumber, idempotencyKey } = req.body || {}
    const wallet = paymentMethod === bookcarsTypes.RentalPaymentMethod.JazzCash
      || paymentMethod === bookcarsTypes.RentalPaymentMethod.Easypaisa
    if (!helper.isValidObjectId(bookingId)
      || !Object.values(bookcarsTypes.RentalPaymentMethod).includes(paymentMethod)
      || typeof idempotencyKey !== 'string' || idempotencyKey.length < 8 || idempotencyKey.length > 120
      || (wallet && (typeof mobileNumber !== 'string' || !/^(?:03\d{2}-\d{7}|03\d{9})$/.test(mobileNumber)))) {
      res.status(400).json({ message: 'Choose a demo payment method and enter a valid 03XX-XXXXXXX mobile number for wallet payments.' })
      return
    }
    const [booking, customer] = await Promise.all([Booking.findById(bookingId), User.findById(req.user?._id)])
    if (!booking || !customer) {
      res.sendStatus(404)
      return
    }
    if (customer.type !== bookcarsTypes.UserType.User || !booking.driver.equals(customer._id)) {
      res.sendStatus(403)
      return
    }
    const existing = booking.demoPaymentAttempts?.find((attempt) => attempt.idempotencyKey === idempotencyKey)
    if (existing) {
      res.json({ simulated: true, charged: false, reference: existing.reference, paymentState: booking.paymentState, paymentStatus: booking.paymentStatus })
      return
    }
    if (booking.paymentState === 'CONFIRMED') {
      res.status(409).json({ message: 'This booking already has a demo payment confirmation.' })
      return
    }
    const code = paymentMethod === bookcarsTypes.RentalPaymentMethod.JazzCash ? 'JC'
      : paymentMethod === bookcarsTypes.RentalPaymentMethod.Easypaisa ? 'EP'
        : paymentMethod === bookcarsTypes.RentalPaymentMethod.Raast ? 'RT' : 'DC'
    const reference = `SR-DEMO-${code}-${randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()}`
    const attempt: bookcarsTypes.DemoPaymentAttempt = {
      reference,
      idempotencyKey,
      outcome: 'success',
      paymentMethod,
      amount: booking.price,
      currency: 'PKR',
      createdAt: new Date(),
    }
    booking.demoPaymentAttempts = [...(booking.demoPaymentAttempts || []), attempt]
    booking.paymentMethod = paymentMethod
    booking.paymentStatus = bookcarsTypes.RentalPaymentStatus.Paid
    booking.paymentState = 'CONFIRMED'
    booking.transactionRef = reference
    await booking.save()
    res.json({ simulated: true, charged: false, reference, paymentState: booking.paymentState, paymentStatus: booking.paymentStatus, amount: attempt.amount, currency: attempt.currency })
  } catch (err) {
    logger.error(`[demoPayment.confirm] Failed to save local demo confirmation for ${req.body?.bookingId}`, err)
    res.status(400).json({ message: 'Could not confirm the demo payment.' })
  }
}
