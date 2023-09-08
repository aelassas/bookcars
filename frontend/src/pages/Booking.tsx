import React, { useState } from 'react'
import { strings as commonStrings } from '../lang/common'
import { strings as blStrings } from '../lang/booking-list'
import { strings as bfStrings } from '../lang/booking-filter'
import { strings as csStrings } from '../lang/cars'
import * as Helper from '../common/Helper'
import Master from '../components/Master'
import * as UserService from '../services/UserService'
import * as BookingService from '../services/BookingService'
import * as CarService from '../services/CarService'
import Backdrop from '../components/SimpleBackdrop'
import NoMatch from './NoMatch'
import Error from './Error'
import CarList from '../components/CarList'
import SupplierSelectList from '../components/SupplierSelectList'
import LocationSelectList from '../components/LocationSelectList'
import CarSelectList from '../components/CarSelectList'
import StatusList from '../components/StatusList'
import DateTimePicker from '../components/DateTimePicker'
import {
  FormControl, FormControlLabel,
  Switch,
  Button
} from '@mui/material'
import { Info as InfoIcon } from '@mui/icons-material'
import * as bookcarsTypes from 'bookcars-types'
import * as bookcarsHelper from 'bookcars-helper'

import '../assets/css/booking.css'

const Booking = () => {
  const [loading, setLoading] = useState(false)
  const [noMatch, setNoMatch] = useState(false)
  const [error, setError] = useState(false)
  const [booking, setBooking] = useState<bookcarsTypes.Booking>()
  const [visible, setVisible] = useState(false)
  const [company, setCompany] = useState<bookcarsTypes.Option>()
  const [car, setCar] = useState<bookcarsTypes.Car>()
  const [price, setPrice] = useState<number>()
  const [driver, setDriver] = useState<bookcarsTypes.Option>()
  const [pickupLocation, setPickupLocation] = useState<bookcarsTypes.Option>()
  const [dropOffLocation, setDropOffLocation] = useState<bookcarsTypes.Option>()
  const [from, setFrom] = useState<Date>()
  const [to, setTo] = useState<Date>()
  const [status, setStatus] = useState<bookcarsTypes.BookingStatus>()
  const [cancellation, setCancellation] = useState(false)
  const [amendments, setAmendments] = useState(false)
  const [theftProtection, setTheftProtection] = useState(false)
  const [collisionDamageWaiver, setCollisionDamageWaiver] = useState(false)
  const [fullInsurance, setFullInsurance] = useState(false)
  const [additionalDriver, setAdditionalDriver] = useState(false)
  const [minDate, setMinDate] = useState<Date>()
  const edit = false

  const handleCompanyChange = (values: bookcarsTypes.Option[]) => {
    setCompany(values.length > 0 ? values[0] : undefined)
  }

  const handlePickupLocationChange = (values: bookcarsTypes.Option[]) => {
    setPickupLocation(values.length > 0 ? values[0] : undefined)
  }

  const handleDropOffLocationChange = (values: bookcarsTypes.Option[]) => {
    setDropOffLocation(values.length > 0 ? values[0] : undefined)
  }

  const handleCarSelectListChange = async (values: bookcarsTypes.Car[]) => {
    try {
      const newCar = values.length > 0 ? values[0] : undefined

      if ((!car && newCar) || (car && newCar && car._id !== newCar._id)) {
        // car changed
        const car = await CarService.getCar(newCar._id)

        if (car && from && to) {
          const _booking = bookcarsHelper.clone(booking)
          _booking.car = car
          const price = Helper.price(car, from, to, _booking)

          setBooking(_booking)
          setPrice(price)
          setCar(newCar)
        } else {
          Helper.error()
        }
      } else if (!newCar) {
        setPrice(0)
        setCar(newCar)
      } else {
        setCar(newCar)
      }
    } catch (err) {
      Helper.error(err)
    }
  }

  const handleStatusChange = (value: bookcarsTypes.BookingStatus) => {
    setStatus(value)
  }

  const handleCancellationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (booking && booking.car) {
      booking.cancellation = e.target.checked

      const price = Helper.price(
        booking.car as bookcarsTypes.Car,
        new Date(booking.from),
        new Date(booking.to),
        booking as bookcarsTypes.CarOptions
      )
      setBooking(booking)
      setPrice(price)
      setCancellation(booking.cancellation)
    }
  }

  const handleAmendmentsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (booking && booking.car) {
      booking.amendments = e.target.checked

      const price = Helper.price(
        booking.car as bookcarsTypes.Car,
        new Date(booking.from),
        new Date(booking.to),
        booking as bookcarsTypes.CarOptions
      )
      setBooking(booking)
      setPrice(price)
      setAmendments(booking.amendments)
    }
  }

  const handleCollisionDamageWaiverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (booking && booking.car) {
      booking.collisionDamageWaiver = e.target.checked

      const price = Helper.price(
        booking.car as bookcarsTypes.Car,
        new Date(booking.from),
        new Date(booking.to),
        booking as bookcarsTypes.CarOptions
      )
      setBooking(booking)
      setPrice(price)
      setCollisionDamageWaiver(booking.collisionDamageWaiver)
    }
  }

  const handleTheftProtectionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (booking && booking.car) {
      booking.theftProtection = e.target.checked

      const price = Helper.price(
        booking.car as bookcarsTypes.Car,
        new Date(booking.from),
        new Date(booking.to),
        booking as bookcarsTypes.CarOptions
      )
      setBooking(booking)
      setPrice(price)
      setTheftProtection(booking.theftProtection)
    }
  }

  const handleFullInsuranceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (booking && booking.car) {
      booking.fullInsurance = e.target.checked

      const price = Helper.price(
        booking.car as bookcarsTypes.Car,
        new Date(booking.from),
        new Date(booking.to),
        booking as bookcarsTypes.CarOptions
      )
      setBooking(booking)
      setPrice(price)
      setFullInsurance(booking.fullInsurance)
    }
  }

  const handleAdditionalDriverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (booking && booking.car) {
      booking.additionalDriver = e.target.checked

      const price = Helper.price(
        booking.car as bookcarsTypes.Car,
        new Date(booking.from),
        new Date(booking.to),
        booking as bookcarsTypes.CarOptions
      )
      setBooking(booking)
      setPrice(price)
      setAdditionalDriver(booking.additionalDriver)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    try {
      e.preventDefault()

      if (!booking || !company || !car || !driver || !pickupLocation || !dropOffLocation || !from || !to || !status) {
        Helper.error()
        return
      }

      const _booking: bookcarsTypes.Booking = {
        _id: booking._id,
        company: company._id,
        car: car._id,
        driver: driver._id,
        pickupLocation: pickupLocation._id,
        dropOffLocation: dropOffLocation._id,
        from,
        to,
        status,
        cancellation,
        amendments,
        theftProtection,
        collisionDamageWaiver,
        fullInsurance,
        price
      }

      const payload = { booking: _booking }
      const _status = await BookingService.update(payload)

      if (_status === 200) {
        Helper.info(commonStrings.UPDATED)
      } else {
        Helper.error()
      }
    } catch (err) {
      Helper.error(err)
    }
  }

  const onLoad = async () => {
    setLoading(true)

    const params = new URLSearchParams(window.location.search)
    if (params.has('b')) {
      const id = params.get('b')
      if (id && id !== '') {
        try {
          const booking = await BookingService.getBooking(id)
          if (booking) {
            setBooking(booking)
            setPrice(booking.price)
            setLoading(false)
            setVisible(true)
            const cmp = booking.company as bookcarsTypes.User
            setCompany({
              _id: cmp._id as string,
              name: cmp.fullName,
              image: cmp.avatar,
            })
            setCar(booking.car as bookcarsTypes.Car)
            const drv = booking.driver as bookcarsTypes.User
            setDriver({
              _id: drv._id as string,
              name: drv.fullName,
              image: drv.avatar,
            })
            const pul = booking.pickupLocation as bookcarsTypes.Location
            setPickupLocation({
              _id: pul._id,
              name: pul.name || '',
            })
            const dol = booking.dropOffLocation as bookcarsTypes.Location
            setDropOffLocation({
              _id: dol._id,
              name: dol.name || '',
            })
            setFrom(new Date(booking.from))
            setMinDate(new Date(booking.from))
            setTo(new Date(booking.to))
            setStatus(booking.status)
            setCancellation(booking.cancellation || false)
            setAmendments(booking.amendments || false)
            setTheftProtection(booking.theftProtection || false)
            setCollisionDamageWaiver(booking.collisionDamageWaiver || false)
            setFullInsurance(booking.fullInsurance || false)
            setAdditionalDriver((booking.additionalDriver && !!booking._additionalDriver) || false)
          } else {
            setLoading(false)
            setNoMatch(true)
          }
        } catch (err) {
          setLoading(false)
          setError(true)
          setVisible(false)
        }
      } else {
        setLoading(false)
        setNoMatch(true)
      }
    } else {
      setLoading(false)
      setNoMatch(true)
    }
  }

  const days = bookcarsHelper.days(from, to)

  return (
    <Master onLoad={onLoad} strict>
      {visible && booking && (
        <div className="booking">
          <div className="col-1">
            <form onSubmit={handleSubmit}>
              <FormControl fullWidth margin="dense">
                <SupplierSelectList
                  label={blStrings.COMPANY}
                  required
                  variant="standard"
                  onChange={handleCompanyChange}
                  value={company}
                  readOnly={!edit}
                />
              </FormControl>

              <FormControl fullWidth margin="dense">
                <LocationSelectList
                  label={bfStrings.PICKUP_LOCATION}
                  required
                  variant="standard"
                  onChange={handlePickupLocationChange}
                  value={pickupLocation}
                  init
                  readOnly={!edit}
                />
              </FormControl>

              <FormControl fullWidth margin="dense">
                <LocationSelectList
                  label={bfStrings.DROP_OFF_LOCATION}
                  required
                  variant="standard"
                  onChange={handleDropOffLocationChange}
                  value={dropOffLocation}
                  init
                  readOnly={!edit}
                />
              </FormControl>

              <CarSelectList
                label={blStrings.CAR}
                company={(company && company._id) || ''}
                pickupLocation={(pickupLocation && pickupLocation._id) || ''}
                onChange={handleCarSelectListChange}
                required
                value={car}
                readOnly={!edit}
              />

              <FormControl fullWidth margin="dense">
                <DateTimePicker
                  label={commonStrings.FROM}
                  value={from}
                  required
                  readOnly={!edit}
                  onChange={(from) => {
                    if (from) {
                      booking.from = from

                      const price = Helper.price(
                        booking.car as bookcarsTypes.Car,
                        new Date(booking.from),
                        new Date(booking.to),
                        booking as bookcarsTypes.CarOptions
                      )
                      booking.price = price
                      setBooking(booking)
                      setPrice(price)
                      setFrom(from)
                      setMinDate(from)
                    }
                  }}
                  language={UserService.getLanguage()}
                />
              </FormControl>
              <FormControl fullWidth margin="dense">
                <DateTimePicker
                  label={commonStrings.TO}
                  value={to}
                  minDate={minDate}
                  required
                  readOnly={!edit}
                  onChange={(to) => {
                    if (to) {
                      booking.to = to

                      const price = Helper.price(
                        booking.car as bookcarsTypes.Car,
                        new Date(booking.from),
                        new Date(booking.to),
                        booking as bookcarsTypes.CarOptions
                      )
                      booking.price = price
                      setBooking(booking)
                      setPrice(price)
                      setTo(to)
                    }
                  }}
                  language={UserService.getLanguage()}
                />
              </FormControl>

              <FormControl fullWidth margin="dense">
                <StatusList label={blStrings.STATUS} onChange={handleStatusChange} required disabled value={status} />
              </FormControl>

              <div className="info">
                <InfoIcon />
                <label>{commonStrings.OPTIONAL}</label>
              </div>

              <FormControl fullWidth margin="dense" className="checkbox-fc">
                <FormControlLabel
                  disabled={!edit || (booking.car as bookcarsTypes.Car).cancellation === -1 || (booking.car as bookcarsTypes.Car).cancellation === 0}
                  control={<Switch checked={cancellation} onChange={handleCancellationChange} color="primary" />}
                  label={csStrings.CANCELLATION}
                  className="checkbox-fcl"
                />
              </FormControl>

              <FormControl fullWidth margin="dense" className="checkbox-fc">
                <FormControlLabel
                  disabled={!edit || (booking.car as bookcarsTypes.Car).amendments === -1 || (booking.car as bookcarsTypes.Car).amendments === 0}
                  control={<Switch checked={amendments} onChange={handleAmendmentsChange} color="primary" />}
                  label={csStrings.AMENDMENTS}
                  className="checkbox-fcl"
                />
              </FormControl>

              <FormControl fullWidth margin="dense" className="checkbox-fc">
                <FormControlLabel
                  disabled={!edit || (booking.car as bookcarsTypes.Car).collisionDamageWaiver === -1 || (booking.car as bookcarsTypes.Car).collisionDamageWaiver === 0}
                  control={<Switch checked={collisionDamageWaiver} onChange={handleCollisionDamageWaiverChange} color="primary" />}
                  label={csStrings.COLLISION_DAMAGE_WAVER}
                  className="checkbox-fcl"
                />
              </FormControl>

              <FormControl fullWidth margin="dense" className="checkbox-fc">
                <FormControlLabel
                  disabled={!edit || (booking.car as bookcarsTypes.Car).theftProtection === -1 || (booking.car as bookcarsTypes.Car).theftProtection === 0}
                  control={<Switch checked={theftProtection} onChange={handleTheftProtectionChange} color="primary" />}
                  label={csStrings.THEFT_PROTECTION}
                  className="checkbox-fcl"
                />
              </FormControl>

              <FormControl fullWidth margin="dense" className="checkbox-fc">
                <FormControlLabel
                  disabled={!edit || (booking.car as bookcarsTypes.Car).fullInsurance === -1 || (booking.car as bookcarsTypes.Car).fullInsurance === 0}
                  control={<Switch checked={fullInsurance} onChange={handleFullInsuranceChange} color="primary" />}
                  label={csStrings.FULL_INSURANCE}
                  className="checkbox-fcl"
                />
              </FormControl>

              <FormControl fullWidth margin="dense" className="checkbox-fc">
                <FormControlLabel
                  disabled={!edit || (booking.car as bookcarsTypes.Car).additionalDriver === -1 || (booking.car as bookcarsTypes.Car).additionalDriver === 0}
                  control={<Switch checked={additionalDriver} onChange={handleAdditionalDriverChange} color="primary" />}
                  label={csStrings.ADDITIONAL_DRIVER}
                  className="checkbox-fcl"
                />
              </FormControl>

              <div>
                {edit && (
                  <div className="booking-buttons">
                    <Button variant="contained" className="btn-primary btn-margin-bottom" size="small" type="submit">
                      {commonStrings.SAVE}
                    </Button>
                  </div>
                )}
              </div>
            </form>
          </div>
          <div className="col-2">
            <div className="col-2-header">
              <div className="price">
                <label className="price-days">{Helper.getDays(days)}</label>
                <label className="price-main">{`${bookcarsHelper.formatNumber(price)} ${commonStrings.CURRENCY}`}</label>
                <label className="price-day">{`${csStrings.PRICE_PER_DAY} ${Math.floor((price || 0) / days)} ${commonStrings.CURRENCY}`}</label>
              </div>
            </div>
            <CarList
              className="car"
              booking={booking}
              cars={[booking.car as bookcarsTypes.Car]}
              hidePrice
            />
          </div>
        </div>
      )}

      {loading && <Backdrop text={commonStrings.PLEASE_WAIT} />}
      {noMatch && <NoMatch hideHeader />}
      {error && <Error />}
    </Master>
  )
}

export default Booking
