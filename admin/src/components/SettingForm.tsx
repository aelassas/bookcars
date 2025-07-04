import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button, FormControl, FormHelperText, Input, InputLabel, Paper } from '@mui/material'
import * as bookcarsTypes from ':bookcars-types'
import { strings as commonStrings } from '@/lang/common'
import { strings as settingsStrings } from '@/lang/settings'
import { strings } from '@/lang/setting'
import * as SettingService from '@/services/SettingService'
import * as helper from '@/utils/helper'
import { schema, FormFields } from '@/models/SettingForm'

interface SettingFormProps {
  settings: bookcarsTypes.Setting | null
  onSubmit: (data: bookcarsTypes.Setting) => void
}

const SettingForm = ({ settings, onSubmit: onFormSubmit }: SettingFormProps) => {
  const navigate = useNavigate()

  const { register, handleSubmit, formState: { isSubmitting, errors }, setValue, } = useForm<FormFields>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
  })

  useEffect(() => {
    if (settings) {
      setValue('minPickupHours', settings.minPickupHours.toString())
      setValue('minRentalHours', settings.minRentalHours.toString())
      setValue('minPickupDropoffHour', settings.minPickupDropoffHour.toString())
      setValue('maxPickupDropoffHour', settings.maxPickupDropoffHour.toString())
    }
  }, [settings, setValue])

  const onSubmit = async (data: FormFields) => {
    try {
      const payload: bookcarsTypes.UpdateSettingsPayload = {
        minPickupHours: Number(data.minPickupHours),
        minRentalHours: Number(data.minRentalHours),
        minPickupDropoffHour: Number(data.minPickupDropoffHour),
        maxPickupDropoffHour: Number(data.maxPickupDropoffHour),
      }

      const { status, data: res } = await SettingService.updateSettings(payload)

      if (status === 200) {
        if (onFormSubmit) {
          onFormSubmit(res)
        }
        helper.info(settingsStrings.SETTINGS_UPDATED)
      } else {
        helper.error()
      }
    } catch (err) {
      helper.error(err)
    }
  }

  return (
    <Paper className="settings-form settings-form-wrapper" elevation={10}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <h1 className="settings-form-title">{strings.SETTINGS}</h1>

        <FormControl fullWidth margin="dense">
          <InputLabel className="required">{strings.MIN_PICKUP_HOURS}</InputLabel>
          <Input {...register('minPickupHours')} type="text" required autoComplete="off" />
          {errors.minPickupHours && (
            <FormHelperText error>{errors.minPickupHours.message}</FormHelperText>
          )}
        </FormControl>

        <FormControl fullWidth margin="dense">
          <InputLabel className="required">{strings.MIN_RENTAL_HOURS}</InputLabel>
          <Input {...register('minRentalHours')} type="text" required autoComplete="off" />
          {errors.minRentalHours && (
            <FormHelperText error>{errors.minRentalHours.message}</FormHelperText>
          )}
        </FormControl>

        <FormControl fullWidth margin="dense">
          <InputLabel className="required">{strings.MIN_PICKUP_DROPOFF_HOUR}</InputLabel>
          <Input {...register('minPickupDropoffHour')} type="text" required autoComplete="off" />
          {errors.minPickupDropoffHour && (
            <FormHelperText error>{errors.minPickupDropoffHour.message}</FormHelperText>
          )}
        </FormControl>

        <FormControl fullWidth margin="dense">
          <InputLabel className="required">{strings.MAX_PICKUP_DROPOFF_HOUR}</InputLabel>
          <Input {...register('maxPickupDropoffHour')} type="text" required autoComplete="off" />
          {errors.maxPickupDropoffHour && (
            <FormHelperText error>{errors.maxPickupDropoffHour.message}</FormHelperText>
          )}
        </FormControl>

        <div className="buttons">
          <Button type="submit" variant="contained" className="btn-primary btn-margin-bottom" size="small" disabled={isSubmitting}>
            {commonStrings.SAVE}
          </Button>
          <Button variant="contained" className="btn-secondary btn-margin-bottom" size="small" onClick={() => navigate('/')}>
            {commonStrings.CANCEL}
          </Button>
        </div>
      </form>
    </Paper>
  )
}

export default SettingForm
