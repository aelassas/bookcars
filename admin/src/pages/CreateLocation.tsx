import React, { useState } from 'react'
import {
  InputLabel,
  FormControl,
  FormHelperText,
  Button,
  Box,
  Stack,
  Divider,
  Input,
} from '@mui/material'
import {
  LocationOn as LocationOnIcon,
  Apartment as ApartmentIcon,
  Map as MapIcon,
} from '@mui/icons-material'
import * as bookcarsTypes from ':bookcars-types'
import { useForm, useFieldArray, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Layout from '@/components/Layout'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/create-location'
import * as LocationService from '@/services/LocationService'
import * as helper from '@/utils/helper'
import env from '@/config/env.config'
import CountrySelectList from '@/components/CountrySelectList'
import Avatar from '@/components/Avatar'
import Backdrop from '@/components/SimpleBackdrop'
import ParkingSpotEditList from '@/components/ParkingSpotEditList'
import PositionInput from '@/components/PositionInput'
import { UserContextType, useUserContext } from '@/context/UserContext'
import { schema, ParkingSpot, FormFields } from '@/models/LocationForm'
import LocationSelectList from '@/components/LocationSelectList'
import { Option } from '@/models/common'

import '@/assets/css/create-location.css'

const CARD_STYLE = {
  backgroundColor: 'var(--sr-surface)',
  borderRadius: '16px',
  border: '1px solid #E2E8F0',
  padding: '24px',
  marginBottom: '20px',
}

const SECTION_TITLE_STYLE = {
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  fontWeight: 600,
  fontSize: '13px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.08em',
  color: 'var(--sr-emerald)',
  margin: '0 0 16px 0',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
}

const CreateLocation = () => {
  const { user } = useUserContext() as UserContextType
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(false)

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
      country: undefined,
      names: env._LANGUAGES.map(lang => ({ language: lang.code, name: '' })),
      latitude: '',
      longitude: '',
      parkingSpots: [],
      image: undefined,
      parentLocation: undefined,
    }
  })

  const country = useWatch({ control, name: 'country' })

  const { fields: nameFields } = useFieldArray({ control, name: 'names' })

  const { fields: parkingSpotFields, append: appendParkingSpot, update: updateParkingSpot, remove: removeParkingSpot } = useFieldArray({
    control,
    name: 'parkingSpots'
  })

  const watchImage = useWatch({ control, name: 'image' })
  const parentLocation = useWatch({ control, name: 'parentLocation' })

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
            setError(`names.${index}.name`, { type: 'manual', message: strings.INVALID_LOCATION })
            setFocus(`names.${index}.name`)
            isValid = false
          }
          return status === 200
        })
      )

      await Promise.all(validationPromises)

      if (isValid) {
        const payload: bookcarsTypes.UpsertLocationPayload = {
          country: data.country?._id!,
          latitude: data.latitude ? Number(data.latitude) : undefined,
          longitude: data.longitude ? Number(data.longitude) : undefined,
          names: data.names,
          image: data.image,
          parkingSpots: data.parkingSpots as bookcarsTypes.ParkingSpot[] || [],
          supplier: helper.supplier(user) ? user?._id : undefined,
          parentLocation: data.parentLocation?._id || undefined,
        }

        const status = await LocationService.create(payload)

        if (status === 200) {
          reset({
            country: undefined,
            names: env._LANGUAGES.map(lang => ({ language: lang.code, name: '' })),
            latitude: '',
            longitude: '',
            parkingSpots: [],
            image: undefined,
            parentLocation: undefined,
          })
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
      <Box sx={{ p: 3, backgroundColor: 'var(--sr-surface-raised)', minHeight: '100vh' }}>
        {/* Page Header */}
        <Box sx={{ mb: 3 }}>
          <p style={{ margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--sr-emerald)' }}>
            Network
          </p>
          <h2 style={{ margin: '4px 0 0', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: '24px', color: 'var(--sr-text)' }}>
            {strings.NEW_LOCATION_HEADING}
          </h2>
        </Box>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: visible ? 'block' : 'none' }}>
          {/* Card 1 — Hub Identity */}
          <Box sx={CARD_STYLE}>
            <p style={SECTION_TITLE_STYLE}>
              <ApartmentIcon sx={{ fontSize: 16 }} />
              Hub Identity
            </p>
            <Divider sx={{ mb: 3, borderColor: '#F0FDF4' }} />

            {/* Avatar */}
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
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
            </Box>

            <FormControl fullWidth margin="dense" error={!!errors.country}>
              <CountrySelectList
                label={strings.COUNTRY}
                variant="standard"
                onChange={(countries: bookcarsTypes.Option[]) => {
                  const _country = countries.length > 0 ? countries[0] as bookcarsTypes.Country : undefined
                  setValue('country', _country as Option || undefined)
                }}
                value={country}
                required
              />
              {errors.country && <FormHelperText>{errors.country.message}</FormHelperText>}
            </FormControl>

            <LocationSelectList
              label={strings.PARENT_LOCATION}
              variant="standard"
              value={parentLocation}
              onChange={(locations: bookcarsTypes.Option[]) => {
                setValue('parentLocation', locations.length > 0 ? locations[0] as Option : undefined)
              }}
            />

            {nameFields.map((field, index) => (
              <FormControl key={field.id} fullWidth margin="dense">
                <InputLabel className="required">
                  {`${commonStrings.NAME} (${env._LANGUAGES[index].label})`}
                </InputLabel>
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
          </Box>

          {/* Card 2 — Map & Operations */}
          <Box sx={CARD_STYLE}>
            <p style={SECTION_TITLE_STYLE}>
              <MapIcon sx={{ fontSize: 16 }} />
              Map &amp; Operations
            </p>
            <Divider sx={{ mb: 3, borderColor: '#F0FDF4' }} />

            <Stack direction="row" spacing={2}>
              <FormControl fullWidth margin="dense">
                <InputLabel>{commonStrings.LATITUDE}</InputLabel>
                <PositionInput
                  {...register('latitude')}
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                />
              </FormControl>

              <FormControl fullWidth margin="dense">
                <InputLabel>{commonStrings.LONGITUDE}</InputLabel>
                <PositionInput
                  {...register('longitude')}
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                />
              </FormControl>
            </Stack>

            {/* Map pin preview hint */}
            <Box sx={{
              mt: 2,
              mb: 2,
              p: 2,
              backgroundColor: 'var(--sr-surface-raised)',
              borderRadius: '10px',
              border: '1px dashed #BBF7D0',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}>
              <LocationOnIcon sx={{ color: 'var(--sr-emerald)', fontSize: 20 }} />
              <span style={{ fontSize: '13px', color: 'var(--sr-muted)', fontFamily: "'Inter', sans-serif" }}>
                Map pin preview will appear here once coordinates are set
              </span>
            </Box>

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
          </Box>

          {/* Action Buttons */}
          <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
            <Button
              type="submit"
              variant="contained"
              disabled={isSubmitting}
              sx={{
                background: '#107487',
                borderRadius: '10px',
                fontWeight: 600,
                fontSize: '14px',
                textTransform: 'none',
                px: 4,
                py: 1.2,
                '&:hover': { background: '#047857' },
              }}
            >
              {commonStrings.CREATE}
            </Button>
            <Button
              variant="outlined"
              onClick={handleCancel}
              sx={{
                borderRadius: '10px',
                fontWeight: 600,
                fontSize: '14px',
                textTransform: 'none',
                px: 4,
                py: 1.2,
                borderColor: '#E2E8F0',
                color: 'var(--sr-muted)',
                '&:hover': { borderColor: '#CBD5E1', backgroundColor: 'var(--sr-surface-raised)' },
              }}
            >
              {commonStrings.CANCEL}
            </Button>
          </Stack>
        </form>
      </Box>

      {loading && <Backdrop text={commonStrings.PLEASE_WAIT} />}
    </Layout>
  )
}

export default CreateLocation
