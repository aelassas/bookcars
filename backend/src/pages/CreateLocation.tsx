import React, { useState } from 'react'
// import { useNavigate } from 'react-router-dom'
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
import Layout from '@/components/Layout'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/create-location'
import * as LocationService from '@/services/LocationService'
import * as helper from '@/common/helper'
import env from '@/config/env.config'
import CountrySelectList from '@/components/CountrySelectList'
import Avatar from '@/components/Avatar'
import Backdrop from '@/components/SimpleBackdrop'
import ParkingSpotEditList from '@/components/ParkingSpotEditList'
import PositionInput from '@/components/PositionInput'
import { UserContextType, useUserContext } from '@/context/UserContext'

import '@/assets/css/create-location.css'

const CreateLocation = () => {
  // const navigate = useNavigate()

  const { user } = useUserContext() as UserContextType
  const [visible, setVisible] = useState(false)
  const [names, setNames] = useState<bookcarsTypes.LocationName[]>([])
  const [nameErrors, setNameErrors] = useState<boolean[]>([])
  const [country, setCountry] = useState<bookcarsTypes.Country | null>()
  const [loading, setLoading] = useState(false)
  const [image, setImage] = useState<string>()
  const [longitude, setLongitude] = useState('')
  const [latitude, setLatitude] = useState('')
  const [parkingSpots, setParkingSpots] = useState<bookcarsTypes.ParkingSpot[]>([])

  const handleBeforeUpload = () => {
    setLoading(true)
  }

  const handleImageChange = (_image: bookcarsTypes.Location | string | null) => {
    setLoading(false)
    setImage(_image as string)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    try {
      if (!country) {
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
        const _isValid = (await LocationService.validate({ language: name.language, name: name.name })) === 200
        isValid = isValid && _isValid
        if (!_isValid) {
          _nameErrors[i] = true
        }
      }

      setNameErrors(_nameErrors)

      if (isValid) {
        const payload: bookcarsTypes.UpsertLocationPayload = {
          country: country?._id,
          latitude: latitude ? Number(latitude) : undefined,
          longitude: longitude ? Number(longitude) : undefined,
          names,
          image,
          parkingSpots,
          supplier: helper.supplier(user) ? user?._id : undefined,
        }
        const status = await LocationService.create(payload)

        if (status === 200) {
          const _names = bookcarsHelper.clone(names) as bookcarsTypes.LocationName[]
          for (let i = 0; i < names.length; i += 1) {
            _names[i].name = ''
          }
          setNames(_names)
          setImage(undefined)
          setCountry(null)
          setLongitude('')
          setLatitude('')
          setParkingSpots([])
          helper.info(strings.LOCATION_CREATED)
        } else {
          helper.error()
        }
      }
    } catch (err) {
      helper.error(err)
    }
  }

  const onLoad = () => {
    setVisible(true)
  }

  return (
    <Layout onLoad={onLoad} strict>
      <div className="create-location">
        <Paper className="location-form location-form-wrapper" elevation={10} style={visible ? {} : { display: 'none' }}>
          <h1 className="location-form-title">
            {' '}
            {strings.NEW_LOCATION_HEADING}
            {' '}
          </h1>
          <form onSubmit={handleSubmit}>
            <Avatar
              type={bookcarsTypes.RecordType.Location}
              avatar={image}
              mode="create"
              record={null}
              size="large"
              readonly={false}
              onBeforeUpload={handleBeforeUpload}
              onChange={handleImageChange}
              color="disabled"
              className="avatar-ctn"
            />

            <FormControl fullWidth margin="dense">
              <CountrySelectList
                label={strings.COUNTRY}
                variant="standard"
                onChange={(countries: bookcarsTypes.Option[]) => {
                  setCountry(countries.length > 0 ? countries[0] as bookcarsTypes.Country : null)
                }}
                value={country}
                required
              />
            </FormControl>

            {env._LANGUAGES.map((language, index) => (
              <FormControl key={language.code} fullWidth margin="dense">
                <InputLabel className="required">{`${commonStrings.NAME} (${language.label})`}</InputLabel>
                <Input
                  type="text"
                  value={(names[index] && names[index].name) || ''}
                  error={nameErrors[index]}
                  required
                  onChange={(e) => {
                    const _names = bookcarsHelper.clone(names) as bookcarsTypes.LocationName[]
                    _names[index] = {
                      language: language.code,
                      name: e.target.value,
                    }
                    setNames(_names)

                    const _nameErrors = bookcarsHelper.clone(nameErrors) as boolean[]
                    _nameErrors[index] = false
                    setNameErrors(_nameErrors)
                  }}
                  autoComplete="off"
                />
                <FormHelperText error={nameErrors[index]}>{(nameErrors[index] && strings.INVALID_LOCATION) || ''}</FormHelperText>
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
              title={strings.PARKING_SPOTS}
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
                {commonStrings.CREATE}
              </Button>
              <Button
                variant="contained"
                className="btn-secondary btn-margin-bottom"
                size="small"
                onClick={async () => {
                  if (image) {
                    await LocationService.deleteTempImage(image)
                  }
                  // navigate('/locations')
                  window.location.href = '/locations'
                }}
              >
                {commonStrings.CANCEL}
              </Button>
            </div>
          </form>
        </Paper>
      </div>

      {loading && <Backdrop text={commonStrings.PLEASE_WAIT} />}
    </Layout>
  )
}

export default CreateLocation
