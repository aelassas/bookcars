import React, { useState, useEffect } from 'react'
import {
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent
} from '@mui/material'
import * as bookcarsTypes from ':bookcars-types'
import { strings } from '@/lang/cars'

interface CarTypeListProps {
  value?: string
  required?: boolean
  label?: string
  variant?: 'filled' | 'standard' | 'outlined'
  onChange?: (value: string) => void
}

const CarTypeList = ({
  value: carTypeValue,
  required,
  label,
  variant,
  onChange
}: CarTypeListProps) => {
  const [value, setValue] = useState('')

  useEffect(() => {
    setValue(carTypeValue || '')
  }, [carTypeValue])

  const handleChange = (e: SelectChangeEvent<string>) => {
    const _value = e.target.value || ''
    setValue(_value)

    if (onChange) {
      onChange(_value)
    }
  }

  return (
    <div>
      <InputLabel className={required ? 'required' : ''}>{label}</InputLabel>
      <Select label={label} value={value} onChange={handleChange} variant={variant || 'standard'} required={required} fullWidth>
        <MenuItem value={bookcarsTypes.CarType.Diesel}>{strings.DIESEL}</MenuItem>
        <MenuItem value={bookcarsTypes.CarType.Gasoline}>{strings.GASOLINE}</MenuItem>
        <MenuItem value={bookcarsTypes.CarType.Electric}>{strings.ELECTRIC}</MenuItem>
        <MenuItem value={bookcarsTypes.CarType.Hybrid}>{strings.HYBRID}</MenuItem>
        <MenuItem value={bookcarsTypes.CarType.PlugInHybrid}>{strings.PLUG_IN_HYBRID}</MenuItem>
        <MenuItem value={bookcarsTypes.CarType.Unknown}>{strings.UNKNOWN}</MenuItem>
      </Select>
    </div>
  )
}

export default CarTypeList
