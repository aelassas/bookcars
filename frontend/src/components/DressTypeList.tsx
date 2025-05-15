import React, { useState, useEffect } from 'react'
import {
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  TextFieldVariants
} from '@mui/material'
import { DressType } from ':bookcars-types'
import { strings } from '../lang/dresses'

interface DressTypeListProps {
  value?: string
  required?: boolean
  label?: string
  variant?: TextFieldVariants
  onChange?: (value: string) => void
}

const DressTypeList = ({
  value: dressTypeValue,
  required,
  label,
  variant,
  onChange
}: DressTypeListProps) => {
  const [value, setValue] = useState('')

  useEffect(() => {
    setValue(dressTypeValue || '')
  }, [dressTypeValue])

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
        <MenuItem value={DressType.Wedding}>{strings.WEDDING}</MenuItem>
        <MenuItem value={DressType.Evening}>{strings.EVENING}</MenuItem>
        <MenuItem value={DressType.Cocktail}>{strings.COCKTAIL}</MenuItem>
        <MenuItem value={DressType.Prom}>{strings.PROM}</MenuItem>
        <MenuItem value={DressType.Other}>{strings.OTHER}</MenuItem>
      </Select>
    </div>
  )
}

export default DressTypeList