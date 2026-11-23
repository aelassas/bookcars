import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { DirectionsCar as CarIcon } from '@mui/icons-material'
import { Alert, Button, CircularProgress, FormControl, InputLabel, MenuItem, Select, TextField } from '@mui/material'
import { format } from 'date-fns'
import { nanoid } from 'nanoid'
import { getDateLocale } from '@/utils/dateLocale'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import * as helper from '@/utils/helper'
import * as BookingService from '@/services/BookingService'
import * as UserService from '@/services/UserService'
import env from '@/config/env.config'
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
  const [demoAttempts, setDemoAttempts] = useState<bookcarsTypes.DemoPaymentAttempt[]>([])
  const [demoPaymentLoading, setDemoPaymentLoading] = useState<bookcarsTypes.DemoPaymentOutcome | null>(null)
  const [demoPaymentError, setDemoPaymentError] = useState('')
  const [demoPaymentMethod, setDemoPaymentMethod] = useState<bookcarsTypes.RentalPaymentMethod>(bookcarsTypes.RentalPaymentMethod.JazzCash)
  const [demoWalletPhone, setDemoWalletPhone] = useState('')
  const [demoReceipt, setDemoReceipt] = useState('')

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
      setDemoAttempts(_booking.demoPaymentAttempts || [])
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

  const _locale = getDateLocale(language)
  const _format = ({
    fr: 'eee d LLL yyyy kk:mm',
    de: 'eee d LLL yyyy kk:mm',
    pt: 'eee d LLL yyyy kk:mm',
    it: 'eee d LLL yyyy kk:mm',
    zh: 'yyyy年M月d日 eee HH:mm',
    ja: 'yyyy年M月d日 eee HH:mm',
  } as Record<string, string>)[language] || 'eee, d LLL yyyy, p'
  const days = (booking && bookcarsHelper.days(new Date(booking.from), new Date(booking.to))) || 0
  const success = status === 'success'
  const currentUser = UserService.getCurrentUser()
  const driverId = typeof booking?.driver === 'string' ? booking.driver : booking?.driver?._id
  const canSimulateDemoPayment = !!(
    env.FYP_DEMO_MODE
    && payLater
    && currentUser?._id
    && currentUser._id === driverId
    && booking
    && [bookcarsTypes.BookingStatus.Pending, bookcarsTypes.BookingStatus.Reserved].includes(booking.status)
  )

  const simulateDemoPayment = async (outcome: bookcarsTypes.DemoPaymentOutcome) => {
    setDemoPaymentLoading(outcome)
    setDemoPaymentError('')
    try {
      const key = nanoid()
      const attempt = outcome === 'success'
        ? await BookingService.confirmDemoPayment(bookingId, demoPaymentMethod, demoWalletPhone, key)
        : await BookingService.simulateFypPayment(bookingId, outcome, key, demoPaymentMethod)
      const savedAttempt = 'outcome' in attempt ? attempt : {
        reference: attempt.reference,
        idempotencyKey: key,
        outcome: 'success' as const,
        paymentMethod: demoPaymentMethod,
        amount: attempt.amount,
        currency: attempt.currency,
        createdAt: new Date(),
      }
      setDemoAttempts((previous) => [...previous, savedAttempt])
      if (outcome === 'success') {
        setDemoReceipt(attempt.reference)
        setBooking((previous) => previous ? {
          ...previous,
          paymentState: 'CONFIRMED',
          paymentStatus: bookcarsTypes.RentalPaymentStatus.Paid,
          transactionRef: attempt.reference,
        } : previous)
      }
    } catch {
      setDemoPaymentError('Could not save this test outcome. Refresh the booking and try again.')
    } finally {
      setDemoPaymentLoading(null)
    }
  }

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
                  {`${helper.getDaysShort(language, days)} (${bookcarsHelper.capitalize(
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
            {canSimulateDemoPayment && (
              <section className="fyp-demo-payment" aria-labelledby="fyp-demo-payment-title">
                <div className="fyp-demo-payment-label">FYP TEST MODE · NO CHARGE</div>
                <h2 id="fyp-demo-payment-title">Payment outcome simulator</h2>
                <p>Stores a simulated payment status on this booking. It never contacts a wallet or card provider or moves money; supplier booking status is unchanged.</p>
                <FormControl size="small" fullWidth>
                  <InputLabel id="demo-payment-method-label">Demo method</InputLabel>
                  <Select
                    labelId="demo-payment-method-label"
                    label="Demo method"
                    value={demoPaymentMethod}
                    onChange={(event) => setDemoPaymentMethod(event.target.value as bookcarsTypes.RentalPaymentMethod)}
                  >
                    <MenuItem value={bookcarsTypes.RentalPaymentMethod.JazzCash}>JazzCash · simulated</MenuItem>
                    <MenuItem value={bookcarsTypes.RentalPaymentMethod.Easypaisa}>Easypaisa · simulated</MenuItem>
                    <MenuItem value={bookcarsTypes.RentalPaymentMethod.Raast}>Raast · simulated</MenuItem>
                    <MenuItem value={bookcarsTypes.RentalPaymentMethod.CardDemo}>Card · simulated</MenuItem>
                  </Select>
                </FormControl>
                {(demoPaymentMethod === bookcarsTypes.RentalPaymentMethod.JazzCash || demoPaymentMethod === bookcarsTypes.RentalPaymentMethod.Easypaisa) && (
                  <TextField
                    size="small"
                    fullWidth
                    label="Demo wallet mobile"
                    placeholder="03XX-XXXXXXX"
                    value={demoWalletPhone}
                    onChange={(event) => setDemoWalletPhone(event.target.value)}
                    inputProps={{ maxLength: 12, inputMode: 'tel' }}
                  />
                )}
                <div className="fyp-demo-payment-actions">
                  {(['success', 'failed', 'cancelled'] as bookcarsTypes.DemoPaymentOutcome[]).map((outcome) => (
                    <Button
                      key={outcome}
                      type="button"
                      variant={outcome === 'success' ? 'contained' : 'outlined'}
                      disabled={demoPaymentLoading !== null}
                      onClick={() => simulateDemoPayment(outcome)}
                    >
                      {demoPaymentLoading === outcome ? <CircularProgress size={18} /> : `Test ${outcome}`}
                    </Button>
                  ))}
                </div>
                {demoPaymentError && <Alert severity="error">{demoPaymentError}</Alert>}
                {demoAttempts.length > 0 && (
                  <div className="fyp-demo-payment-history">
                    <strong>Saved test attempts</strong>
                    {demoAttempts.slice().reverse().map((attempt) => (
                      <div className="fyp-demo-payment-attempt" key={attempt.reference}>
                        <span>{attempt.outcome}</span>
                        <span>{attempt.currency} {attempt.amount.toLocaleString()}</span>
                        <code>{attempt.reference}</code>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}
            {booking.paymentState === 'CONFIRMED' && (
              <section className="safarrent-e-parchi" aria-label="Digital rental summary">
                <div className="fyp-demo-payment-label">DIGITAL RENTAL SUMMARY · FYP DEMO</div>
                <h2>Rental e-Parchi</h2>
                <p><strong>Booking ID:</strong> {booking._id}</p>
                <p><strong>Customer CNIC:</strong> {typeof booking.driver === 'string' ? 'Not available' : booking.driver?.cnicNumber || 'Not provided'}</p>
                <p><strong>Rental mode:</strong> {booking.rentalMode === bookcarsTypes.RentalMode.SelfDrive ? 'Self-drive' : 'With driver'}</p>
                <p><strong>Fuel policy:</strong> {typeof booking.car === 'string' ? 'See vehicle details' : booking.car?.fuelPolicy || 'Not specified'}</p>
                <p><strong>Demo payment reference:</strong> {demoReceipt || booking.transactionRef || 'Not recorded'}</p>
                <hr />
                <p>Base rent: PKR {(booking.priceBreakdown?.baseRentPkr || 0).toLocaleString('en-PK')}</p>
                <p>Driver allowance: PKR {(booking.priceBreakdown?.driverAllowancePkr || 0).toLocaleString('en-PK')}</p>
                <p>Inter-city surcharge: PKR {(booking.priceBreakdown?.outOfCitySurchargePkr || 0).toLocaleString('en-PK')}</p>
                <p>Security deposit: PKR {(booking.priceBreakdown?.securityDepositPkr || 0).toLocaleString('en-PK')}</p>
                <strong>Total: PKR {(booking.priceBreakdown?.totalPayablePkr || booking.price || 0).toLocaleString('en-PK')}</strong>
                <p>This payment is simulated for an FYP demonstration. No money was transferred.</p>
                <Button variant="outlined" onClick={() => window.print()}>View / Print Rental Summary</Button>
              </section>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default CheckoutStatus
