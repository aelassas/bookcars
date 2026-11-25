import React, { useState, useEffect } from 'react'
import { addDays, format } from 'date-fns'
import {
  Card,
  CardContent,
  Typography
} from '@mui/material'
import * as bookcarsTypes from ':bookcars-types'
import Const from '@/config/const'
import env from '@/config/env.config'
import * as helper from '@/utils/helper'
import { strings } from '@/lang/cars'
import * as CarService from '@/services/CarService'
import Pager from '@/components/Pager'
import Car from '@/components/Car'
import Progress from '@/components/Progress'

import '@/assets/css/car-list.css'

interface CarListProps {
  from?: Date
  to?: Date
  suppliers?: string[]
  pickupLocation?: string
  pickupCoordinates?: { latitude: number; longitude: number }
  dropOffLocation?: string
  pickupLocationName?: string
  carSpecs?: bookcarsTypes.CarSpecs
  carType?: string[]
  gearbox?: string[]
  mileage?: string[]
  fuelPolicy?: string[]
  deposit?: number
  cars?: bookcarsTypes.Car[]
  reload?: boolean
  booking?: bookcarsTypes.Booking
  className?: string
  hidePrice?: boolean
  hideSupplier?: boolean
  loading?: boolean
  sizeAuto?: boolean
  ranges?: string[]
  multimedia?: string[]
  rating?: number
  seats?: number
  distance?: string
  includeAlreadyBookedCars?: boolean
  includeComingSoonCars?: boolean
  onLoad?: bookcarsTypes.DataEvent<bookcarsTypes.Car>
  onDateChange?: (newFrom: Date, newTo: Date) => void
  rentalMode?: bookcarsTypes.RentalMode
  nearbyHubs?: bookcarsTypes.Location[]
  onHubChange?: (hub: bookcarsTypes.Location) => void
}

const CarList = ({
  from,
  to,
  suppliers,
  pickupLocation,
  pickupCoordinates,
  dropOffLocation,
  pickupLocationName,
  carSpecs,
  carType: _carType,
  gearbox,
  mileage,
  fuelPolicy,
  deposit,
  cars,
  reload,
  booking,
  className,
  hidePrice,
  hideSupplier,
  loading: carListLoading,
  sizeAuto,
  ranges,
  multimedia,
  rating,
  seats,
  distance,
  includeAlreadyBookedCars,
  includeComingSoonCars,
  onLoad,
  onDateChange,
  rentalMode,
  nearbyHubs = [],
  onHubChange,
}: CarListProps) => {
  const [init, setInit] = useState(true)
  const [loading, setLoading] = useState(false)
  const [fetch, setFetch] = useState(false)
  const [rows, setRows] = useState<bookcarsTypes.Car[]>([])
  const [rowCount, setRowCount] = useState(0)
  const [totalRecords, setTotalRecords] = useState(0)
  const [page, setPage] = useState(1)

  useEffect(() => {
    if (env.PAGINATION_MODE === Const.PAGINATION_MODE.INFINITE_SCROLL || env.isMobile) {
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
    _suppliers?: string[],
    _pickupLocation?: string,
    _carSpecs?: bookcarsTypes.CarSpecs,
    __carType?: string[],
    _gearbox?: string[],
    _mileage?: string[],
    _fuelPolicy?: string[],
    _deposit?: number,
    _ranges?: string[],
    _multimedia?: string[],
    _rating?: number,
    _seats?: number,
  ) => {
    try {
      setLoading(true)

      const payload: bookcarsTypes.GetCarsPayload = {
        suppliers: _suppliers ?? [],
        rentalMode,
        pickupLocation: _pickupLocation,
        pickupLatitude: pickupCoordinates?.latitude,
        pickupLongitude: pickupCoordinates?.longitude,
        carSpecs: _carSpecs,
        carType: __carType,
        gearbox: _gearbox,
        mileage: _mileage,
        fuelPolicy: _fuelPolicy,
        deposit: _deposit,
        ranges: _ranges,
        multimedia: _multimedia,
        rating: _rating,
        seats: _seats,
        from,
        to,
        includeAlreadyBookedCars,
        includeComingSoonCars,
      }

      const data = await CarService.getCars(payload, _page, env.CARS_PAGE_SIZE)

      const _data = data && data.length > 0 ? data[0] : { pageInfo: { totalRecord: 0 }, resultData: [] }
      if (!_data) {
        helper.error()
        return
      }
      const _totalRecords = Array.isArray(_data.pageInfo) && _data.pageInfo.length > 0 ? _data.pageInfo[0].totalRecords : 0

      let _rows = []
      if (env.PAGINATION_MODE === Const.PAGINATION_MODE.INFINITE_SCROLL || env.isMobile) {
        _rows = _page === 1 ? _data.resultData : [...rows, ..._data.resultData]
      } else {
        _rows = _data.resultData
      }

      setRows(_rows)
      setRowCount((_page - 1) * env.CARS_PAGE_SIZE + _rows.length)
      setTotalRecords(_totalRecords)
      setFetch(_data.resultData.length > 0)

      if (((env.PAGINATION_MODE === Const.PAGINATION_MODE.INFINITE_SCROLL || env.isMobile) && _page === 1) || (env.PAGINATION_MODE === Const.PAGINATION_MODE.CLASSIC && !env.isMobile)) {
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
    if (suppliers) {
      if (suppliers.length > 0) {
        fetchData(page, suppliers, pickupLocation, carSpecs, _carType, gearbox, mileage, fuelPolicy, deposit, ranges, multimedia, rating, seats)
      } else {
        setRows([])
        setFetch(false)
        if (onLoad) {
          onLoad({ rows: [], rowCount: 0 })
        }
        setInit(false)
      }
    }
  }, [page, suppliers, pickupLocation, pickupCoordinates, carSpecs, _carType, gearbox, mileage, fuelPolicy, deposit, ranges, multimedia, rating, seats, from, to]) // eslint-disable-line react-hooks/exhaustive-deps

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
  }, [suppliers, pickupLocation, pickupCoordinates, carSpecs, _carType, gearbox, mileage, fuelPolicy, deposit, ranges, multimedia, rating, seats, from, to])

  useEffect(() => {
    if (reload) {
      setPage(1)
      fetchData(1, suppliers, pickupLocation, carSpecs, _carType, gearbox, mileage, fuelPolicy, deposit, ranges, multimedia, rating, seats)
    }
  }, [reload, suppliers, pickupLocation, pickupCoordinates, carSpecs, _carType, gearbox, mileage, fuelPolicy, deposit, ranges, multimedia, rating, seats]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <section className={`${className ? `${className} ` : ''}car-list`}>
        {rows.length === 0
          ? !init
          && !loading
          && !carListLoading
          && (
            <div className="zero-result-recovery-card">
              <div className="recovery-header">
                <span className="recovery-badge">No direct matches for selected dates</span>
                <h3 className="recovery-title">No vehicles match this search</h3>
                <p className="recovery-subtitle">
                  Try different dates, adjust your filters, or search another pickup location.
                </p>
              </div>
              <div className="recovery-actions">
                {from && to && onDateChange && (
                  <div className="recovery-section">
                    <div className="recovery-section-title">Try another date</div>
                    <div className="recovery-chips">
                      {[1, 3, 7].map((offset) => {
                        const start = addDays(from, offset)
                        const end = addDays(to, offset)
                        return (
                          <button type="button" key={offset} className="recovery-chip date-chip" onClick={() => onDateChange(start, end)}>
                            {format(start, 'd MMM')} – {format(end, 'd MMM')}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
                {onHubChange && nearbyHubs.length > 0 && (
                  <div className="recovery-section">
                    <div className="recovery-section-title">Nearby pickup locations</div>
                    <div className="recovery-chips">
                      {nearbyHubs.map((hub) => (
                        <button key={hub._id} type="button" className="recovery-chip hub-chip" onClick={() => onHubChange(hub)}>
                          {hub.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
          : ((from && to) || hidePrice) // || (hidePrice && booking))
          && (
            <>
              {totalRecords > 0 && (
                <div className="title">
                  <div className="bookcars">
                    <span>{strings.TITLE_1}</span>
                    <span className="title-bookcars">{env.WEBSITE_NAME}</span>
                    <span>{strings.TITLE_2}</span>
                  </div>
                  <div className="car-count">
                    {`(${totalRecords} ${totalRecords === 1 ? strings.TITLE_CAR_AVAILABLE : strings.TITLE_CARS_AVAILABLE})`}
                  </div>
                </div>
              )}

              {rows.map((car) => (
                <Car
                  key={car._id}
                  car={car}
                  booking={booking}
                  rentalMode={rentalMode}
                  pickupLocation={pickupLocation}
                  dropOffLocation={dropOffLocation}
                  from={from as Date}
                  to={to as Date}
                  pickupLocationName={pickupLocationName}
                  distance={distance}
                  hideSupplier={hideSupplier}
                  sizeAuto={sizeAuto}
                  hidePrice={hidePrice}
                />
              ))}
            </>
          )}
        {loading && <Progress />}
      </section>
      {env.PAGINATION_MODE === Const.PAGINATION_MODE.CLASSIC && !env.isMobile && (
        <Pager page={page} pageSize={env.CARS_PAGE_SIZE} rowCount={rowCount} totalRecords={totalRecords} onNext={() => setPage(page + 1)} onPrevious={() => setPage(page - 1)} />
      )}
    </>
  )
}

export default CarList
