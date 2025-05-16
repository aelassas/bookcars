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
import { strings as commonStrings } from '../lang/common'

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
        <MenuItem value="">{commonStrings.ALL}</MenuItem>
        <MenuItem value={DressSize.Small}>{strings.SIZE_S}</MenuItem>
        <MenuItem value={DressSize.Medium}>{strings.SIZE_M}</MenuItem>
        <MenuItem value={DressSize.Large}>{strings.SIZE_L}</MenuItem>
        <MenuItem value={DressSize.ExtraLarge}>{strings.SIZE_XL}</MenuItem>
      </Select>
    </FormControl>
  )
}

export default DressSizeFilter
