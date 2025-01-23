import React, { useState, useEffect } from 'react'
import {
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent
} from '@mui/material'
import * as bookcarsTypes from ':bookcars-types'
import * as helper from '@/common/helper'

interface CarRangeListProps {
  value?: string
  required?: boolean
  label?: string
  variant?: 'filled' | 'standard' | 'outlined'
  onChange?: (value: string) => void
}

const CarRangeList = ({
  value: carRangeValue,
  required,
  label,
  variant,
  onChange
}: CarRangeListProps) => {
  const [value, setValue] = useState('')

  useEffect(() => {
    setValue(carRangeValue || '')
  }, [carRangeValue])

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
        <MenuItem value={bookcarsTypes.CarRange.Mini}>{helper.getCarRange(bookcarsTypes.CarRange.Mini)}</MenuItem>
        <MenuItem value={bookcarsTypes.CarRange.Midi}>{helper.getCarRange(bookcarsTypes.CarRange.Midi)}</MenuItem>
        <MenuItem value={bookcarsTypes.CarRange.Maxi}>{helper.getCarRange(bookcarsTypes.CarRange.Maxi)}</MenuItem>
        <MenuItem value={bookcarsTypes.CarRange.Scooter}>{helper.getCarRange(bookcarsTypes.CarRange.Scooter)}</MenuItem>
      </Select>
    </div>
  )
}

export default CarRangeList
