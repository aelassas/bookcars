import React, { useState, useEffect } from 'react'
import { InputLabel, Select, MenuItem, SelectChangeEvent } from '@mui/material'
import { strings } from '../lang/cars'
import * as bookcarsTypes from 'bookcars-types'

const GearboxList = ({
  value: gearboxListValue,
  label,
  required,
  variant,
  onChange
}: {
  value?: string
  label?: string
  required?: boolean
  variant?: bookcarsTypes.Variant
  onChange: (value: string) => void
}) => {
  const [value, setValue] = useState('')

  useEffect(() => {
    setValue(gearboxListValue || '')
  }, [gearboxListValue])

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
        <MenuItem value={bookcarsTypes.GearboxType.Automatic}>{strings.GEARBOX_AUTOMATIC}</MenuItem>
        <MenuItem value={bookcarsTypes.GearboxType.Manual}>{strings.GEARBOX_MANUAL}</MenuItem>
      </Select>
    </div>
  )
}

export default GearboxList
