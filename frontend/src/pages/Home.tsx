import React, { useState, useEffect } from 'react'
import { FormControl, Button } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { DateTimeValidationError } from '@mui/x-date-pickers'
import env from '../config/env.config'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import { strings as commonStrings } from '../lang/common'
import { strings } from '../lang/home'
import * as UserService from '../services/UserService'
import * as SupplierService from '../services/SupplierService'
import * as LocationService from '../services/LocationService'
import * as helper from '../common/helper'
import Layout from '../components/Layout'
import LocationSelectList from '../components/LocationSelectList'
import DateTimePicker from '../components/DateTimePicker'
import SupplierCarrousel from '../components/SupplierCarrousel'
import Map from '../components/Map'
import Footer from '../components/Footer'

import '../assets/css/home.css'

const Home = () => {
  const navigate = useNavigate()

  const _minDate = new Date()
  _minDate.setDate(_minDate.getDate() + 1)

  const [pickupLocation, setPickupLocation] = useState('')
  const [selectedPickupLocation, setSelectedPickupLocation] = useState<bookcarsTypes.Location | undefined>(undefined)
  const [dropOffLocation, setDropOffLocation] = useState('')
  const [selectedDropOffLocation, setSelectedDropOffLocation] = useState<bookcarsTypes.Location | undefined>(undefined)
  const [minDate, setMinDate] = useState(_minDate)
  const [maxDate, setMaxDate] = useState<Date>()
  const [from, setFrom] = useState<Date>()
  const [to, setTo] = useState<Date>()
  const [sameLocation, setSameLocation] = useState(true)
  const [fromError, setFromError] = useState(false)
  const [toError, setToError] = useState(false)
  const [suppliers, setSuppliers] = useState<bookcarsTypes.User[]>([])

  useEffect(() => {
    const _from = new Date()
    _from.setDate(_from.getDate() + 1)
    _from.setHours(10)
    _from.setMinutes(0)
    _from.setSeconds(0)
    _from.setMilliseconds(0)

    const _to = new Date(_from)
    _to.setDate(_to.getDate() + 3)

    const _maxDate = new Date(_to)
    _maxDate.setDate(_maxDate.getDate() - 1)
    setMaxDate(_maxDate)

    const __minDate = new Date(_from)
    __minDate.setDate(__minDate.getDate() + 1)

    setMinDate(__minDate)
    setFrom(_from)
    setTo(_to)

    const init = async () => {
      let _suppliers = await SupplierService.getAllSuppliers()
      _suppliers = _suppliers.filter((supplier) => supplier.avatar && !/no-image/i.test(supplier.avatar))
      bookcarsHelper.shuffle(_suppliers)
      setSuppliers(_suppliers)
    }

    init()
  }, [])

  useEffect(() => {
    if (from) {
      const __minDate = new Date(from)
      __minDate.setDate(from.getDate() + 1)
      setMinDate(__minDate)
    }
  }, [from])

  const handlePickupLocationChange = async (values: bookcarsTypes.Option[]) => {
    const _pickupLocation = (values.length > 0 && values[0]._id) || ''
    setPickupLocation(_pickupLocation)

    if (_pickupLocation) {
      const location = await LocationService.getLocation(_pickupLocation)
      setSelectedPickupLocation(location)
    } else {
      setSelectedPickupLocation(undefined)
    }

    if (sameLocation) {
      setDropOffLocation(_pickupLocation)
    }
  }

  const handleSameLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSameLocation(e.target.checked)

    if (e.target.checked) {
      setDropOffLocation(pickupLocation)
    } else {
      setDropOffLocation('')
    }
  }

  const handleDropOffLocationChange = async (values: bookcarsTypes.Option[]) => {
    const _dropOffLocation = (values.length > 0 && values[0]._id) || ''
    setDropOffLocation(_dropOffLocation)

    if (_dropOffLocation) {
      const location = await LocationService.getLocation(_dropOffLocation)
      setSelectedDropOffLocation(location)
    } else {
      setSelectedDropOffLocation(undefined)
    }
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!pickupLocation || !dropOffLocation || !from || !to || fromError || toError) {
      return
    }

    navigate('/search', {
      state: {
        pickupLocationId: pickupLocation,
        dropOffLocationId: dropOffLocation,
        from,
        to
      }
    })
  }

  const onLoad = () => { }

  return (
    <Layout onLoad={onLoad} strict={false}>

      <div className="home">
        <div className="home-content">

          <div className="home-cover">{strings.COVER}</div>

          <div className="home-search">
            <form onSubmit={handleSubmit} className="home-search-form">
              <FormControl className="pickup-location">
                <LocationSelectList
                  label={commonStrings.PICK_UP_LOCATION}
                  hidePopupIcon
                  customOpen={env.isMobile()}
                  init={!env.isMobile()}
                  required
                  variant="outlined"
                  value={selectedPickupLocation}
                  onChange={handlePickupLocationChange}
                />
              </FormControl>
              <FormControl className="from">
                <DateTimePicker
                  label={strings.PICK_UP_DATE}
                  value={from}
                  minDate={_minDate}
                  maxDate={maxDate}
                  variant="outlined"
                  required
                  onChange={(date) => {
                    if (date) {
                      const __minDate = new Date(date)
                      __minDate.setDate(date.getDate() + 1)
                      setFrom(date)
                      setMinDate(__minDate)
                      setFromError(false)
                    } else {
                      setFrom(undefined)
                      setMinDate(_minDate)
                    }
                  }}
                  onError={(err: DateTimeValidationError) => {
                    if (err) {
                      setFromError(true)
                    } else {
                      setFromError(false)
                    }
                  }}
                  language={UserService.getLanguage()}
                />
              </FormControl>
              <FormControl className="to">
                <DateTimePicker
                  label={strings.DROP_OFF_DATE}
                  value={to}
                  minDate={minDate}
                  variant="outlined"
                  required
                  onChange={(date) => {
                    if (date) {
                      const _maxDate = new Date(date)
                      _maxDate.setDate(_maxDate.getDate() - 1)
                      setTo(date)
                      setMaxDate(_maxDate)
                      setToError(false)
                    } else {
                      setTo(undefined)
                      setMaxDate(undefined)
                    }
                  }}
                  onError={(err: DateTimeValidationError) => {
                    if (err) {
                      setToError(true)
                    } else {
                      setToError(false)
                    }
                  }}
                  language={UserService.getLanguage()}
                />
              </FormControl>
              <Button type="submit" variant="contained" className="btn-search">
                {commonStrings.SEARCH}
              </Button>
              {!sameLocation && (
                <FormControl className="drop-off-location">
                  <LocationSelectList
                    label={commonStrings.DROP_OFF_LOCATION}
                    hidePopupIcon
                    customOpen={env.isMobile()}
                    init={!env.isMobile()}
                    value={selectedDropOffLocation}
                    required
                    variant="outlined"
                    onChange={handleDropOffLocationChange}
                  />
                </FormControl>
              )}
              <FormControl className="chk-same-location">
                <input
                  id="chk-same-location"
                  type="checkbox"
                  checked={sameLocation}
                  onChange={handleSameLocationChange}
                />
                <label
                  htmlFor="chk-same-location"
                >
                  {strings.DROP_OFF}
                </label>
              </FormControl>
            </form>
          </div>

        </div>

        <div className="suppliers">
          {suppliers.length > 0 && (
            <>
              <h1>{strings.SUPPLIERS_TITLE}</h1>
              <SupplierCarrousel suppliers={suppliers} />
            </>
          )}
        </div>

        <div className="home-map">
          <Map
            title={strings.MAP_TITLE}
            initialZoom={2.5}
            onSelelectPickUpLocation={async (locationId) => {
              const location = await LocationService.getLocation(locationId)
              setSelectedPickupLocation(location)
              setPickupLocation(locationId)
              if (sameLocation) {
                setDropOffLocation(locationId)
              } else {
                setSameLocation(dropOffLocation === locationId)
              }
              helper.info(strings.MAP_PICK_UP_SELECTED)
            }}
            onSelelectDropOffLocation={async (locationId) => {
              const location = await LocationService.getLocation(locationId)
              setSelectedDropOffLocation(location)
              setDropOffLocation(locationId)
              setSameLocation(pickupLocation === locationId)
              helper.info(strings.MAP_DROP_OFF_SELECTED)
            }}
          />
        </div>
      </div>

      <Footer />
    </Layout>
  )
}

export default Home
