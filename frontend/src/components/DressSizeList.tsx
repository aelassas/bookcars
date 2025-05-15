import React, { useState, useEffect } from 'react'
import {
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  TextFieldVariants
} from '@mui/material'
import { DressSize } from ':bookcars-types'
import { strings } from '../lang/dresses'

interface DressSizeListProps {
  value?: string
  required?: boolean
  label?: string
  variant?: TextFieldVariants
  onChange?: (value: string) => void
}

const DressSizeList = ({
  value: dressSizeValue,
  required,
  label,
  variant,
  onChange
}: DressSizeListProps) => {
  const [value, setValue] = useState('')

  useEffect(() => {
    setValue(dressSizeValue || '')
  }, [dressSizeValue])

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
        <MenuItem value={DressSize.XS}>{strings.SIZE_XS}</MenuItem>
        <MenuItem value={DressSize.S}>{strings.SIZE_S}</MenuItem>
        <MenuItem value={DressSize.M}>{strings.SIZE_M}</MenuItem>
        <MenuItem value={DressSize.L}>{strings.SIZE_L}</MenuItem>
        <MenuItem value={DressSize.XL}>{strings.SIZE_XL}</MenuItem>
        <MenuItem value={DressSize.XXL}>{strings.SIZE_XXL}</MenuItem>
        <MenuItem value={DressSize.Custom}>{strings.SIZE_CUSTOM}</MenuItem>
      </Select>
    </div>
  )
}

export default DressSizeList