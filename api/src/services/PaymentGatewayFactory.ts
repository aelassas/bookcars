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
      apiVersion: '2023-10-16',
    })
  }

  async processPayment(amount: number, currency: string, description: string) {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Stripe requires amount in cents
        currency,
        description,
      })
      return paymentIntent
    } catch (error) {
      throw error
    }
  }
  
  async createCheckoutSession(bookingId: string, customerId: string, amount: number) {
    try {
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
    } catch (error) {
      throw error
    }
  }

  async refundPayment(paymentId: string, amount: number) {
    try {
      const refund = await this.stripe.refunds.create({
        payment_intent: paymentId,
        amount: Math.round(amount * 100),
      })
      return refund
    } catch (error) {
      throw error
    }
  }
}

// PayPal Gateway Implementation
class PayPalGateway implements IPaymentGateway {
  async processPayment(amount: number, currency: string, description: string) {
    // PayPal implementation
    // This would use the PayPal SDK to create a payment
    return { success: true, id: 'mock-paypal-payment-id' }
  }
  
  async createCheckoutSession(bookingId: string, customerId: string, amount: number) {
    // PayPal checkout session creation
    return { success: true, id: 'mock-paypal-session-id', url: 'https://paypal.com/checkout' }
  }

  async refundPayment(paymentId: string, amount: number) {
    // PayPal refund implementation
    return { success: true, id: 'mock-paypal-refund-id' }
  }
}

// Visa Gateway Implementation
class VisaGateway implements IPaymentGateway {
  async processPayment(amount: number, currency: string, description: string) {
    try {
      // This is a mock implementation - you would need to integrate with Visa's actual API
      const response = await axios.post(
        env.PAYMENT_GATEWAYS.VISA_ENDPOINT,
        {
          amount,
          currency,
          description,
          apiKey: env.PAYMENT_GATEWAYS.VISA_API_KEY,
        },
        {
          headers: {
            'Authorization': `Bearer ${env.PAYMENT_GATEWAYS.VISA_SECRET_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      )
      return response.data
    } catch (error) {
      throw error
    }
  }
  
  async createCheckoutSession(bookingId: string, customerId: string, amount: number) {
    // Visa checkout session creation
    return { success: true, id: 'mock-visa-session-id', url: 'https://visa.com/checkout' }
  }

  async refundPayment(paymentId: string, amount: number) {
    // Visa refund implementation
    return { success: true, id: 'mock-visa-refund-id' }
  }
}

// Factory class
export class PaymentGatewayFactory {
  static createGateway(type: PaymentGateway): IPaymentGateway | null {
    switch (type) {
      case PaymentGateway.Stripe:
        return env.PAYMENT_GATEWAYS.STRIPE_ENABLED ? new StripeGateway() : null
      case PaymentGateway.PayPal:
        return env.PAYMENT_GATEWAYS.PAYPAL_ENABLED ? new PayPalGateway() : null
      case PaymentGateway.Visa:
        return env.PAYMENT_GATEWAYS.VISA_ENABLED ? new VisaGateway() : null
      default:
        return null
    }
  }
}
