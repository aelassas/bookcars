import * as env from '../config/env.config'
import { PaymentGateway } from ':bookcars-types'
import Stripe from 'stripe'
import axios from 'axios'

// Payment gateway interface
export interface IPaymentGateway {
  processPayment(amount: number, currency: string, description: string): Promise<any>
  createCheckoutSession(bookingId: string, customerId: string, amount: number): Promise<any>
  refundPayment(paymentId: string, amount: number): Promise<any>
}

// Stripe Gateway Implementation
class StripeGateway implements IPaymentGateway {
  private stripe: Stripe

  constructor() {
    this.stripe = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-04-30.basil',
    })
  }

  async processPayment(amount: number, currency: string, description: string) {
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Stripe requires amount in cents
      currency,
      description,
    })
    return paymentIntent
  }
  
  async createCheckoutSession(bookingId: string, customerId: string, amount: number) {
    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Booking #${bookingId}`,
            },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${env.FRONTEND_HOST}/booking-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.FRONTEND_HOST}/booking-cancel`,
      client_reference_id: bookingId,
      customer: customerId,
    })
    return session
  }

  async refundPayment(paymentId: string, amount: number) {
    const refund = await this.stripe.refunds.create({
      payment_intent: paymentId,
      amount: Math.round(amount * 100),
    })
    return refund
  }
}

// PayPal Gateway Implementation
class PayPalGateway implements IPaymentGateway {
  async processPayment(_amount: number, _currency: string, _description: string) {
    // PayPal implementation
    // This would use the PayPal SDK to create a payment
    return { success: true, id: 'mock-paypal-payment-id' }
  }

  async createCheckoutSession(_bookingId: string, _customerId: string, _amount: number) {
    // PayPal checkout session creation
    return { success: true, id: 'mock-paypal-session-id', url: 'https://paypal.com/checkout' }
  }

  async refundPayment(_paymentId: string, _amount: number) {
    // PayPal refund implementation
    return { success: true, id: 'mock-paypal-refund-id' }
  }
}

// Visa Gateway Implementation
class VisaGateway implements IPaymentGateway {
  async processPayment(amount: number, currency: string, description: string) {
    // This is a mock implementation - you would need to integrate with Visa's actual API
    const response = await axios.post(
      'https://mock-visa-endpoint.com', // env.PAYMENT_GATEWAYS.VISA_ENDPOINT,
      {
        amount,
        currency,
        description,
        // apiKey: env.PAYMENT_GATEWAYS.VISA_API_KEY,
      },
      {
        headers: {
          // 'Authorization': `Bearer ${env.PAYMENT_GATEWAYS.VISA_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    )
    return response.data
  }
  
  async createCheckoutSession(_bookingId: string, _customerId: string, _amount: number) {
    // Visa checkout session creation
    return { success: true, id: 'mock-visa-session-id', url: 'https://visa.com/checkout' }
  }

  async refundPayment(_paymentId: string, _amount: number) {
    // Visa refund implementation
    return { success: true, id: 'mock-visa-refund-id' }
  }
}

// Factory class
export class PaymentGatewayFactory {
  static createGateway(type: PaymentGateway): IPaymentGateway | null {
    switch (type) {
      case PaymentGateway.Stripe:
        return new StripeGateway() // env.PAYMENT_GATEWAYS.STRIPE_ENABLED ? new StripeGateway() : null
      case PaymentGateway.PayPal:
        return new PayPalGateway() // env.PAYMENT_GATEWAYS.PAYPAL_ENABLED ? new PayPalGateway() : null
      case PaymentGateway.Visa:
        return new VisaGateway() // env.PAYMENT_GATEWAYS.VISA_ENABLED ? new VisaGateway() : null
      default:
        return null
    }
  }
}
