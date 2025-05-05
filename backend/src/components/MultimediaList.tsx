import React, { useState, useEffect } from 'react'
import { Checkbox, FormControlLabel } from '@mui/material'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import { strings } from '@/lang/multimedia-list'

interface MultimediaListProps {
  required?: boolean
  label?: string
  value?: bookcarsTypes.CarMultimedia[]
  onChange?: (value: bookcarsTypes.CarMultimedia[]) => void
}

const MultimediaList = ({
  required,
  label,
  value: mValue,
  onChange,
}: MultimediaListProps) => {
  const [value, setValue] = useState<bookcarsTypes.CarMultimedia[]>(mValue || [])

  useEffect(() => {
    if (onChange) {
      onChange(value)
    }
  }, [value]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setValue(mValue || [])
  }, [mValue])

  return (
    <div>
      <span className={required ? 'form-label required' : 'form-label'}>{label}</span>
      <div>
        <FormControlLabel
          control={(
            <Checkbox
              checked={value.includes(bookcarsTypes.CarMultimedia.AndroidAuto)}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                if (e.target.checked) {
                  value.push(bookcarsTypes.CarMultimedia.AndroidAuto)
                } else {
                  value.splice(value.findIndex((val) => val === bookcarsTypes.CarMultimedia.AndroidAuto), 1)
                }
                setValue(bookcarsHelper.clone(value))
              }}
            />
          )}
          label={strings.ANDROID_AUTO}
        />
        <FormControlLabel
          control={(
            <Checkbox
              checked={value.includes(bookcarsTypes.CarMultimedia.AppleCarPlay)}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                if (e.target.checked) {
                  value.push(bookcarsTypes.CarMultimedia.AppleCarPlay)
                } else {
                  value.splice(value.findIndex((val) => val === bookcarsTypes.CarMultimedia.AppleCarPlay), 1)
                }
                setValue(bookcarsHelper.clone(value))
              }}
            />
          )}
          label={strings.APPLE_CAR_PLAY}
        />
        <FormControlLabel
          control={(
            <Checkbox
              checked={value.includes(bookcarsTypes.CarMultimedia.Bluetooth)}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                if (e.target.checked) {
                  value.push(bookcarsTypes.CarMultimedia.Bluetooth)
                } else {
                  value.splice(value.findIndex((val) => val === bookcarsTypes.CarMultimedia.Bluetooth), 1)
                }
                setValue(bookcarsHelper.clone(value))
              }}
            />
          )}
          label={strings.BLUETOOTH}
        />
        <FormControlLabel
          control={(
            <Checkbox
              checked={value.includes(bookcarsTypes.CarMultimedia.Touchscreen)}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                if (e.target.checked) {
                  value.push(bookcarsTypes.CarMultimedia.Touchscreen)
                } else {
                  value.splice(value.findIndex((val) => val === bookcarsTypes.CarMultimedia.Touchscreen), 1)
                }
                setValue(bookcarsHelper.clone(value))
              }}
            />
          )}
          label={strings.TOUCHSCREEN}
        />
      </div>
    </div>
  )
}

export default MultimediaList
