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
import { useForm, useFieldArray, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import Layout from '@/components/Layout'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/update-location'
import { strings as clStrings } from '@/lang/create-location'
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
import { schema, ParkingSpot, FormFields } from '@/models/LocationForm'

import '@/assets/css/update-location.css'

const UpdateLocation = () => {
  const navigate = useNavigate()

  const [user, setUser] = useState<bookcarsTypes.User>()
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [originalNames, setOriginalNames] = useState<bookcarsTypes.LocationName[]>([])
  const [noMatch, setNoMatch] = useState(false)
  const [formError, setFormError] = useState(false)
  const [location, setLocation] = useState<bookcarsTypes.Location>()
  const [country, setCountry] = useState<bookcarsTypes.Country>()

  // Initialize form with React Hook Form and Zod validation
  const {
    control,
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors, isSubmitting },
    setFocus,
  } = useForm<FormFields>({
    resolver: zodResolver(schema),
    mode: 'onSubmit',
    defaultValues: {
      country: '',
      names: env._LANGUAGES.map(lang => ({ language: lang.code, name: '' })),
      latitude: '',
      longitude: '',
      parkingSpots: [],
      image: undefined
    }
  })

  // Use field array for names and parking spots
  const { fields: nameFields } = useFieldArray({
    control,
    name: 'names'
  })

  const { fields: parkingSpotFields, append: appendParkingSpot, update: updateParkingSpot, remove: removeParkingSpot } = useFieldArray({
    control,
    name: 'parkingSpots'
  })

  // Watch values from the form
  const watchImage = useWatch({
    control,
    name: 'image'
  })

  const handleBeforeUpload = () => {
    setLoading(true)
  }

  const handleImageChange = (_image: string) => {
    setLoading(false)
    setValue('image', _image as string)
  }

  const _error = () => {
    setLoading(false)
    helper.error()
  }

  const onSubmit = async (data: FormFields) => {
    try {
      if (!country || !location || !location.values) {
        helper.error()
        return
      }

      let isValid = true
      const validationPromises = data.names.map(async (name, index) => {
        if (name.name !== originalNames[index].name) {
          const status = await LocationService.validate({ language: name.language, name: name.name })

          if (status !== 200) {
            setError(`names.${index}.name`, {
              type: 'manual',
              message: clStrings.INVALID_LOCATION
            })
            setFocus(`names.${index}.name`)
            isValid = false
          }
          return status === 200
        }
        return true
      }
      )

      await Promise.all(validationPromises)

      if (isValid) {
        const payload: bookcarsTypes.UpsertLocationPayload = {
          country: country._id,
          latitude: data.latitude ? Number(data.latitude) : undefined,
          longitude: data.longitude ? Number(data.longitude) : undefined,
          names: data.names,
          image: watchImage,
          parkingSpots: data.parkingSpots as bookcarsTypes.ParkingSpot[] || [],
        }
        const { status, data: newLocation } = await LocationService.update(location._id, payload)

        if (status === 200) {
          // for (let i = 0; i < names.length; i += 1) {
          //   const name = names[i]
          //   location.values[i].value = name.name
          // }

          setLocation(newLocation)
          setOriginalNames(bookcarsHelper.clone(data.names) as bookcarsTypes.LocationName[])
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
              setOriginalNames(_names)
              setValue('names', _names)
              setValue('longitude', (_location.longitude && _location.longitude.toString()) || '')
              setValue('latitude', (_location.latitude && _location.latitude.toString()) || '')
              setValue('parkingSpots', _location.parkingSpots?.map((ps) => ({
                latitude: ps.latitude.toString(),
                longitude: ps.longitude.toString(),
                values: ps.values as ParkingSpot['values'],
              })) || [])
              setVisible(true)
              setLoading(false)
            } else {
              setLoading(false)
              setNoMatch(true)
            }
          } catch (err) {
            helper.error(err)
            setLoading(false)
            setFormError(true)
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
      {!formError && !noMatch && location && location.values && (
        <div className="update-location">
          <Paper className="location-form location-form-wrapper" elevation={10} style={visible ? {} : { display: 'none' }}>
            <h1 className="location-form-title">{strings.UPDATE_LOCATION}</h1>
            <form onSubmit={handleSubmit(onSubmit)}>
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

              <FormControl fullWidth margin="dense" error={!!errors.country}>
                <CountrySelectList
                  label={strings.COUNTRY}
                  variant="standard"
                  onChange={(countries: bookcarsTypes.Option[]) => {
                    const _country = countries.length > 0 ? countries[0] as bookcarsTypes.Country : null
                    setCountry(_country || undefined)
                    setValue('country', _country?._id || '')
                  }}
                  value={country}
                  required
                />
                {errors.country && (
                  <FormHelperText>{errors.country.message}</FormHelperText>
                )}
              </FormControl>

              {nameFields.map((field, index) => (
                <FormControl key={field.id} fullWidth margin="dense">
                  <InputLabel className="required">{`${commonStrings.NAME} (${env._LANGUAGES.filter((l) => l.code === field.language)[0].label})`}</InputLabel>

                  <Input
                    type="text"
                    error={!!errors.names?.[index]?.name}
                    required
                    {...register(`names.${index}.name`)}
                    autoComplete="off"
                  />
                  <FormHelperText error={!!errors.names?.[index]?.name}>
                    {errors.names?.[index]?.name?.message || ''}
                  </FormHelperText>
                </FormControl>
              ))}

              <FormControl fullWidth margin="dense">
                <InputLabel>{commonStrings.LATITUDE}</InputLabel>
                <PositionInput
                  {...register('latitude')}
                />
              </FormControl>

              <FormControl fullWidth margin="dense" >
                <InputLabel>{commonStrings.LONGITUDE}</InputLabel>
                <PositionInput
                  {...register('longitude')}
                />
              </FormControl>

              <ParkingSpotEditList
                title={strings.PARKING_SPOTS}
                values={parkingSpotFields as bookcarsTypes.ParkingSpot[]}
                onAdd={(value) => {
                  const parkingSpot: ParkingSpot = {
                    values: value.values?.map((v) => ({ value: v.value!, language: v.language })) || [],
                    latitude: value.latitude as string,
                    longitude: value.longitude as string,
                  }
                  appendParkingSpot(parkingSpot)
                }}
                onUpdate={(value, index) => {
                  const parkingSpot: ParkingSpot = {
                    values: value.values?.map((v) => ({ value: v.value!, language: v.language })) || [],
                    latitude: value.latitude as string,
                    longitude: value.longitude as string,
                  }
                  updateParkingSpot(index, parkingSpot)
                }}
                onDelete={(_, index) => removeParkingSpot(index)}
              />

              <div className="buttons">
                <Button type="submit" variant="contained" className="btn-primary btn-margin-bottom" size="small" disabled={isSubmitting}>
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
      {formError && <Error />}
      {noMatch && <NoMatch hideHeader />}
    </Layout>
  )
}

export default UpdateLocation
