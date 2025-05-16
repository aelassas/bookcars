import React, { useState } from 'react'
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent
} from '@mui/material'
import { DressMaterial } from ':bookcars-types'
import { strings } from '../lang/dresses'

interface DressMaterialFilterProps {
  onChange: (value: string) => void
  className?: string
}

const DressMaterialFilter: React.FC<DressMaterialFilterProps> = ({ onChange, className }) => {
  const [value, setValue] = useState('')

  const handleChange = (e: SelectChangeEvent<string>) => {
    const value = e.target.value
    setValue(value)
    onChange(value)
  }

  return (
    <FormControl fullWidth className={className}>
      <InputLabel>{strings.MATERIAL}</InputLabel>
      <Select
        value={value}
        label={strings.MATERIAL}
        onChange={handleChange}
      >
        <MenuItem value="">{strings.ALL}</MenuItem>
        <MenuItem value={DressMaterial.Silk}>{strings.SILK}</MenuItem>
        <MenuItem value={DressMaterial.Cotton}>{strings.COTTON}</MenuItem>
        <MenuItem value={DressMaterial.Lace}>{strings.LACE}</MenuItem>
        <MenuItem value={DressMaterial.Satin}>{strings.SATIN}</MenuItem>
        <MenuItem value={DressMaterial.Chiffon}>{strings.CHIFFON}</MenuItem>
      </Select>
    </FormControl>
  )
}

export default DressMaterialFilter
