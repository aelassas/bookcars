import { Request, Response } from 'express'
import Stripe from 'stripe'
import stripeAPI from '../stripe'
import i18n from '../lang/i18n'
import * as logger from '../common/logger'
import * as bookcarsTypes from ':bookcars-types'

/**
 * Create Payment Intent.
 *
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const createPaymentIntent = async (req: Request, res: Response) => {
  const {
    amount,
    currency,
    receiptEmail,
    description,
    customerName,
  }: bookcarsTypes.CreatePaymentIntentPayload = req.body

  try {
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
      // All API requests expect amounts to be provided in a currency’s smallest unit.
      // For example, to charge 10 USD, provide an amount value of 1000 (that is, 1000 cents).
      amount: Math.floor(amount * 100),
      currency,
      payment_method_types: ['card'],
      receipt_email: receiptEmail,
      description,
      customer: customer.id,
    })

    //
    // 3. Send result
    //
    const result: bookcarsTypes.PaymentIntentResult = {
      paymentIntentId: paymentIntent.id,
      customerId: customer.id,
      clientSecret: paymentIntent.client_secret,
    }
    return res.status(200).json(result)
  } catch (err) {
    logger.error(`[stripe.createPaymentIntent] ${i18n.t('ERROR')}`, err)
    return res.status(400).send(i18n.t('ERROR') + err)
  }
}
