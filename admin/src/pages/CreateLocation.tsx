import React, { useState } from 'react'
import {
  InputLabel,
  FormControl,
  FormHelperText,
  Button,
  Paper,
  Input
} from '@mui/material'
import * as bookcarsTypes from ':bookcars-types'
import { useForm, useFieldArray, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
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
import { schema, ParkingSpot, FormFields } from '@/models/LocationForm'

import '@/assets/css/create-location.css'

const CreateLocation = () => {
  const { user } = useUserContext() as UserContextType
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [country, setCountry] = useState<bookcarsTypes.Country | null>(null)

  // Initialize form with React Hook Form and Zod validation
  const {
    control,
    register,
    handleSubmit,
    setValue,
    reset,
    setError,
    formState: { errors, isSubmitting },
    clearErrors,
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

  const handleImageChange = (_image: bookcarsTypes.Location | string | null) => {
    setLoading(false)
    setValue('image', _image as string)
  }

  const onSubmit = async (data: FormFields) => {
    try {
      let isValid = true
      const validationPromises = data.names.map((name, index) =>
        LocationService.validate({ language: name.language, name: name.name }).then((status) => {
          if (status !== 200) {
            setError(`names.${index}.name`, {
              type: 'manual',
              message: strings.INVALID_LOCATION
            })
            setFocus(`names.${index}.name`)
            isValid = false
          }
          return status === 200
        })
      )

      await Promise.all(validationPromises)

      if (isValid) {
        const payload: bookcarsTypes.UpsertLocationPayload = {
          country: data.country,
          latitude: data.latitude ? Number(data.latitude) : undefined,
          longitude: data.longitude ? Number(data.longitude) : undefined,
          names: data.names,
          image: data.image,
          parkingSpots: data.parkingSpots as bookcarsTypes.ParkingSpot[] || [],
          supplier: helper.supplier(user) ? user?._id : undefined,
        }

        const status = await LocationService.create(payload)

        if (status === 200) {
          reset({
            country: '',
            names: env._LANGUAGES.map(lang => ({ language: lang.code, name: '' })),
            latitude: '',
            longitude: '',
            parkingSpots: [],
            image: undefined
          })
          setCountry(null)
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

  const handleCancel = async () => {
    if (watchImage) {
      await LocationService.deleteTempImage(watchImage)
    }
    window.location.href = '/locations'
  }

  return (
    <Layout onLoad={onLoad} strict>
      <div className="create-location">
        <Paper className="location-form location-form-wrapper" elevation={10} style={visible ? {} : { display: 'none' }}>
          <h1 className="location-form-title">{strings.NEW_LOCATION_HEADING}</h1>
          <form onSubmit={handleSubmit(onSubmit)}>
            <Avatar
              type={bookcarsTypes.RecordType.Location}
              avatar={watchImage}
              mode="create"
              record={null}
              size="large"
              readonly={false}
              onBeforeUpload={handleBeforeUpload}
              onChange={handleImageChange}
              color="disabled"
              className="avatar-ctn"
            />

            <FormControl fullWidth margin="dense" error={!!errors.country}>
              <CountrySelectList
                label={strings.COUNTRY}
                variant="standard"
                onChange={(countries: bookcarsTypes.Option[]) => {
                  const _country = countries.length > 0 ? countries[0] as bookcarsTypes.Country : null
                  setCountry(_country)
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
                <InputLabel className="required">{`${commonStrings.NAME} (${env._LANGUAGES[index].label})`}</InputLabel>

                <Input
                  {...register(`names.${index}.name`)}
                  onChange={() => {
                    if (errors.names?.[index]?.name) {
                      clearErrors(`names.${index}.name`)
                    }
                  }}
                  error={!!errors.names?.[index]?.name}
                  required
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
                {commonStrings.CREATE}
              </Button>
              <Button
                variant="contained"
                className="btn-secondary btn-margin-bottom"
                size="small"
                onClick={handleCancel}
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
