import React, { useState, useEffect } from 'react'
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent
} from '@mui/material'
import { DressType } from ':bookcars-types'
import { strings } from '../lang/dresses'

interface DressTypeFilterProps {
  onChange: (value: string) => void
  className?: string
}

const DressTypeFilter: React.FC<DressTypeFilterProps> = ({ onChange, className }) => {
  const [value, setValue] = useState('')

  const handleChange = (e: SelectChangeEvent<string>) => {
    const value = e.target.value
    setValue(value)
    onChange(value)
  }

  return (
    <FormControl fullWidth className={className}>
      <InputLabel>{strings.DRESS_TYPE}</InputLabel>
      <Select
        value={value}
        label={strings.DRESS_TYPE}
        onChange={handleChange}
      >
        <MenuItem value="">{strings.ALL}</MenuItem>
        <MenuItem value={DressType.Wedding}>{strings.WEDDING}</MenuItem>
        <MenuItem value={DressType.Evening}>{strings.EVENING}</MenuItem>
        <MenuItem value={DressType.Cocktail}>{strings.COCKTAIL}</MenuItem>
        <MenuItem value={DressType.Prom}>{strings.PROM}</MenuItem>
        <MenuItem value={DressType.Other}>{strings.OTHER}</MenuItem>
      </Select>
    </FormControl>
  )
}

export default DressTypeFilter