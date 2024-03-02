import React, { useState, useEffect } from 'react'
import {
  Button,
  Tooltip,
  Card,
  CardContent,
  Typography
} from '@mui/material'
import {
  LocalGasStation as FuelIcon,
  AccountTree as GearboxIcon,
  Person as SeatsIcon,
  AcUnit as AirconIcon,
  DirectionsCar as MileageIcon,
  Check as CheckIcon,
  Clear as UncheckIcon,
  Info as InfoIcon,
} from '@mui/icons-material'
import * as bookcarsTypes from 'bookcars-types'
import * as bookcarsHelper from 'bookcars-helper'
import env from '../config/env.config'
import Const from '../config/const'
import * as helper from '../common/helper'
import { strings as commonStrings } from '../lang/common'
import { strings } from '../lang/cars'
import * as CarService from '../services/CarService'
import * as UserService from '../services/UserService'
import Pager from './Pager'

import DoorsIcon from '../assets/img/car-door.png'

import '../assets/css/car-list.css'

interface CarListProps {
  from?: Date
  to?: Date
  companies?: string[]
  pickupLocation?: string
  dropOffLocation?: string
  fuel?: string[]
  gearbox?: string[]
  mileage?: string[]
  deposit?: number
  cars?: bookcarsTypes.Car[]
  reload?: boolean
  booking?: bookcarsTypes.Booking
  className?: string
  hidePrice?: boolean
  hideCompany?: boolean
  loading?: boolean
  onLoad?: bookcarsTypes.DataEvent<bookcarsTypes.Car>
}

const CarList = ({
  from,
  to,
  companies,
  pickupLocation,
  dropOffLocation,
  fuel,
  gearbox,
  mileage,
  deposit,
  cars,
  reload,
  booking,
  className,
  hidePrice,
  hideCompany,
  loading: carListLoading,
  onLoad
}: CarListProps) => {
  const [language, setLanguage] = useState(env.DEFAULT_LANGUAGE)
  const [init, setInit] = useState(true)
  const [loading, setLoading] = useState(false)
  const [fetch, setFetch] = useState(false)
  const [rows, setRows] = useState<bookcarsTypes.Car[]>([])
  const [rowCount, setRowCount] = useState(0)
  const [totalRecords, setTotalRecords] = useState(0)
  const [page, setPage] = useState(1)
  const [days, setDays] = useState(0)

  useEffect(() => {
    setLanguage(UserService.getLanguage())
  }, [])

  useEffect(() => {
    if (from && to) {
      setDays(bookcarsHelper.days(from, to))
    }
  }, [from, to])

  useEffect(() => {
    if (env.PAGINATION_MODE === Const.PAGINATION_MODE.INFINITE_SCROLL || env.isMobile()) {
      const element = document.querySelector('body')

      if (element) {
        element.onscroll = () => {
          if (fetch
            && !loading
            && window.scrollY > 0
            && window.scrollY + window.innerHeight + env.INFINITE_SCROLL_OFFSET >= document.body.scrollHeight) {
            setLoading(true)
            setPage(page + 1)
          }
        }
      }
    }
  }, [fetch, loading, page])

  const fetchData = async (
    _page: number,
    _companies?: string[],
    _pickupLocation?: string,
    _fuel?: string[],
    _gearbox?: string[],
    _mileage?: string[],
    _deposit?: number
  ) => {
    try {
      setLoading(true)
      const payload: bookcarsTypes.GetCarsPayload = {
        companies: _companies ?? [],
        pickupLocation: _pickupLocation,
        fuel: _fuel,
        gearbox: _gearbox,
        mileage: _mileage,
        deposit: _deposit,
      }

      const data = await CarService.getCars(payload, _page, env.CARS_PAGE_SIZE)

      const _data = data && data.length > 0 ? data[0] : { pageInfo: { totalRecord: 0 }, resultData: [] }
      if (!_data) {
        helper.error()
        return
      }
      const _totalRecords = Array.isArray(_data.pageInfo) && _data.pageInfo.length > 0 ? _data.pageInfo[0].totalRecords : 0

      let _rows = []
      if (env.PAGINATION_MODE === Const.PAGINATION_MODE.INFINITE_SCROLL || env.isMobile()) {
        _rows = _page === 1 ? _data.resultData : [...rows, ..._data.resultData]
      } else {
        _rows = _data.resultData
      }

      setRows(_rows)
      setRowCount((_page - 1) * env.CARS_PAGE_SIZE + _rows.length)
      setTotalRecords(_totalRecords)
      setFetch(_data.resultData.length > 0)

      if (((env.PAGINATION_MODE === Const.PAGINATION_MODE.INFINITE_SCROLL || env.isMobile()) && _page === 1) || (env.PAGINATION_MODE === Const.PAGINATION_MODE.CLASSIC && !env.isMobile())) {
        window.scrollTo(0, 0)
      }

      if (onLoad) {
        onLoad({ rows: _data.resultData, rowCount: _totalRecords })
      }
    } catch (err) {
      helper.error(err)
    } finally {
      setLoading(false)
      setInit(false)
    }
  }

  useEffect(() => {
    if (companies) {
      if (companies.length > 0) {
        fetchData(page, companies, pickupLocation, fuel, gearbox, mileage, deposit)
      } else {
        setRows([])
        setFetch(false)
        if (onLoad) {
          onLoad({ rows: [], rowCount: 0 })
        }
        setInit(false)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, companies, pickupLocation, fuel, gearbox, mileage, deposit, from, to])

  useEffect(() => {
    if (cars) {
      setRows(cars)
      setFetch(false)
      if (onLoad) {
        onLoad({ rows: cars, rowCount: cars.length })
      }
      setLoading(false)
    }
  }, [cars]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setPage(1)
  }, [companies, pickupLocation, fuel, gearbox, mileage, deposit, from, to])

  useEffect(() => {
    if (reload) {
      setPage(1)
      fetchData(1, companies, pickupLocation, fuel, gearbox, mileage, deposit)
    } // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reload, companies, pickupLocation, fuel, gearbox, mileage, deposit])

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

  const fr = language === 'fr'

  return (
    <>
      <section className={`${className ? `${className} ` : ''}car-list`}>
        {rows.length === 0
          ? !init
          && !loading
          && !carListLoading
          && (
            <Card variant="outlined" className="empty-list">
              <CardContent>
                <Typography color="textSecondary">{strings.EMPTY_LIST}</Typography>
              </CardContent>
            </Card>
          )
          : ((from && to && pickupLocation && dropOffLocation) || (hidePrice && booking))
          && rows.map((car) => (
            <article key={car._id}>
              <div className="name">
                <h2>{car.name}</h2>
              </div>
              <div className="car">
                <img src={bookcarsHelper.joinURL(env.CDN_CARS, car.image)} alt={car.name} className="car-img" />
                {!hideCompany && (
                  <div className="car-company">
                    <span className="car-company-logo">
                      <img src={bookcarsHelper.joinURL(env.CDN_USERS, car.company.avatar)} alt={car.company.fullName} />
                    </span>
                    <span className="car-company-info">{car.company.fullName}</span>
                  </div>
                )}
              </div>
              <div className="car-info">
                <ul className="car-info-list">
                  <li className="car-type">
                    <Tooltip title={helper.getCarTypeTooltip(car.type)} placement="top">
                      <div className="car-info-list-item">
                        <FuelIcon />
                        <span className="car-info-list-text">{helper.getCarTypeShort(car.type)}</span>
                      </div>
                    </Tooltip>
                  </li>
                  <li className="gearbox">
                    <Tooltip title={helper.getGearboxTooltip(car.gearbox)} placement="top">
                      <div className="car-info-list-item">
                        <GearboxIcon />
                        <span className="car-info-list-text">{helper.getGearboxTypeShort(car.gearbox)}</span>
                      </div>
                    </Tooltip>
                  </li>
                  <li className="seats">
                    <Tooltip title={helper.getSeatsTooltip(car.seats)} placement="top">
                      <div className="car-info-list-item">
                        <SeatsIcon />
                        <span className="car-info-list-text">{car.seats}</span>
                      </div>
                    </Tooltip>
                  </li>
                  <li className="doors">
                    <Tooltip title={helper.getDoorsTooltip(car.doors)} placement="top">
                      <div className="car-info-list-item">
                        <img src={DoorsIcon} alt="" className="car-doors" />
                        <span className="car-info-list-text">{car.doors}</span>
                      </div>
                    </Tooltip>
                  </li>
                  {car.aircon && (
                    <li className="aircon">
                      <Tooltip title={strings.AIRCON_TOOLTIP} placement="top">
                        <div className="car-info-list-item">
                          <AirconIcon />
                        </div>
                      </Tooltip>
                    </li>
                  )}
                  <li className="mileage">
                    <Tooltip title={helper.getMileageTooltip(car.mileage, fr)} placement="left">
                      <div className="car-info-list-item">
                        <MileageIcon />
                        <span className="car-info-list-text">{`${strings.MILEAGE}${fr ? ' : ' : ': '}${helper.getMileage(car.mileage)}`}</span>
                      </div>
                    </Tooltip>
                  </li>
                  <li className="fuel-policy">
                    <Tooltip title={helper.getFuelPolicyTooltip(car.fuelPolicy)} placement="left">
                      <div className="car-info-list-item">
                        <FuelIcon />
                        <span className="car-info-list-text">{`${strings.FUEL_POLICY}${fr ? ' : ' : ': '}${helper.getFuelPolicy(car.fuelPolicy)}`}</span>
                      </div>
                    </Tooltip>
                  </li>
                </ul>

                <ul className="extras-list">
                  <li>
                    <Tooltip title={booking ? '' : car.cancellation > -1 ? strings.CANCELLATION_TOOLTIP : helper.getCancellation(car.cancellation, fr)} placement="left">
                      <div className="car-info-list-item">
                        {getExtraIcon('cancellation', car.cancellation)}
                        <span className="car-info-list-text">{helper.getCancellation(car.cancellation, fr)}</span>
                      </div>
                    </Tooltip>
                  </li>
                  <li>
                    <Tooltip title={booking ? '' : car.amendments > -1 ? strings.AMENDMENTS_TOOLTIP : helper.getAmendments(car.amendments, fr)} placement="left">
                      <div className="car-info-list-item">
                        {getExtraIcon('amendments', car.amendments)}
                        <span className="car-info-list-text">{helper.getAmendments(car.amendments, fr)}</span>
                      </div>
                    </Tooltip>
                  </li>
                  <li>
                    <Tooltip
                      title={booking ? '' : car.collisionDamageWaiver > -1 ? strings.COLLISION_DAMAGE_WAVER_TOOLTIP : helper.getCollisionDamageWaiver(car.collisionDamageWaiver, fr)}
                      placement="left"
                    >
                      <div className="car-info-list-item">
                        {getExtraIcon('collisionDamageWaiver', car.collisionDamageWaiver)}
                        <span className="car-info-list-text">{helper.getCollisionDamageWaiver(car.collisionDamageWaiver, fr)}</span>
                      </div>
                    </Tooltip>
                  </li>
                  <li>
                    <Tooltip title={booking ? '' : car.theftProtection > -1 ? strings.THEFT_PROTECTION_TOOLTIP : helper.getTheftProtection(car.theftProtection, fr)} placement="left">
                      <div className="car-info-list-item">
                        {getExtraIcon('theftProtection', car.theftProtection)}
                        <span className="car-info-list-text">{helper.getTheftProtection(car.theftProtection, fr)}</span>
                      </div>
                    </Tooltip>
                  </li>
                  <li>
                    <Tooltip title={booking ? '' : car.fullInsurance > -1 ? strings.FULL_INSURANCE_TOOLTIP : helper.getFullInsurance(car.fullInsurance, fr)} placement="left">
                      <div className="car-info-list-item">
                        {getExtraIcon('fullInsurance', car.fullInsurance)}
                        <span className="car-info-list-text">{helper.getFullInsurance(car.fullInsurance, fr)}</span>
                      </div>
                    </Tooltip>
                  </li>
                  <li>
                    <Tooltip title={booking ? '' : helper.getAdditionalDriver(car.additionalDriver, fr)} placement="left">
                      <div className="car-info-list-item">
                        {getExtraIcon('additionalDriver', car.additionalDriver)}
                        <span className="car-info-list-text">{helper.getAdditionalDriver(car.additionalDriver, fr)}</span>
                      </div>
                    </Tooltip>
                  </li>
                </ul>
              </div>

              {!hidePrice && (
                <div className="price">
                  <span className="price-days">{helper.getDays(days)}</span>
                  <span className="price-main">{`${bookcarsHelper.formatNumber(helper.price(car, from as Date, to as Date))} ${commonStrings.CURRENCY}`}</span>
                  <span className="price-day">{`${strings.PRICE_PER_DAY} ${car.price} ${commonStrings.CURRENCY}`}</span>
                </div>
              )}
              {!hidePrice && (
                <div className="action">
                  <Button
                    type="submit"
                    variant="contained"
                    className="btn-book btn-margin-bottom"
                    href={`/checkout?c=${car._id}&p=${pickupLocation}&d=${dropOffLocation}&f=${(from as Date).getTime()}&t=${(to as Date).getTime()}`}
                  >
                    {strings.BOOK}
                  </Button>
                </div>
              )}

            </article>
          ))}
      </section>
      {env.PAGINATION_MODE === Const.PAGINATION_MODE.CLASSIC && !env.isMobile() && (
        <Pager page={page} pageSize={env.CARS_PAGE_SIZE} rowCount={rowCount} totalRecords={totalRecords} onNext={() => setPage(page + 1)} onPrevious={() => setPage(page - 1)} />
      )}
    </>
  )
}

export default CarList
