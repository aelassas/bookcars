import React, { useEffect, useMemo, useState } from 'react'
import {
  FormControl,
  FormControlLabel,
  Switch,
} from '@mui/material'
import {
  EventSeat as BookingIcon,
} from '@mui/icons-material'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import { strings as dsStrings } from '@/lang/dresses'
import { strings } from '@/lang/checkout'
import * as helper from '@/common/helper'
import * as PaymentService from '@/services/PaymentService'

import '@/assets/css/checkout-options.css'

interface CheckoutOptionsProps {
  dress: bookcarsTypes.Dress
  from: Date
  to: Date
  language: string
  clientSecret: string | null
  payPalLoaded: boolean
  onPriceChange: (value: number) => void
  onCancellationChange: (value: boolean) => void
  onAmendmentsChange: (value: boolean) => void
}

const CheckoutOptions = ({
  dress,
  from,
  to,
  language,
  clientSecret,
  payPalLoaded,
  onPriceChange,
  onCancellationChange,
  onAmendmentsChange,
}: CheckoutOptionsProps) => {
  const days = useMemo(() => {
    if (from && to) {
      return bookcarsHelper.days(from, to)
    }
    return 0
  }, [from, to])
  const [cancellation, setCancellation] = useState(false)
  const [amendments, setAmendments] = useState(false)

  const [cancellationOption, setCancellationOption] = useState('')
  const [amendmentsOption, setAmendmentsOption] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPrices = async () => {
      const priceChangeRate = dress.supplier.priceChangeRate || 0
      setCancellationOption(await helper.getCancellationOption(dress.cancellation, language, priceChangeRate))
      setAmendmentsOption(await helper.getAmendmentsOption(dress.amendments, language, priceChangeRate))
      setLoading(false)
    }

    fetchPrices()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return null
  }

  const handleCancellationChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (dress && from && to) {
      const _cancellation = e.target.checked
      const options: bookcarsTypes.DressOptions = {
        cancellation: _cancellation,
        amendments,
      }
      const _price = await PaymentService.convertPrice(bookcarsHelper.calculateTotalPrice(dress, from, to, dress.supplier.priceChangeRate || 0, options))

      setCancellation(_cancellation)
      onCancellationChange(_cancellation)
      onPriceChange(_price)
    }
  }

  const handleAmendmentsChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (dress && from && to) {
      const _amendments = e.target.checked
      const options: bookcarsTypes.DressOptions = {
        cancellation,
        amendments: _amendments,
      }
      const _price = await PaymentService.convertPrice(bookcarsHelper.calculateTotalPrice(dress, from, to, dress.supplier.priceChangeRate || 0, options))

      setAmendments(_amendments)
      onAmendmentsChange(_amendments)
      onPriceChange(_price)
    }
  }



  return (
    <div className="checkout-options-container">
      <div className="checkout-info">
        <BookingIcon />
        <span>{strings.BOOKING_OPTIONS}</span>
      </div>
      <div className="checkout-options">
        <FormControl fullWidth margin="dense">
          <FormControlLabel
            disabled={dress.cancellation === -1 || dress.cancellation === 0 || !!clientSecret || payPalLoaded}
            control={<Switch checked={cancellation} onChange={handleCancellationChange} color="primary" />}
            label={(
              <span>
                <span className="checkout-option-label">{dsStrings.CANCELLATION}</span>
                <span className="checkout-option-value">{cancellationOption}</span>
              </span>
            )}
          />
        </FormControl>

        <FormControl fullWidth margin="dense">
          <FormControlLabel
            disabled={dress.amendments === -1 || dress.amendments === 0 || !!clientSecret || payPalLoaded}
            control={<Switch checked={amendments} onChange={handleAmendmentsChange} color="primary" />}
            label={(
              <span>
                <span className="checkout-option-label">{dsStrings.AMENDMENTS}</span>
                <span className="checkout-option-value">{amendmentsOption}</span>
              </span>
            )}
          />
        </FormControl>
      </div>
    </div>
  )
}

export default CheckoutOptions
