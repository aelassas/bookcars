import React, { useEffect, useState } from 'react'
import { Check as CheckIcon } from '@mui/icons-material'
import * as bookcarsTypes from ':bookcars-types'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/dresses'
import * as helper from '@/common/helper'
import * as UserService from '@/services/UserService'

import '@/assets/css/extras.css'

interface ExtrasProps {
  booking: bookcarsTypes.Booking
  days: number
}

const Extras = ({
  booking,
  days,
}: ExtrasProps) => {
  const [cancellationOption, setCancellationOption] = useState('')
  const [amendmentsOption, setAmendmentsOption] = useState('')
  const [customizationOption, setCustomizationOption] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      if (booking && days) {
        const language = UserService.getLanguage()
        const dress = booking.dress as bookcarsTypes.Dress
        const priceChangeRate = (booking.supplier as bookcarsTypes.User).priceChangeRate || 0

        if (booking.cancellation && dress.cancellation !== undefined) {
          setCancellationOption(await helper.getCancellationOption(dress.cancellation, language, priceChangeRate))
        }
        if (booking.amendments && dress.amendments !== undefined) {
          setAmendmentsOption(await helper.getAmendmentsOption(dress.amendments, language, priceChangeRate))
        }
        if (dress.customizable) {
          setCustomizationOption(strings.CUSTOMIZABLE_TOOLTIP)
        }
        setLoading(false)
      }
    }

    init()
  }, [booking, days])

  if (loading) {
    return null
  }

  return (
    <div className="extras">
      <span className="extras-title">{commonStrings.OPTIONS}</span>
      {booking.cancellation && (
        <div className="extra">
          <CheckIcon className="extra-icon" />
          <span className="extra-title">{strings.CANCELLATION}</span>
          <span className="extra-text">{cancellationOption}</span>
        </div>
      )}

      {booking.amendments && (
        <div className="extra">
          <CheckIcon className="extra-icon" />
          <span className="extra-title">{strings.AMENDMENTS}</span>
          <span className="extra-text">{amendmentsOption}</span>
        </div>
      )}

      {customizationOption && (
        <div className="extra">
          <CheckIcon className="extra-icon" />
          <span className="extra-title">{strings.CUSTOMIZABLE}</span>
          <span className="extra-text">{customizationOption}</span>
        </div>
      )}
    </div>
  )
}

export default Extras
