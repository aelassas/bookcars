import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material'
import {
  LocalGasStation as CarTypeIcon,
  AccountTree as GearboxIcon,
  Person as SeatsIcon,
  AcUnit as AirconIcon,
  DirectionsCar as MileageIcon,
  Check as CheckIcon,
  Clear as UncheckIcon,
  Info as InfoIcon,
  LocationOn as LocationIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import env from '@/config/env.config'
import * as helper from '@/common/helper'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/cars'
import Badge from '@/components/Badge'
import * as UserService from '@/services/UserService'
import * as StripeService from '@/services/StripeService'

import DoorsIcon from '@/assets/img/car-door.png'
import DistanceIcon from '@/assets/img/distance-icon.png'
import RatingIcon from '@/assets/img/rating-icon.png'
import CO2MinIcon from '@/assets/img/co2-min-icon.png'
import CO2MiddleIcon from '@/assets/img/co2-middle-icon.png'
import CO2MaxIcon from '@/assets/img/co2-max-icon.png'

import '@/assets/css/car.css'

interface CarProps {
  car: bookcarsTypes.Car
  booking?: bookcarsTypes.Booking
  pickupLocation?: string
  dropOffLocation?: string
  from: Date
  to: Date
  pickupLocationName?: string
  distance?: string
  hideSupplier?: boolean
  sizeAuto?: boolean
  hidePrice?: boolean
}

const Car = ({
  car,
  booking,
  pickupLocation,
  dropOffLocation,
  from,
  to,
  pickupLocationName,
  distance,
  hideSupplier,
  sizeAuto,
  hidePrice,
}: CarProps) => {
  const navigate = useNavigate()

  const [language, setLanguage] = useState('')
  const [days, setDays] = useState(0)
  const [totalPrice, setTotalPrice] = useState(0)
  const [cancellation, setCancellation] = useState('')
  const [amendments, setAmendments] = useState('')
  const [theftProtection, setTheftProtection] = useState('')
  const [collisionDamageWaiver, setCollisionDamageWaiver] = useState('')
  const [fullInsurance, setFullInsurance] = useState('')
  const [additionalDriver, setAdditionalDriver] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLanguage(UserService.getLanguage())
  }, [])

  useEffect(() => {
    const fetchPrice = async () => {
      if (from && to) {
        const _totalPrice = await StripeService.convertPrice(bookcarsHelper.calculateTotalPrice(car, from as Date, to as Date))
        setTotalPrice(_totalPrice)
        setDays(bookcarsHelper.days(from, to))
      }
    }

    fetchPrice()
  }, [from, to]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const init = async () => {
      const _cancellation = (car.cancellation > -1 && await helper.getCancellation(car.cancellation, language)) || ''
      const _amendments = (car.amendments > -1 && await helper.getAmendments(car.amendments, language)) || ''
      const _theftProtection = (car.theftProtection > -1 && await helper.getTheftProtection(car.theftProtection, language)) || ''
      const _collisionDamageWaiver = (car.collisionDamageWaiver > -1 && await helper.getCollisionDamageWaiver(car.collisionDamageWaiver, language)) || ''
      const _fullInsurance = (car.fullInsurance > -1 && await helper.getFullInsurance(car.fullInsurance, language)) || ''
      const _additionalDriver = (car.additionalDriver > -1 && await helper.getAdditionalDriver(car.additionalDriver, language)) || ''

      setCancellation(_cancellation)
      setAmendments(_amendments)
      setTheftProtection(_theftProtection)
      setCollisionDamageWaiver(_collisionDamageWaiver)
      setFullInsurance(_fullInsurance)
      setAdditionalDriver(_additionalDriver)
      setLoading(false)

      if (!hidePrice) {
        const _totalPrice = await StripeService.convertPrice(bookcarsHelper.calculateTotalPrice(car, from as Date, to as Date))
        setTotalPrice(_totalPrice)
      }
      // console.log('init car')
    }

    init()
  }, [hidePrice]) // eslint-disable-line react-hooks/exhaustive-deps

  const getExtraIcon = (option: string, extra: number) => {
    let available = false
    if (booking) {
      if (option === 'cancellation' && booking.cancellation && extra > 0) {
        available = true
      }
      if (option === 'amendments' && booking.amendments && extra > 0) {
        available = true
      }
      if (option === 'collisionDamageWaiver' && booking.collisionDamageWaiver && extra > 0) {
        available = true
      }
      if (option === 'theftProtection' && booking.theftProtection && extra > 0) {
        available = true
      }
      if (option === 'fullInsurance' && booking.fullInsurance && extra > 0) {
        available = true
      }
      if (option === 'additionalDriver' && booking.additionalDriver && extra > 0) {
        available = true
      }
    }

    return extra === -1
      ? <UncheckIcon className="unavailable" />
      : extra === 0 || available
        ? <CheckIcon className="available" />
        : <InfoIcon className="extra-info" />
  }

  if (loading || !language || (!hidePrice && (!days || !totalPrice))) {
    return null
  }
  // console.log('car')

  const fr = language === 'fr'

  return (
    <div key={car._id} className="car-container">
      {pickupLocationName && (
        <div className="car-header">
          <div className="location">
            <LocationIcon />
            <span className="location-name">{pickupLocationName}</span>
          </div>
          {distance && (
            <div className="distance">
              <img alt="Distance" src={DistanceIcon} />
              <Badge backgroundColor="#D8EDF9" color="#000" text={`${distance} ${strings.FROM_YOU}`} />
            </div>
          )}
        </div>
      )}
      <article>
        <div className="car">
          <img src={bookcarsHelper.joinURL(env.CDN_CARS, car.image)} alt={car.name} className="car-img" />
          {!hideSupplier && (
            <div className="car-supplier" style={sizeAuto ? { bottom: 10 } : {}} title={car.supplier.fullName}>
              <span className="car-supplier-logo">
                <img src={bookcarsHelper.joinURL(env.CDN_USERS, car.supplier.avatar)} alt={car.supplier.fullName} />
              </span>
              <span className="car-supplier-info">{car.supplier.fullName}</span>
            </div>
          )}
          <div className="car-footer">
            <div className="rating">
              {car.rating && car.rating >= 1 && (
                <>
                  <span className="value">{car.rating.toFixed(2)}</span>
                  <img alt="Rating" src={RatingIcon} />
                </>
              )}
              {car.trips >= 10 && <span className="trips">{`(${car.trips} ${strings.TRIPS})`}</span>}
            </div>
            {car.co2 && (
              <div className="co2">
                <img
                  alt="CO2 Effect"
                  src={
                    car.co2 <= 90
                      ? CO2MinIcon
                      : car.co2 <= 110
                        ? CO2MiddleIcon
                        : CO2MaxIcon
                  }
                />
                <span>{strings.CO2}</span>
              </div>
            )}
          </div>
        </div>
        <div className="car-info">
          <div className="car-info-header">
            <div className="name">{car.name}</div>
            {!hidePrice && (
              <div className="price">
                <span className="price-days">{helper.getDays(days)}</span>
                <span className="price-main">{bookcarsHelper.formatPrice(totalPrice, commonStrings.CURRENCY, language)}</span>
                <span className="price-day">
                  <span>{`${strings.PRICE_PER_DAY} `}</span>
                  <span className="price-day-value">{bookcarsHelper.formatPrice(totalPrice / days, commonStrings.CURRENCY, language)}</span>
                </span>
              </div>
            )}
          </div>

          <ul className="car-info-list">
            {car.type !== bookcarsTypes.CarType.Unknown && (
              <li className="car-type">
                <Tooltip title={helper.getCarTypeTooltip(car.type)} placement="top">
                  <div className="car-info-list-item">
                    <CarTypeIcon />
                    <span className="car-info-list-text">{helper.getCarTypeShort(car.type)}</span>
                  </div>
                </Tooltip>
              </li>
            )}
            <li className="gearbox">
              <Tooltip title={helper.getGearboxTooltip(car.gearbox)} placement="top">
                <div className="car-info-list-item">
                  <GearboxIcon />
                  <span className="car-info-list-text">{helper.getGearboxTypeShort(car.gearbox)}</span>
                </div>
              </Tooltip>
            </li>
            {car.seats > 0 && (
              <li className="seats">
                <Tooltip title={helper.getSeatsTooltip(car.seats)} placement="top">
                  <div className="car-info-list-item">
                    <SeatsIcon />
                    <span className="car-info-list-text">{car.seats}</span>
                  </div>
                </Tooltip>
              </li>
            )}
            {car.doors > 0 && (
              <li className="doors">
                <Tooltip title={helper.getDoorsTooltip(car.doors)} placement="top">
                  <div className="car-info-list-item">
                    <img src={DoorsIcon} alt="" className="car-doors" />
                    <span className="car-info-list-text">{car.doors}</span>
                  </div>
                </Tooltip>
              </li>
            )}
            {car.aircon && (
              <li className="aircon">
                <Tooltip title={strings.AIRCON_TOOLTIP} placement="top">
                  <div className="car-info-list-item">
                    <AirconIcon />
                  </div>
                </Tooltip>
              </li>
            )}
          </ul>
          <Accordion className="accordion">
            <AccordionSummary className="accordion-summary" expandIcon={<ExpandMoreIcon />}>{strings.DETAILS}</AccordionSummary>
            <AccordionDetails>
              <ul className="extras-list">
                {car.mileage !== 0 && (
                  <li className="mileage">
                    <Tooltip title={helper.getMileageTooltip(car.mileage, language)} placement="left">
                      <div className="car-info-list-item">
                        <MileageIcon />
                        <span className="car-info-list-text">{`${strings.MILEAGE}${fr ? ' : ' : ': '}${helper.getMileage(car.mileage, language)}`}</span>
                      </div>
                    </Tooltip>
                  </li>
                )}
                <li className="fuel-policy">
                  <Tooltip title={helper.getFuelPolicyTooltip(car.fuelPolicy)} placement="left">
                    <div className="car-info-list-item">
                      <CarTypeIcon />
                      <span className="car-info-list-text">{`${strings.FUEL_POLICY}${fr ? ' : ' : ': '}${helper.getFuelPolicy(car.fuelPolicy)}`}</span>
                    </div>
                  </Tooltip>
                </li>
                {car.cancellation > -1 && (
                  <li>
                    <Tooltip title={booking ? '' : car.cancellation > -1 ? strings.CANCELLATION_TOOLTIP : cancellation} placement="left">
                      <div className="car-info-list-item">
                        {getExtraIcon('cancellation', car.cancellation)}
                        <span className="car-info-list-text">{cancellation}</span>
                      </div>
                    </Tooltip>
                  </li>
                )}
                {car.amendments > -1 && (
                  <li>
                    <Tooltip title={booking ? '' : car.amendments > -1 ? strings.AMENDMENTS_TOOLTIP : amendments} placement="left">
                      <div className="car-info-list-item">
                        {getExtraIcon('amendments', car.amendments)}
                        <span className="car-info-list-text">{amendments}</span>
                      </div>
                    </Tooltip>
                  </li>
                )}
                {car.theftProtection > -1 && (
                  <li>
                    <Tooltip title={booking ? '' : car.theftProtection > -1 ? strings.THEFT_PROTECTION_TOOLTIP : theftProtection} placement="left">
                      <div className="car-info-list-item">
                        {getExtraIcon('theftProtection', car.theftProtection)}
                        <span className="car-info-list-text">{theftProtection}</span>
                      </div>
                    </Tooltip>
                  </li>
                )}
                {car.collisionDamageWaiver > -1 && (
                  <li>
                    <Tooltip
                      title={booking ? '' : car.collisionDamageWaiver > -1 ? strings.COLLISION_DAMAGE_WAVER_TOOLTIP : collisionDamageWaiver}
                      placement="left"
                    >
                      <div className="car-info-list-item">
                        {getExtraIcon('collisionDamageWaiver', car.collisionDamageWaiver)}
                        <span className="car-info-list-text">{collisionDamageWaiver}</span>
                      </div>
                    </Tooltip>
                  </li>
                )}
                {car.fullInsurance > -1 && (
                  <li>
                    <Tooltip title={booking ? '' : car.fullInsurance > -1 ? strings.FULL_INSURANCE_TOOLTIP : fullInsurance} placement="left">
                      <div className="car-info-list-item">
                        {getExtraIcon('fullInsurance', car.fullInsurance)}
                        <span className="car-info-list-text">{fullInsurance}</span>
                      </div>
                    </Tooltip>
                  </li>
                )}
                {car.additionalDriver > -1 && (
                  <li>
                    <Tooltip title={booking ? '' : additionalDriver} placement="left">
                      <div className="car-info-list-item">
                        {getExtraIcon('additionalDriver', car.additionalDriver)}
                        <span className="car-info-list-text">{additionalDriver}</span>
                      </div>
                    </Tooltip>
                  </li>
                )}
              </ul>
            </AccordionDetails>
          </Accordion>

          {!hidePrice && (
            <div className="action">
              {
                car.comingSoon ? (
                  <span className="coming-soon">{strings.COMING_SOON}</span>
                ) : car.available ? (
                  <Button
                    variant="contained"
                    className="btn-primary btn-book btn-margin-bottom"
                    onClick={() => {
                      navigate('/checkout', {
                        state: {
                          carId: car._id,
                          pickupLocationId: pickupLocation,
                          dropOffLocationId: dropOffLocation,
                          from,
                          to
                        }
                      })
                    }}
                  >
                    {strings.BOOK}
                  </Button>
                ) : (
                  <span className="already-booked">{strings.ALREADY_BOOKED}</span>
                )
              }
            </div>
          )}
        </div>

      </article>
    </div>
  )
}

export default Car
