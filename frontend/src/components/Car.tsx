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
  Verified as VerifiedIcon,
  Terrain as TerrainIcon,
} from '@mui/icons-material'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import env from '@/config/env.config'
import * as helper from '@/utils/helper'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/cars'
import Badge from '@/components/Badge'
import * as UserService from '@/services/UserService'
import * as PaymentService from '@/services/PaymentService'

import DoorsIcon from '@/assets/img/car-door.png'
import DistanceIcon from '@/assets/img/distance-icon.png'
import RatingIcon from '@/assets/img/rating-icon.png'
import CO2MinIcon from '@/assets/img/co2-min-icon.png'
import CO2MiddleIcon from '@/assets/img/co2-middle-icon.png'
import CO2MaxIcon from '@/assets/img/co2-max-icon.png'

import '@/assets/css/car.css'

interface CarProps {
  car: bookcarsTypes.Car
  rentalMode?: bookcarsTypes.RentalMode
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
  rentalMode,
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
  const [deposit, setDeposit] = useState(0)
  const [cancellation, setCancellation] = useState('')
  const [amendments, setAmendments] = useState('')
  const [theftProtection, setTheftProtection] = useState('')
  const [collisionDamageWaiver, setCollisionDamageWaiver] = useState('')
  const [fullInsurance, setFullInsurance] = useState('')
  const [additionalDriver, setAdditionalDriver] = useState('')
  const [loading, setLoading] = useState(true)
  const [imageUnavailable, setImageUnavailable] = useState(false)

  useEffect(() => {
    setLanguage(UserService.getLanguage())
  }, [])

  useEffect(() => {
    const fetchPrice = async () => {
      if (from && to) {
        const _totalPrice = await PaymentService.convertPrice(bookcarsHelper.calculateTotalPrice(car, from as Date, to as Date, car.supplier.priceChangeRate || 0))
        setTotalPrice(_totalPrice)
        setDays(bookcarsHelper.days(from, to))
      }
    }

    fetchPrice()
  }, [from, to]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const fetchDeposit = async () => {
      if (car.deposit > 0) {
        const _deposit = await PaymentService.convertPrice(car.deposit)
        setDeposit(_deposit)
      } else {
        setDeposit(0)
      }
    }

    fetchDeposit()
  }, [car.deposit])

  useEffect(() => {
    const init = async () => {
      const priceChangeRate = car.supplier.priceChangeRate || 0
      const _cancellation = (car.cancellation > -1 && (await helper.getCancellation(car.cancellation, language, priceChangeRate))) || ''
      const _amendments = (car.amendments > -1 && (await helper.getAmendments(car.amendments, language, priceChangeRate))) || ''
      const _theftProtection = (car.theftProtection > -1 && (await helper.getTheftProtection(car.theftProtection, language, priceChangeRate))) || ''
      const _collisionDamageWaiver = (car.collisionDamageWaiver > -1 && (await helper.getCollisionDamageWaiver(car.collisionDamageWaiver, language, priceChangeRate))) || ''
      const _fullInsurance = (car.fullInsurance > -1 && (await helper.getFullInsurance(car.fullInsurance, language, priceChangeRate))) || ''
      const _additionalDriver = (car.additionalDriver > -1 && (await helper.getAdditionalDriver(car.additionalDriver, language, priceChangeRate))) || ''

      setCancellation(_cancellation)
      setAmendments(_amendments)
      setTheftProtection(_theftProtection)
      setCollisionDamageWaiver(_collisionDamageWaiver)
      setFullInsurance(_fullInsurance)
      setAdditionalDriver(_additionalDriver)
      setLoading(false)

      if (!hidePrice) {
        let _totalPrice = await PaymentService.convertPrice(bookcarsHelper.calculateTotalPrice(car, from as Date, to as Date, car.supplier.priceChangeRate || 0))
        setTotalPrice(_totalPrice)
      }
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
  // Demo and newly onboarded vehicles may not have photos yet. Missing media
  // must never break the whole search results route.
  const carImage = car.image && env.CDN_CARS
    ? bookcarsHelper.joinURL(env.CDN_CARS, car.image)
    : undefined
  const supplierAvatar = car.supplier?.avatar && env.CDN_USERS
    ? bookcarsHelper.joinURL(env.CDN_USERS, car.supplier.avatar)
    : undefined

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
          <div className="car-top-badges">
            {car.available && !car.comingSoon && !car.fullyBooked && (
              <span className="car-badge badge-available">Available</span>
            )}
            {(car.selfDriveAvailable || car.withDriverAvailable) && (
              <span className={car.selfDriveAvailable ? 'car-badge badge-self-drive' : 'car-badge badge-chauffeur'}>
                {car.selfDriveAvailable ? 'Self-Drive' : 'With Driver'}
              </span>
            )}
            {car.terrainCapability === bookcarsTypes.TerrainCapability.NorthernMountains && (
              <span className="car-badge badge-hill-route">
                Hill routes
              </span>
            )}
          </div>
          {imageUnavailable || !carImage
            ? <div className="car-img-unavailable" role="img" aria-label={`${car.name} photo unavailable`}><svg aria-hidden="true" viewBox="0 0 120 72" focusable="false"><path d="m20 45 8-17c2-5 6-8 12-8h38c6 0 10 3 13 8l9 17v11H20V45Z" fill="currentColor" opacity=".16"/><path d="m30 43 7-14c1-3 3-4 6-4h36c3 0 5 1 7 4l7 14H30Z" fill="currentColor" opacity=".3"/><path d="M20 45h80v11H20z" fill="currentColor" opacity=".22"/><circle cx="38" cy="56" r="8" fill="#fff" stroke="currentColor" strokeWidth="4"/><circle cx="82" cy="56" r="8" fill="#fff" stroke="currentColor" strokeWidth="4"/></svg><span>Photo coming soon</span></div>
            : <img src={carImage} alt={car.name} className="car-img" onError={() => setImageUnavailable(true)} />}
          <div className="car-row">
            {!hideSupplier && (
              <div className="car-supplier" style={sizeAuto ? { bottom: 10 } : {}} title={car.supplier.fullName}>
                <span className="car-supplier-logo">
                  {supplierAvatar
                    ? <img src={supplierAvatar} alt={car.supplier?.fullName || 'Rental supplier'} />
                    : <span className="car-supplier-avatar-fallback" aria-hidden="true">{car.supplier?.fullName?.slice(0, 1) || 'S'}</span>}
                </span>
                <span className="car-supplier-info">{car.supplier?.fullName || 'Rental supplier'}</span>
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
        </div>
        <div className="car-info">
          <div className="car-info-header">
            <div className="name">{car.name}</div>
            <div className="sr-spec-pills">
              {car.engineCc ? <span>{car.engineCc}cc</span> : null}
              {car.terrainCapability === bookcarsTypes.TerrainCapability.NorthernMountains ? <span>Northern Capable</span> : null}
              {/4x4|suv|prado|fortuner|revo|hilux/i.test(`${car.name} ${car.type || ''}`) ? <span>4x4</span> : null}
              {car.selfDriveAvailable ? <span>Self-Drive</span> : null}
              {car.withDriverAvailable ? <span>With Driver</span> : null}
            </div>
            {(car.hubDeliveryBadge || car.interCityDeliveryBadge) && (
              <div className="sr-delivery-badge">{car.hubDeliveryBadge || car.interCityDeliveryBadge}</div>
            )}
            {!hidePrice && (
              <div className="price">
                <span className="price-days">{helper.getDays(language, days)}</span>
                <span className="price-main tabular-nums pkr-price">{bookcarsHelper.formatPrice(totalPrice, commonStrings.CURRENCY, language)}</span>
                <span className="price-day">
                  <span>{`${strings.PRICE_PER_DAY} `}</span>
                  <span className="price-day-value tabular-nums pkr-price">{bookcarsHelper.formatPrice(totalPrice / days, commonStrings.CURRENCY, language)}</span>
                </span>
                {
                  car.comingSoon ? (
                    <span className="coming-soon">{strings.COMING_SOON}</span>
                  ) : car.fullyBooked ? (
                    <span className="fully-booked">{strings.FULLY_BOOKED}</span>
                  ) : null
                }
              </div>
            )}
          </div>

          <ul className="car-info-list car-spec-chips">
            <li className="spec-chip">
              <Tooltip title={helper.getSeatsTooltip(car.seats)} placement="top">
                <div className="car-info-list-item">
                  <SeatsIcon />
                  <span className="car-info-list-text">{car.seats > 0 ? `${car.seats} Seats` : '—'}</span>
                </div>
              </Tooltip>
            </li>
            <li className="spec-chip">
              <Tooltip title={helper.getGearboxTooltip(car.gearbox)} placement="top">
                <div className="car-info-list-item">
                  <GearboxIcon />
                  <span className="car-info-list-text">{helper.getGearboxTypeShort(car.gearbox)}</span>
                </div>
              </Tooltip>
            </li>
            <li className="spec-chip">
              <Tooltip title={helper.getCarTypeTooltip(car.type)} placement="top">
                <div className="car-info-list-item">
                  <CarTypeIcon />
                  <span className="car-info-list-text">{helper.getCarTypeShort(car.type)}</span>
                </div>
              </Tooltip>
            </li>
            <li className="spec-chip">
              <Tooltip title={helper.getMileageTooltip(car.mileage, language)} placement="top">
                <div className="car-info-list-item">
                  <MileageIcon />
                  <span className="car-info-list-text">{car.mileage == null ? '—' : helper.getMileage(car.mileage, language)}</span>
                </div>
              </Tooltip>
            </li>
          </ul>
          {/* <Accordion className="accordion">
            <AccordionSummary className="accordion-summary" expandIcon={<ExpandMoreIcon />}>{strings.DETAILS}</AccordionSummary>
            <AccordionDetails> */}
          <ul className="extras-list">
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
            {car.deposit > 0 && (
              <li>
                <div className="car-info-list-item">
                  <InfoIcon className="extra-info" />
                  <span className="car-info-list-text">{`${strings.DEPOSIT}: ${bookcarsHelper.formatPrice(deposit, commonStrings.CURRENCY, language)}`}</span>
                </div>
              </li>
            )}
          </ul>
          {/* </AccordionDetails>
          </Accordion> */}

          {!hidePrice && (
            <div className="action">
              {
                car.available && !car.comingSoon && !car.fullyBooked && (
                  <Button
                    variant="contained"
                    className="btn-primary btn-book btn-margin-bottom"
                    onClick={() => {
                      navigate('/checkout', {
                        state: {
                          carId: car._id,
                          rentalMode,
                          // "All Pakistan Hubs" searches carry no id: book against the car's own hub.
                          pickupLocationId: pickupLocation || (car.locations?.[0] as unknown as string),
                          dropOffLocationId: dropOffLocation || pickupLocation || (car.locations?.[0] as unknown as string),
                          from,
                          to
                        }
                      })
                    }}
                  >
                    {strings.BOOK}
                  </Button>
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
