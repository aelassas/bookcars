import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { strings } from 'src/lang/checkout'
import Master from 'src/components/Master'
import NoMatch from './NoMatch'
import * as StripeService from '../services/StripeService'
import Info from './Info'

const CheckoutSession = () => {
  const { sessionId } = useParams()
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
    <Master>
      {
        loading
          ? <Info message={strings.CHECKING} hideLink />
          : (
            noMatch
              ? <NoMatch hideHeader />
              : (
                success
                  ? <Info message={strings.SUCCESS} />
                  : <Info message={strings.PAYMENT_FAILED} />
              )
          )
      }
    </Master>
  )
}

export default CheckoutSession
