import React, { useState } from 'react'
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent
} from '@mui/material'
import { DressSize } from ':bookcars-types'
import { strings } from '../lang/dresses'

interface DressSizeFilterProps {
  onChange: (value: string) => void
  className?: string
}

const DressSizeFilter: React.FC<DressSizeFilterProps> = ({ onChange, className }) => {
  const [value, setValue] = useState('')

  const handleChange = (e: SelectChangeEvent<string>) => {
    const value = e.target.value
    setValue(value)
    onChange(value)
  }

  return (
    <FormControl fullWidth className={className}>
      <InputLabel>{strings.DRESS_SIZE}</InputLabel>
      <Select
        value={value}
        label={strings.DRESS_SIZE}
        onChange={handleChange}
      >
        <MenuItem value="">{strings.ALL}</MenuItem>
        <MenuItem value={DressSize.XS}>{strings.SIZE_XS}</MenuItem>
        <MenuItem value={DressSize.S}>{strings.SIZE_S}</MenuItem>
        <MenuItem value={DressSize.M}>{strings.SIZE_M}</MenuItem>
        <MenuItem value={DressSize.L}>{strings.SIZE_L}</MenuItem>
        <MenuItem value={DressSize.XL}>{strings.SIZE_XL}</MenuItem>
        <MenuItem value={DressSize.XXL}>{strings.SIZE_XXL}</MenuItem>
        <MenuItem value={Dress