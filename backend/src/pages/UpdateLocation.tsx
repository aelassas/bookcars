import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Input,
  InputLabel,
  FormControl,
  FormHelperText,
  Button,
  Paper,
  FormLabel
} from '@mui/material'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import Layout from '@/components/Layout'
import { strings as commonStrings } from '@/lang/common'
import { strings as clStrings } from '@/lang/create-location'
import { strings } from '@/lang/update-location'
import { strings as suppliersStrings } from '@/lang/suppliers'
import * as LocationService from '@/services/LocationService'
import NoMatch from './NoMatch'
import Error from './Error'
import Backdrop from '@/components/SimpleBackdrop'
import * as helper from '@/common/helper'
import env from '@/config/env.config'
import CountrySelectList from '@/components/CountrySelectList'
import Avatar from '@/components/Avatar'
import PositionInput from '@/components/PositionInput'
import ParkingSpotEditList from '@/components/ParkingSpotEditList'
import SupplierBadge from '@/components/SupplierBadge'

import '@/assets/css/update-location.css'

const UpdateLocation = () => {
  const navigate = useNavigate()

  const [user, setUser] = useState<bookcarsTypes.User>()
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
      if (name.name !== location.values[i].value) {
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

      const _nameErrors = bookcarsHelper.clone(nameErrors) as boolean[]
      for (let i = 0; i < nameErrors.length; i += 1) {
        _nameErrors[i] = false
      }

      for (let i = 0; i < names.length; i += 1) {
        const name = names[i]
        if (name.name !== location.values[i].value) {
          const _isValid = (await LocationService.validate({ language: name.language, name: name.name })) === 200
          isValid = isValid && _isValid
          if (!_isValid) {
            _nameErrors[i] = true
          }
        }
      }

      setNameErrors(_nameErrors)

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
          // for (let i = 0; i < names.length; i += 1) {
          //   const name = names[i]
          //   location.values[i].value = name.name
          // }

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

  const onLoad = async (_user?: bookcarsTypes.User) => {
    if (_user && _user.verified) {
      setLoading(true)
      setUser(_user)

      const params = new URLSearchParams(window.location.search)
      if (params.has('loc')) {
        const id = params.get('loc')
        if (id && id !== '') {
          try {
            const _location = await LocationService.getLocation(id)

            if (!helper.admin(_user) && _user._id !== _location.supplier?._id) {
              setLoading(false)
              setNoMatch(true)
              return
            }

            if (_location && _location.values) {
              env._LANGUAGES.forEach((lang) => {
                if (_location.values && !_location.values.some((value) => value.language === lang.code)) {
                  _location.values.push({ language: lang.code, value: '' })
                }
              })

              const _names: bookcarsTypes.LocationName[] = _location.values.map((value) => ({
                language: value.language || '',
                name: value.value || '',
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

              {helper.admin(user) && location.supplier && (
                <FormControl fullWidth margin="dense">
                  <FormLabel>{suppliersStrings.SUPPLIER}</FormLabel>
                  <SupplierBadge supplier={location.supplier} />
                </FormControl>
              )}

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
                    value={(names[index] && names[index].name) || ''}
                    error={nameErrors[index]}
                    required
                    onChange={(e) => {
                      const _names = bookcarsHelper.clone(names) as bookcarsTypes.LocationName[]
                      _names[index].name = e.target.value
                      const _nameErrors = bookcarsHelper.cloneArray(nameErrors) as boolean[]
                      _nameErrors[index] = false
                      checkName()
                      setNames(_names)
                      setNameErrors(_nameErrors)
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
                  const _parkingSpots = bookcarsHelper.clone(parkingSpots) as bookcarsTypes.ParkingSpot[]
                  _parkingSpots.push(value)
                  setParkingSpots(_parkingSpots)
                }}
                onUpdate={(value, index) => {
                  const _parkingSpots = bookcarsHelper.clone(parkingSpots) as bookcarsTypes.ParkingSpot[]
                  _parkingSpots[index] = value
                  setParkingSpots(_parkingSpots)
                }}
                onDelete={(_, index) => {
                  const _parkingSpots = bookcarsHelper.clone(parkingSpots) as bookcarsTypes.ParkingSpot[]
                  _parkingSpots.splice(index, 1)
                  setParkingSpots(_parkingSpots)
                }}
              />

              <div className="buttons">
                <Button type="submit" variant="contained" className="btn-primary btn-margin-bottom" size="small">
                  {commonStrings.SAVE}
                </Button>
                <Button variant="contained" className="btn-secondary btn-margin-bottom" size="small" onClick={() => navigate('/locations')}>
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
