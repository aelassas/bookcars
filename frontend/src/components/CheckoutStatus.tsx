import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { DirectionsCar as CarIcon } from '@mui/icons-material'
import { format } from 'date-fns'
import { fr, enUS, es } from 'date-fns/locale'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import * as helper from '@/utils/helper'
import * as BookingService from '@/services/BookingService'
import * as PaymentService from '@/services/PaymentService'
import { strings } from '@/lang/checkout-status'
import { strings as commonStrings } from '@/lang/common'
import { strings as checkoutStrings } from '@/lang/checkout'
import Toast from '@/components/Toast'
import Error from '@/components/Error'

import '@/assets/css/checkout-status.css'

interface CheckoutStatusProps {
  bookingId: string,
  sessionId?: string,
  payLater?: boolean,
  language: string,
  status: 'success' | 'error'
  className?: string
}

const CheckoutStatus = (
  {
    bookingId,
    sessionId,
    payLater,
    language,
    status,
    className,
  }: CheckoutStatusProps
) => {
  const [booking, setBooking] = useState<bookcarsTypes.Booking>()
  const [price, setPrice] = useState(0)
  const [loading, setLoading] = useState(true)
  const { sessionId: sessionIdFromUrl } = useParams<{ sessionId: string }>()
  const [sessionIdMismatch, setSessionIdMismatch] = useState(false)

  useEffect(() => {
    const init = async () => {
      // If accessed via a route with :sessionId, verify matching URL param
      if (sessionIdFromUrl && sessionId !== sessionIdFromUrl) {
        setSessionIdMismatch(true)
        return
      }

      // Pass sessionId to getBooking so backend verifyTokenOptional approves the unauthenticated request
      const _booking = await BookingService.getBooking(bookingId, sessionId)
      setBooking(_booking)
      setPrice(await PaymentService.convertPrice(_booking.price!))
      setLoading(false)
    }

    if (bookingId) {
      init()
    }
  }, [bookingId, sessionId, sessionIdFromUrl])

  if (loading) {
    return null
  }

  const _fr = language === 'fr'
  const _es = language === 'es'
  const _locale = _fr ? fr : _es ? es : enUS
  const _format = _fr ? 'eee d LLL yyyy kk:mm' : 'eee, d LLL yyyy, p'
  const days = (booking && bookcarsHelper.days(new Date(booking.from), new Date(booking.to))) || 0
  const success = status === 'success'

  return booking && (
    <div className={`checkout-status ${className || ''}`}>
      <Toast
        title={strings.CONGRATULATIONS}
        text={success
          ? payLater ? strings.SUCCESS_PAY_LATER : strings.SUCCESS
          : strings.ERROR}
        status={status}
      />

      {sessionIdMismatch && (
        <div className="session-id-mismatch">
          <Error message={strings.SESSION_ID_MISMATCH} />
        </div>
      )}

      {success && (
        <div className="details">
          <div className="status-details-container">
            <div className="status-info">
              <CarIcon />
              <span>{checkoutStrings.BOOKING_DETAILS}</span>
            </div>
            <div className="status-details">
              <div className="status-detail">
                <span className="status-detail-title">{checkoutStrings.CAR}</span>
                <div className="status-detail-value">
                  <span>{(booking.car as bookcarsTypes.Car).name}</span>
                </div>
              </div>
              <div className="status-detail">
                <span className="status-detail-title">{checkoutStrings.DAYS}</span>
                <div className="status-detail-value">
                  {`${helper.getDaysShort(days)} (${bookcarsHelper.capitalize(
                    format(new Date(booking.from), _format, { locale: _locale }),
                  )} - ${bookcarsHelper.capitalize(format(new Date(booking.to), _format, { locale: _locale }))})`}
                </div>
              </div>
              <div className="status-detail">
                <span className="status-detail-title">{commonStrings.PICK_UP_LOCATION}</span>
                <div className="status-detail-value">{(booking.pickupLocation as bookcarsTypes.Location).name}</div>
              </div>
              <div className="status-detail">
                <span className="status-detail-title">{commonStrings.DROP_OFF_LOCATION}</span>
                <div className="status-detail-value">{(booking.dropOffLocation as bookcarsTypes.Location).name}</div>
              </div>
              <div className="status-detail">
                <span className="status-detail-title">{checkoutStrings.COST}</span>
                <div className="status-detail-value status-price">{bookcarsHelper.formatPrice(price, commonStrings.CURRENCY, language)}</div>
              </div>
            </div>
          </div>

          <div className="side-panel">
            <h1>{strings.STATUS_TITLE}</h1>
            <p>{strings.STATUS_MESSAGE}</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default CheckoutStatus
