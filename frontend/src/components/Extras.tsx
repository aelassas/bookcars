import React, { useEffect, useState } from 'react'
import { Check as CheckIcon } from '@mui/icons-material'
import * as bookcarsTypes from ':bookcars-types'
import { strings as commonStrings } from '@/lang/common'
import { strings as csStrings } from '@/lang/cars'
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
  const [collisionDamageWaiverOption, setCollisionDamageWaiverOption] = useState('')
  const [theftProtectionOption, setTheftProtectionOption] = useState('')
  const [fullInsuranceOption, setFullInsuranceOption] = useState('')
  const [additionalDriverOption, setAdditionalDriverOption] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      if (booking && days) {
        const language = UserService.getLanguage()
        const car = booking.car as bookcarsTypes.Car
        const priceChangeRate = (booking.supplier as bookcarsTypes.User).priceChangeRate || 0

        if (booking.cancellation) {
          setCancellationOption(await helper.getCancellationOption(car.cancellation, language, priceChangeRate))
        }
        if (booking.amendments) {
          setAmendmentsOption(await helper.getAmendmentsOption(car.amendments, language, priceChangeRate))
        }
        if (booking.collisionDamageWaiver) {
          setCollisionDamageWaiverOption(await helper.getCollisionDamageWaiverOption(car.collisionDamageWaiver, days, language, priceChangeRate))
        }
        if (booking.theftProtection) {
          setTheftProtectionOption(await helper.getTheftProtectionOption(car.theftProtection, days, language, priceChangeRate))
        }
        if (booking.fullInsurance) {
          setFullInsuranceOption(await helper.getFullInsuranceOption(car.fullInsurance, days, language, priceChangeRate))
        }
        if (booking.additionalDriver) {
          setAdditionalDriverOption(await helper.getAdditionalDriverOption(car.additionalDriver, days, language, priceChangeRate))
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
          <span className="extra-title">{csStrings.CANCELLATION}</span>
          <span className="extra-text">{cancellationOption}</span>
        </div>
      )}

      {booking.amendments && (
        <div className="extra">
          <CheckIcon className="extra-icon" />
          <span className="extra-title">{csStrings.AMENDMENTS}</span>
          <span className="extra-text">{amendmentsOption}</span>
        </div>
      )}

      {booking.theftProtection && (
        <div className="extra">
          <CheckIcon className="extra-icon" />
          <span className="extra-title">{csStrings.THEFT_PROTECTION}</span>
          <span className="extra-text">{theftProtectionOption}</span>
        </div>
      )}

      {booking.collisionDamageWaiver && (
        <div className="extra">
          <CheckIcon className="extra-icon" />
          <span className="extra-title">{csStrings.COLLISION_DAMAGE_WAVER}</span>
          <span className="extra-text">{collisionDamageWaiverOption}</span>
        </div>
      )}

      {booking.fullInsurance && (
        <div className="extra">
          <CheckIcon className="extra-icon" />
          <span className="extra-title">{csStrings.FULL_INSURANCE}</span>
          <span className="extra-text">{fullInsuranceOption}</span>
        </div>
      )}

      {booking.additionalDriver && (
        <div className="extra">
          <CheckIcon className="extra-icon" />
          <span className="extra-title">{csStrings.ADDITIONAL_DRIVER}</span>
          <span className="extra-text">{additionalDriverOption}</span>
        </div>
      )}
    </div>
  )
}

export default Extras
