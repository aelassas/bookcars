import React, { useState, useEffect } from 'react'
import { InputLabel, Select, MenuItem, SelectChangeEvent } from '@mui/material'
import { strings } from '../lang/cars'
import * as bookcarsTypes from 'bookcars-types'

const FuelPolicyList = (
  {
    value: fuelPolicyValue,
    label,
    required,
    variant,
    onChange
  }: {
    value?: string
    label?: string
    required?: boolean
    variant: bookcarsTypes.Variant
    onChange: (value: string) => void
  }
) => {
  const [value, setValue] = useState('')

  useEffect(() => {
    setValue(fuelPolicyValue || '')
  }, [fuelPolicyValue])

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
        <MenuItem value={bookcarsTypes.FuelPolicy.LikeForlike}>{strings.FUEL_POLICY_LIKE_FOR_LIKE}</MenuItem>
        <MenuItem value={bookcarsTypes.FuelPolicy.FreeTank}>{strings.FUEL_POLICY_FREE_TANK}</MenuItem>
      </Select>
    </div>
  )
}

export default FuelPolicyList
