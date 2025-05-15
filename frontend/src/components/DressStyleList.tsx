import React, { useState, useEffect } from 'react'
import {
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  TextFieldVariants
} from '@mui/material'
import { DressStyle } from ':bookcars-types'
import { strings } from '../lang/dresses'

interface DressStyleListProps {
  value?: string
  required?: boolean
  label?: string
  variant?: TextFieldVariants
  onChange?: (value: string) => void
}

const DressStyleList = ({
  value: dressStyleValue,
  required,
  label,
  variant,
  onChange
}: DressStyleListProps) => {
  const [value, setValue] = useState('')

  useEffect(() => {
    setValue(dressStyleValue || '')
  }, [dressStyleValue])

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
        <MenuItem value={DressStyle.Traditional}>{strings.STYLE_TRADITIONAL}</MenuItem>
        <MenuItem value={DressStyle.Modern}>{strings.STYLE_MODERN}</MenuItem>
        <MenuItem value={DressStyle.Vintage}>{strings.STYLE_VINTAGE}</MenuItem>
        <MenuItem value={DressStyle.Designer}>{strings.STYLE_DESIGNER}</MenuItem>
      </Select>
    </div>
  )
}

export default DressStyleList