import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { strings } from '@/lang/checkout'
import Layout from '@/components/Layout'
import NoMatch from './NoMatch'
import * as StripeService from '@/services/StripeService'
import * as BookingService from '@/services/BookingService'
import * as UserService from '@/services/UserService'
import Info from './Info'
import CheckoutStatus from '@/components/CheckoutStatus'

import '@/assets/css/checkout-session.css'

const CheckoutSession = () => {
  const { sessionId } = useParams()
  const [bookingId, setBookingId] = useState('')
  const [loading, setLoading] = useState(true)
  const [noMatch, setNoMatch] = useState(false)
  const [success, setSuccess] = useState(false)

  if (!sessionId) {
    setNoMatch(true)
  }

  useEffect(() => {
    if (sessionId) {
      const checkSession = async () => {
        try {
          setLoading(true)
          const status = await StripeService.checkCheckoutSession(sessionId)

          const _bookingId = await BookingService.getBookingId(sessionId)
          setBookingId(_bookingId)

          setNoMatch(status === 204)
          setSuccess(status === 200)
        } catch {
          setSuccess(false)
        } finally {
          setLoading(false)
        }
      }

      checkSession()
    }
  }, [sessionId])

  return (
    <Layout>
      <div className="checkout-session">
        {
          loading
            ? <Info message={strings.CHECKING} hideLink />
            : (
              noMatch
                ? <NoMatch hideHeader />
                : (
                  success && bookingId && (
                    <CheckoutStatus
                      bookingId={bookingId}
                      language={UserService.getLanguage()}
                      status={success ? 'success' : 'error'}
                      className="status"
                    />
                  )
                )
            )
        }
      </div>
    </Layout>
  )
}

export default CheckoutSession
