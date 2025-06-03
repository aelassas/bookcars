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
import { strings as dressStrings } from '@/lang/dresses'
import env from '@/config/env.config'
import * as helper from '@/common/helper'
import Layout from '@/components/Layout'
import * as UserService from '@/services/UserService'
import * as BookingService from '@/services/BookingService'
import * as DressService from '@/services/DressService'
import * as PaymentService from '@/services/PaymentService'
import Backdrop from '@/components/SimpleBackdrop'
import NoMatch from './NoMatch'
import Error from './Error'

import SupplierSelectList from '@/components/SupplierSelectList'
import LocationSelectList from '@/components/LocationSelectList'
import DressSelectList from '@/components/DressSelectList'
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
  const [dress, setDress] = useState<bookcarsTypes.Dress>()
  const [price, setPrice] = useState<number>()
  const [driver, setDriver] = useState<bookcarsTypes.Option>()
  const [pickupLocation, setPickupLocation] = useState<bookcarsTypes.Option>()
  const [dropOffLocation, setDropOffLocation] = useState<bookcarsTypes.Option>()
  const [from, setFrom] = useState<Date>()
  const [to, setTo] = useState<Date>()
  const [status, setStatus] = useState<bookcarsTypes.BookingStatus>()
  const [cancellation, setCancellation] = useState(false)
  const [amendments, setAmendments] = useState(false)
  // Car-specific insurance state variables removed for dress rental
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

  const handleDressSelectListChange = async (values: bookcarsTypes.Option[]) => {
    try {
      const newDressOption = values.length > 0 ? values[0] : undefined

      if ((!dress && newDressOption) || (dress && newDressOption && dress._id !== newDressOption._id)) {
        // dress changed
        const _dressResponse = await DressService.getDress(newDressOption._id)

        if (_dressResponse && _dressResponse.data && from && to) {
          const _dress = _dressResponse.data
          const _booking = bookcarsHelper.clone(booking)
          _booking.dress = _dress
          const _price = bookcarsHelper.calculateTotalPrice(_dress, from, to, _booking)

          setBooking(_booking)
          setPrice(_price)
          // Convert Option back to Dress-like object for state
          setDress({
            _id: newDressOption._id,
            name: newDressOption.name || '',
            image: newDressOption.image
          } as bookcarsTypes.Dress)
        } else {
          helper.error()
        }
      } else if (!newDressOption) {
        setPrice(0)
        setDress(undefined)
      } else {
        setDress({
          _id: newDressOption._id,
          name: newDressOption.name || '',
          image: newDressOption.image
        } as bookcarsTypes.Dress)
      }
    } catch (err) {
      helper.error(err)
    }
  }

  const handleStatusChange = (value: bookcarsTypes.BookingStatus) => {
    setStatus(value)
  }

  const handleCancellationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (booking && booking.dress) {
      const _booking = bookcarsHelper.clone(booking) as bookcarsTypes.Booking
      _booking.cancellation = e.target.checked

      const _price = bookcarsHelper.calculateTotalPrice(
        booking.dress as bookcarsTypes.Dress,
        new Date(booking.from),
        new Date(booking.to),
        (booking.dress as bookcarsTypes.Dress).supplier.priceChangeRate || 0,
        booking as bookcarsTypes.DressOptions,
      )
      setBooking(_booking)
      setPrice(_price)
      setCancellation(_booking.cancellation)
    }
  }

  const handleAmendmentsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (booking && booking.dress) {
      const _booking = bookcarsHelper.clone(booking) as bookcarsTypes.Booking
      _booking.amendments = e.target.checked

      const _price = bookcarsHelper.calculateTotalPrice(
        booking.dress as bookcarsTypes.Dress,
        new Date(booking.from),
        new Date(booking.to),
        (booking.dress as bookcarsTypes.Dress).supplier.priceChangeRate || 0,
        booking as bookcarsTypes.DressOptions,
      )
      setBooking(_booking)
      setPrice(_price)
      setAmendments(_booking.amendments)
    }
  }

  // Car-specific insurance handlers removed for dress rental

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    try {
      e.preventDefault()

      if (!booking || !supplier || !dress || !driver || !pickupLocation || !dropOffLocation || !from || !to || !status) {
        helper.error()
        return
      }

      const _booking: bookcarsTypes.Booking = {
        _id: booking._id,
        supplier: supplier._id,
        dress: dress._id,
        driver: driver._id,
        pickupLocation: pickupLocation._id,
        dropOffLocation: dropOffLocation._id,
        from,
        to,
        status,
        cancellation,
        amendments,
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
            setDress(_booking.dress as bookcarsTypes.Dress)
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
            // Car-specific insurance options removed for dress rental
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

              <DressSelectList
                label={blStrings.DRESS}
                supplier={(supplier && supplier._id) || ''}
                onChange={handleDressSelectListChange}
                required
                value={dress}
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
                        booking.dress as bookcarsTypes.Dress,
                        new Date(booking.from),
                        new Date(booking.to),
                        (booking.dress as bookcarsTypes.Dress).supplier.priceChangeRate || 0,
                        booking as bookcarsTypes.DressOptions,
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
                        booking.dress as bookcarsTypes.Dress,
                        new Date(booking.from),
                        new Date(booking.to),
                        (booking.dress as bookcarsTypes.Dress).supplier.priceChangeRate || 0,
                        booking as bookcarsTypes.DressOptions,
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
                  disabled={!edit || (booking.dress as bookcarsTypes.Dress).cancellation === -1 || (booking.dress as bookcarsTypes.Dress).cancellation === 0}
                  control={<Switch checked={cancellation} onChange={handleCancellationChange} color="primary" />}
                  label={dressStrings.CANCELLATION}
                  className="checkbox-fcl"
                />
              </FormControl>

              <FormControl fullWidth margin="dense" className="checkbox-fc">
                <FormControlLabel
                  disabled={!edit || (booking.dress as bookcarsTypes.Dress).amendments === -1 || (booking.dress as bookcarsTypes.Dress).amendments === 0}
                  control={<Switch checked={amendments} onChange={handleAmendmentsChange} color="primary" />}
                  label={dressStrings.AMENDMENTS}
                  className="checkbox-fcl"
                />
              </FormControl>

              {/* Car-specific insurance options removed for dress rental */}

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
                <span className="price-day">{`${dressStrings.PRICE_PER_DAY} ${bookcarsHelper.formatPrice((price as number) / days, commonStrings.CURRENCY, language)}`}</span>
              </div>
            </div>
            {/* Dress display - simplified for booking page */}
            {booking.dress && (
              <div className="dress-display">
                <h3>{(booking.dress as bookcarsTypes.Dress).name}</h3>
                {(booking.dress as bookcarsTypes.Dress).image && (
                  <img
                    src={bookcarsHelper.joinURL(env.CDN_DRESSES, (booking.dress as bookcarsTypes.Dress).image)}
                    alt={(booking.dress as bookcarsTypes.Dress).name}
                    style={{ maxWidth: '200px', height: 'auto' }}
                  />
                )}
              </div>
            )}
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
