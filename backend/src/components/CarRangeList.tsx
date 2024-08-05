import React, { useState, useEffect } from 'react'
import {
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent
} from '@mui/material'
import * as bookcarsTypes from ':bookcars-types'

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
    console.log(e.target.value)
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
        <MenuItem value={bookcarsTypes.CarRange.Mini}>MINI</MenuItem>
        <MenuItem value={bookcarsTypes.CarRange.Midi}>MIDI</MenuItem>
        <MenuItem value={bookcarsTypes.CarRange.Maxi}>MAXI</MenuItem>
        <MenuItem value={bookcarsTypes.CarRange.Scooter}>SCOOTER</MenuItem>
      </Select>
    </div>
  )
}

export default CarRangeList
