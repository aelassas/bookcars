import React, { useState, useEffect } from 'react'
import {
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  TextFieldVariants
} from '@mui/material'
import * as bookcarsTypes from ':bookcars-types'
import { strings } from '@/lang/cars'

interface GearboxListProps {
  value?: string
  label?: string
  required?: boolean
  variant?: TextFieldVariants
  onChange?: (value: string) => void
}

const GearboxList = ({
  value: gearboxListValue,
  label,
  required,
  variant,
  onChange
}: GearboxListProps) => {
  const [value, setValue] = useState('')

  useEffect(() => {
    setValue(gearboxListValue || '')
  }, [gearboxListValue])

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
        <MenuItem value={bookcarsTypes.GearboxType.Automatic}>{strings.GEARBOX_AUTOMATIC}</MenuItem>
        <MenuItem value={bookcarsTypes.GearboxType.Manual}>{strings.GEARBOX_MANUAL}</MenuItem>
      </Select>
    </div>
  )
}

export default GearboxList
