import React, { useState, useEffect } from 'react'
import { InputLabel, Select, MenuItem, SelectChangeEvent } from '@mui/material'
import { strings } from '../lang/cars'
import * as bookcarsTypes from 'bookcars-types'

const CarTypeList = (
  {
    value: carTypeValue,
    required,
    label,
    variant,
    onChange
  }:
    {
      value?: string,
      required?: boolean,
      label?: string
      variant?: 'filled' | 'standard' | 'outlined'
      onChange?: (value: string) => void
    }
) => {
  const [value, setValue] = useState('')

  useEffect(() => {
    setValue(carTypeValue || '')
  }, [carTypeValue])

  const handleChange = (e: SelectChangeEvent<string>) => {
    const value = e.target.value || ''
    setValue(value)

    if (onChange) {
      onChange(value)
    }
  }

  return (
    <div>
      <InputLabel className={required ? 'required' : ''}>{label}</InputLabel>
      <Select label={label} value={value} onChange={handleChange} variant={variant || 'standard'} required={required} fullWidth>
        <MenuItem value={bookcarsTypes.CarType.Diesel}>{strings.DIESEL}</MenuItem>
        <MenuItem value={bookcarsTypes.CarType.Gasoline}>{strings.GASOLINE}</MenuItem>
      </Select>
    </div>
  )
}

export default CarTypeList
