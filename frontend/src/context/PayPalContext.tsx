import React from 'react'
import { PayPalScriptProvider } from '@paypal/react-paypal-js'
import * as bookcarsTypes from ':bookcars-types'
import env from '@/config/env.config'
import * as PaymentService from '@/services/PaymentService'
import * as PayPalService from '@/services/PayPalService'

interface PayPalProviderProps {
  children: React.ReactNode
}

const PayPalProvider = ({ children }: PayPalProviderProps) => (
  env.PAYMENT_GATEWAY === bookcarsTypes.PaymentGateway.PayPal ? (
    <PayPalScriptProvider
      options={{
        clientId: env.PAYPAL_CLIENT_ID,
        currency: PaymentService.getCurrency(),
        intent: 'capture',
        locale: PayPalService.getLocale(),
        // buyerCountry: 'US',
        debug: env.PAYPAL_DEBUG,
      }}
    >
      {children}
    </PayPalScriptProvider>
  ) : children
)

export { PayPalProvider }
