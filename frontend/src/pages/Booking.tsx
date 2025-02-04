import React, { useState } from 'react'
import {
  FormControl,
  FormControlLabel,
  Switch,
  Button
} from '@mui/material'
import { Info as InfoIcon } from '@mui/icons-material'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import { strings as commonStrings } from '@/lang/common'
import { strings as blStrings } from '@/lang/booking-list'
import { strings as bfStrings } from '@/lang/booking-filter'
import { strings as csStrings } from '@/lang/cars'
import env from '@/config/env.config'
import * as helper from '@/common/helper'
import Layout from '@/components/Layout'
import * as UserService from '@/services/UserService'
import * as BookingService from '@/services/BookingService'
import * as CarService from '@/services/CarService'
import * as PaymentService from '@/services/PaymentService'
import Backdrop from '@/components/SimpleBackdrop'
import NoMatch from './NoMatch'
import Error from './Error'
import CarList from '@/components/CarList'
import SupplierSelectList from '@/components/SupplierSelectList'
import LocationSelectList from '@/components/LocationSelectList'
import CarSelectList from '@/components/CarSelectList'
import StatusList from '@/components/StatusList'
import DateTimePicker from '@/components/DateTimePicker'

import '@/assets/css/booking.css'

const Booking = () => {
  const [loading, setLoading] = useState(false)
  const [noMatch, setNoMatch] = useState(false)
  const [error, setError] = useState(false)
  const [language, setLanguage] = useState(env.DEFAULT_LANGUAGE)
  const [booking, setBooking] = useState<bookcarsTypes.Booking>()
  const [visible, setVisible] = useState(false)
  const [supplier, setSupplier] = useState<bookcarsTypes.Option>()
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

  const handleSupplierChange = (values: bookcarsTypes.Option[]) => {
    setSupplier(values.length > 0 ? values[0] : undefined)
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
        const _car = await CarService.getCar(newCar._id)

        if (_car && from && to) {
          const _booking = bookcarsHelper.clone(booking)
          _booking.car = _car
          const _price = bookcarsHelper.calculateTotalPrice(_car, from, to, _booking)

          setBooking(_booking)
          setPrice(_price)
          setCar(newCar)
        } else {
          helper.error()
        }
      } else if (!newCar) {
        setPrice(0)
        setCar(newCar)
      } else {
        setCar(newCar)
      }
    } catch (err) {
      helper.error(err)
    }
  }

  const handleStatusChange = (value: bookcarsTypes.BookingStatus) => {
    setStatus(value)
  }

  const handleCancellationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (booking && booking.car) {
      const _booking = bookcarsHelper.clone(booking) as bookcarsTypes.Booking
      _booking.cancellation = e.target.checked

      const _price = bookcarsHelper.calculateTotalPrice(
        booking.car as bookcarsTypes.Car,
        new Date(booking.from),
        new Date(booking.to),
        booking as bookcarsTypes.CarOptions
      )
      setBooking(_booking)
      setPrice(_price)
      setCancellation(_booking.cancellation)
    }
  }

  const handleAmendmentsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (booking && booking.car) {
      const _booking = bookcarsHelper.clone(booking) as bookcarsTypes.Booking
      _booking.amendments = e.target.checked

      const _price = bookcarsHelper.calculateTotalPrice(
        booking.car as bookcarsTypes.Car,
        new Date(booking.from),
        new Date(booking.to),
        booking as bookcarsTypes.CarOptions
      )
      setBooking(_booking)
      setPrice(_price)
      setAmendments(_booking.amendments)
    }
  }

  const handleCollisionDamageWaiverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (booking && booking.car) {
      const _booking = bookcarsHelper.clone(booking) as bookcarsTypes.Booking
      _booking.collisionDamageWaiver = e.target.checked

      const _price = bookcarsHelper.calculateTotalPrice(
        booking.car as bookcarsTypes.Car,
        new Date(booking.from),
        new Date(booking.to),
        booking as bookcarsTypes.CarOptions
      )
      setBooking(_booking)
      setPrice(_price)
      setCollisionDamageWaiver(_booking.collisionDamageWaiver)
    }
  }

  const handleTheftProtectionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (booking && booking.car) {
      const _booking = bookcarsHelper.clone(booking) as bookcarsTypes.Booking
      _booking.theftProtection = e.target.checked

      const _price = bookcarsHelper.calculateTotalPrice(
        booking.car as bookcarsTypes.Car,
        new Date(booking.from),
        new Date(booking.to),
        booking as bookcarsTypes.CarOptions
      )
      setBooking(_booking)
      setPrice(_price)
      setTheftProtection(_booking.theftProtection)
    }
  }

  const handleFullInsuranceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (booking && booking.car) {
      const _booking = bookcarsHelper.clone(booking) as bookcarsTypes.Booking
      _booking.fullInsurance = e.target.checked

      const _price = bookcarsHelper.calculateTotalPrice(
        booking.car as bookcarsTypes.Car,
        new Date(booking.from),
        new Date(booking.to),
        booking as bookcarsTypes.CarOptions
      )
      setBooking(_booking)
      setPrice(_price)
      setFullInsurance(_booking.fullInsurance)
    }
  }

  const handleAdditionalDriverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (booking && booking.car) {
      const _booking = bookcarsHelper.clone(booking) as bookcarsTypes.Booking
      _booking.additionalDriver = e.target.checked

      const _price = bookcarsHelper.calculateTotalPrice(
        booking.car as bookcarsTypes.Car,
        new Date(booking.from),
        new Date(booking.to),
        booking as bookcarsTypes.CarOptions
      )
      setBooking(_booking)
      setPrice(_price)
      setAdditionalDriver(_booking.additionalDriver)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    try {
      e.preventDefault()

      if (!booking || !supplier || !car || !driver || !pickupLocation || !dropOffLocation || !from || !to || !status) {
        helper.error()
        return
      }

      const _booking: bookcarsTypes.Booking = {
        _id: booking._id,
        supplier: supplier._id,
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
        helper.info(commonStrings.UPDATED)
      } else {
        helper.error()
      }
    } catch (err) {
      helper.error(err)
    }
  }

  const onLoad = async () => {
    setLoading(true)
    setLanguage(UserService.getLanguage())

    const params = new URLSearchParams(window.location.search)
    if (params.has('b')) {
      const id = params.get('b')
      if (id && id !== '') {
        try {
          const _booking = await BookingService.getBooking(id)
          if (_booking) {
            setBooking(_booking)
            setPrice(await PaymentService.convertPrice(_booking.price!))
            setLoading(false)
            setVisible(true)
            const cmp = _booking.supplier as bookcarsTypes.User
            setSupplier({
              _id: cmp._id as string,
              name: cmp.fullName,
              image: cmp.avatar,
            })
            setCar(_booking.car as bookcarsTypes.Car)
            const drv = _booking.driver as bookcarsTypes.User
            setDriver({
              _id: drv._id as string,
              name: drv.fullName,
              image: drv.avatar,
            })
            const pul = _booking.pickupLocation as bookcarsTypes.Location
            setPickupLocation({
              _id: pul._id,
              name: pul.name || '',
            })
            const dol = _booking.dropOffLocation as bookcarsTypes.Location
            setDropOffLocation({
              _id: dol._id,
              name: dol.name || '',
            })
            setFrom(new Date(_booking.from))
            setMinDate(new Date(_booking.from))
            setTo(new Date(_booking.to))
            setStatus(_booking.status)
            setCancellation(_booking.cancellation || false)
            setAmendments(_booking.amendments || false)
            setTheftProtection(_booking.theftProtection || false)
            setCollisionDamageWaiver(_booking.collisionDamageWaiver || false)
            setFullInsurance(_booking.fullInsurance || false)
            setAdditionalDriver((_booking.additionalDriver && !!_booking._additionalDriver) || false)
          } else {
            setLoading(false)
            setNoMatch(true)
          }
        } catch {
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
    <Layout onLoad={onLoad} strict>
      {visible && booking && (
        <div className="booking">
          <div className="col-1">
            <form onSubmit={handleSubmit}>
              {!env.HIDE_SUPPLIERS && (
                <FormControl fullWidth margin="dense">
                  <SupplierSelectList
                    label={blStrings.SUPPLIER}
                    required
                    variant="standard"
                    onChange={handleSupplierChange}
                    value={supplier}
                    readOnly={!edit}
                  />
                </FormControl>
              )}

              <FormControl fullWidth margin="dense">
                <LocationSelectList
                  label={bfStrings.PICK_UP_LOCATION}
                  required
                  variant="standard"
                  onChange={handlePickupLocationChange}
                  value={pickupLocation}
                  // init
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
                  // init
                  readOnly={!edit}
                />
              </FormControl>

              <CarSelectList
                label={blStrings.CAR}
                supplier={(supplier && supplier._id) || ''}
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
                  onChange={(_from) => {
                    if (_from) {
                      const _booking = bookcarsHelper.clone(booking) as bookcarsTypes.Booking
                      _booking.from = _from

                      const _price = bookcarsHelper.calculateTotalPrice(
                        booking.car as bookcarsTypes.Car,
                        new Date(booking.from),
                        new Date(booking.to),
                        booking as bookcarsTypes.CarOptions
                      )
                      _booking.price = _price
                      setBooking(_booking)
                      setPrice(_price)
                      setFrom(_from)
                      setMinDate(_from)
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
                  onChange={(_to) => {
                    if (_to) {
                      const _booking = bookcarsHelper.clone(booking) as bookcarsTypes.Booking
                      _booking.to = _to

                      const _price = bookcarsHelper.calculateTotalPrice(
                        booking.car as bookcarsTypes.Car,
                        new Date(booking.from),
                        new Date(booking.to),
                        booking as bookcarsTypes.CarOptions
                      )
                      _booking.price = _price
                      setBooking(_booking)
                      setPrice(_price)
                      setTo(_to)
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
                <span>{commonStrings.OPTIONAL}</span>
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
                    <Button variant="contained" className="btn-primary btn-margin-bottom" type="submit">
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
                <span className="price-days">{helper.getDays(days)}</span>
                <span className="price-main">{bookcarsHelper.formatPrice(price as number, commonStrings.CURRENCY, language)}</span>
                <span className="price-day">{`${csStrings.PRICE_PER_DAY} ${bookcarsHelper.formatPrice((price as number) / days, commonStrings.CURRENCY, language)}`}</span>
              </div>
            </div>
            <CarList
              className="car"
              booking={booking}
              cars={[booking.car as bookcarsTypes.Car]}
              hidePrice
              hideSupplier={env.HIDE_SUPPLIERS}
            />
          </div>
        </div>
      )}

      {loading && <Backdrop text={commonStrings.PLEASE_WAIT} />}
      {noMatch && <NoMatch hideHeader />}
      {error && <Error />}
    </Layout>
  )
}

export default Booking
