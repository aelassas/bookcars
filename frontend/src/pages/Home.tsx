import React, { useState, useEffect } from 'react'
import { FormControl, Button } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import * as bookcarsTypes from 'bookcars-types'
import { strings as commonStrings } from '../lang/common'
import { strings } from '../lang/home'
import * as UserService from '../services/UserService'
import Master from '../components/Master'
import LocationSelectList from '../components/LocationSelectList'
import DateTimePicker from '../components/DateTimePicker'

import SecurePayment from '../assets/img/secure-payment.png'
import '../assets/css/home.css'

const Home = () => {
  const navigate = useNavigate()

  const _minDate = new Date()
  _minDate.setDate(_minDate.getDate() + 1)

  const [pickupLocation, setPickupLocation] = useState('')
  const [dropOffLocation, setDropOffLocation] = useState('')
  const [minDate, setMinDate] = useState(_minDate)
  const [from, setFrom] = useState<Date>()
  const [to, setTo] = useState<Date>()
  const [sameLocation, setSameLocation] = useState(true)

  useEffect(() => {
    const _from = new Date()
    _from.setDate(_from.getDate() + 1)
    _from.setHours(10)
    _from.setMinutes(0)
    _from.setSeconds(0)
    _from.setMilliseconds(0)

    const _to = new Date(_from)
    _to.setDate(_to.getDate() + 3)

    const __minDate = new Date(_from)
    __minDate.setDate(__minDate.getDate() + 1)

    setMinDate(__minDate)
    setFrom(_from)
    setTo(_to)
  }, [])

  useEffect(() => {
    if (from) {
      const __minDate = new Date(from)
      __minDate.setDate(from.getDate() + 1)
      setMinDate(__minDate)
    }
  }, [from])

  const handlePickupLocationChange = (values: bookcarsTypes.Option[]) => {
    const _pickupLocation = (values.length > 0 && values[0]._id) || ''
    setPickupLocation(_pickupLocation)

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

  const handleDropOffLocationChange = (values: bookcarsTypes.Option[]) => {
    setDropOffLocation((values.length > 0 && values[0]._id) || '')
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!pickupLocation || !dropOffLocation || !from || !to) {
      return
    }

    navigate(`/cars?p=${pickupLocation}&d=${dropOffLocation}&f=${from.getTime()}&t=${to.getTime()}`)
  }

  const onLoad = () => { }

  return (
    <Master onLoad={onLoad} strict={false}>
      <div className="home">
        <div className="home-content">
          <div className="home-logo">
            <span className="home-logo-main" />
            <span className="home-logo-registered" />
          </div>
          <div className="home-search">
            <form onSubmit={handleSubmit} className="home-search-form">
              <FormControl className="pickup-location">
                <LocationSelectList label={commonStrings.PICKUP_LOCATION} hidePopupIcon customOpen required variant="outlined" onChange={handlePickupLocationChange} />
              </FormControl>
              <FormControl className="from">
                <DateTimePicker
                  label={commonStrings.FROM}
                  value={from}
                  minDate={new Date()}
                  variant="outlined"
                  required
                  onChange={(date) => {
                    if (date) {
                      if (to && to.getTime() <= date.getTime()) {
                        setTo(undefined)
                      }

                      const __minDate = new Date(date)
                      __minDate.setDate(date.getDate() + 1)
                      setMinDate(__minDate)
                    } else {
                      setMinDate(_minDate)
                    }

                    setFrom(date || undefined)
                  }}
                  language={UserService.getLanguage()}
                />
              </FormControl>
              <FormControl className="to">
                <DateTimePicker
                  label={commonStrings.TO}
                  value={to}
                  minDate={minDate}
                  variant="outlined"
                  required
                  onChange={(date) => {
                    setTo(date || undefined)
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
                    customOpen
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
        <footer>
          <div className="copyright">
            <span className="part1">{strings.COPYRIGHT_PART1}</span>
            <span className="part2">{strings.COPYRIGHT_PART2}</span>
            <span className="part3">{strings.COPYRIGHT_PART3}</span>
          </div>
          <div className="secure-payment">
            <img src={SecurePayment} alt="" />
          </div>
        </footer>
      </div>
    </Master>
  )
}

export default Home
