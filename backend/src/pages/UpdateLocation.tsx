import React, { useState } from 'react'
import {
  Input,
  InputLabel,
  FormControl,
  FormHelperText,
  Button,
  Paper
} from '@mui/material'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import Layout from '../components/Layout'
import { strings as commonStrings } from '../lang/common'
import { strings as clStrings } from '../lang/create-location'
import { strings } from '../lang/update-location'
import * as LocationService from '../services/LocationService'
import NoMatch from './NoMatch'
import Error from './Error'
import Backdrop from '../components/SimpleBackdrop'
import * as helper from '../common/helper'
import env from '../config/env.config'
import CountrySelectList from '../components/CountrySelectList'
import Avatar from '../components/Avatar'
import PositionInput from '../components/PositionInput'
import ParkingSpotEditList from '../components/ParkingSpotEditList'

import '../assets/css/update-location.css'

const UpdateLocation = () => {
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [names, setNames] = useState<bookcarsTypes.LocationName[]>([])
  const [nameErrors, setNameErrors] = useState<boolean[]>([])
  const [noMatch, setNoMatch] = useState(false)
  const [error, setError] = useState(false)
  const [location, setLocation] = useState<bookcarsTypes.Location>()
  const [country, setCountry] = useState<bookcarsTypes.Country>()
  const [image, setImage] = useState('')
  const [longitude, setLongitude] = useState('')
  const [latitude, setLatitude] = useState('')
  const [parkingSpots, setParkingSpots] = useState<bookcarsTypes.ParkingSpot[]>([])

  const handleBeforeUpload = () => {
    setLoading(true)
  }

  const handleImageChange = (_image: string) => {
    setLoading(false)
    setImage(_image as string)
  }

  const _error = () => {
    setLoading(false)
    helper.error()
  }

  const checkName = () => {
    let _nameChanged = false

    if (!location || !location.values) {
      helper.error()
      return _nameChanged
    }

    for (let i = 0; i < names.length; i += 1) {
      const name = names[i]
      if (name.value !== location.values[i].value) {
        _nameChanged = true
        break
      }
    }

    return _nameChanged
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    try {
      if (!country || !location || !location.values) {
        helper.error()
        return
      }

      let isValid = true

      for (let i = 0; i < nameErrors.length; i += 1) {
        nameErrors[i] = false
      }

      for (let i = 0; i < names.length; i += 1) {
        const name = names[i]
        if (name.value !== location.values[i].value) {
          const _isValid = (await LocationService.validate({ language: name.language, name: name.value })) === 200
          isValid = isValid && _isValid
          if (!_isValid) {
            nameErrors[i] = true
          }
        }
      }

      setNameErrors(bookcarsHelper.cloneArray(nameErrors) as boolean[])

      if (isValid) {
        const payload: bookcarsTypes.UpsertLocationPayload = {
          country: country._id,
          latitude: latitude ? Number(latitude) : undefined,
          longitude: longitude ? Number(longitude) : undefined,
          names,
          image,
          parkingSpots
        }
        const { status, data } = await LocationService.update(location._id, payload)

        if (status === 200) {
          for (let i = 0; i < names.length; i += 1) {
            const name = names[i]
            location.values[i].value = name.value
          }

          setLocation(data)
          helper.info(strings.LOCATION_UPDATED)
        } else {
          _error()
        }
      }
    } catch (err) {
      helper.error(err)
    }
  }

  const onLoad = async (user?: bookcarsTypes.User) => {
    if (user && user.verified) {
      setLoading(true)

      const params = new URLSearchParams(window.location.search)
      if (params.has('loc')) {
        const id = params.get('loc')
        if (id && id !== '') {
          try {
            const _location = await LocationService.getLocation(id)

            if (_location && _location.values) {
              env._LANGUAGES.forEach((lang) => {
                if (_location.values && !_location.values.some((value) => value.language === lang.code)) {
                  _location.values.push({ language: lang.code, value: '' })
                }
              })

              const _names: bookcarsTypes.LocationName[] = _location.values.map((value) => ({
                language: value.language || '',
                value: value.value || '',
              }))

              setLocation(_location)
              setCountry(_location.country)
              setNames(_names)
              setLongitude((_location.longitude && _location.longitude.toString()) || '')
              setLatitude((_location.latitude && _location.latitude.toString()) || '')
              setParkingSpots(_location.parkingSpots || [])
              setVisible(true)
              setLoading(false)
            } else {
              setLoading(false)
              setNoMatch(true)
            }
          } catch (err) {
            helper.error(err)
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
  }

  return (
    <Layout onLoad={onLoad} strict>
      {!error && !noMatch && location && location.values && (
        <div className="update-location">
          <Paper className="location-form location-form-wrapper" elevation={10} style={visible ? {} : { display: 'none' }}>
            <h1 className="location-form-title">
              {' '}
              {strings.UPDATE_LOCATION}
              {' '}
            </h1>
            <form onSubmit={handleSubmit}>
              <Avatar
                type={bookcarsTypes.RecordType.Location}
                mode="update"
                record={location}
                size="large"
                readonly={false}
                onBeforeUpload={handleBeforeUpload}
                onChange={handleImageChange}
                color="disabled"
                className="avatar-ctn"
              />

              <FormControl fullWidth margin="dense">
                <CountrySelectList
                  label={clStrings.COUNTRY}
                  variant="standard"
                  value={country}
                  onChange={(countries: bookcarsTypes.Option[]) => {
                    if (countries.length > 0) {
                      const opt = countries[0]
                      const _country = { _id: opt._id, name: opt.name }
                      setCountry(_country)
                    } else {
                      setCountry(undefined)
                    }
                  }}
                  required
                />
              </FormControl>

              {location.values.map((value, index) => (
                <FormControl key={value.language} fullWidth margin="dense">
                  <InputLabel className="required">{`${commonStrings.NAME} (${env._LANGUAGES.filter((l) => l.code === value.language)[0].label})`}</InputLabel>
                  <Input
                    type="text"
                    value={(names[index] && names[index].value) || ''}
                    error={nameErrors[index]}
                    required
                    onChange={(e) => {
                      nameErrors[index] = false
                      names[index].value = e.target.value
                      checkName()
                      setNames(bookcarsHelper.cloneArray(names) as bookcarsTypes.LocationName[])
                    }}
                    autoComplete="off"
                  />
                  <FormHelperText error={nameErrors[index]}>{(nameErrors[index] && clStrings.INVALID_LOCATION) || ''}</FormHelperText>
                </FormControl>
              ))}

              <FormControl fullWidth margin="dense">
                <InputLabel>{commonStrings.LATITUDE}</InputLabel>
                <PositionInput
                  value={latitude}
                  onChange={(e) => {
                    setLatitude(e.target.value)
                  }}
                />
              </FormControl>

              <FormControl fullWidth margin="dense">
                <InputLabel>{commonStrings.LONGITUDE}</InputLabel>
                <PositionInput
                  value={longitude}
                  onChange={(e) => {
                    setLongitude(e.target.value)
                  }}
                />
              </FormControl>

              <ParkingSpotEditList
                title={clStrings.PARKING_SPOTS}
                values={parkingSpots}
                onAdd={(value) => {
                  parkingSpots.push(value)
                  setParkingSpots(bookcarsHelper.clone(parkingSpots))
                }}
                onUpdate={(value, index) => {
                  parkingSpots[index] = value
                  setParkingSpots(bookcarsHelper.clone(parkingSpots))
                }}
                onDelete={(_, index) => {
                  parkingSpots.splice(index, 1)
                  setParkingSpots(bookcarsHelper.clone(parkingSpots))
                }}
              />

              <div className="buttons">
                <Button type="submit" variant="contained" className="btn-primary btn-margin-bottom" size="small">
                  {commonStrings.SAVE}
                </Button>
                <Button variant="contained" className="btn-secondary btn-margin-bottom" size="small" href="/locations">
                  {commonStrings.CANCEL}
                </Button>
              </div>
            </form>
          </Paper>
        </div>
      )}
      {loading && <Backdrop text={commonStrings.PLEASE_WAIT} />}
      {error && <Error />}
      {noMatch && <NoMatch hideHeader />}
    </Layout>
  )
}

export default UpdateLocation
