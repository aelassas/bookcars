import React, { useState } from 'react'
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent
} from '@mui/material'
import { DressStyle } from ':bookcars-types'
import { strings } from '../lang/dresses'

interface DressStyleFilterProps {
  onChange: (value: string) => void
  className?: string
}

const DressStyleFilter: React.FC<DressStyleFilterProps> = ({ onChange, className }) => {
  const [value, setValue] = useState('')

  const handleChange = (e: SelectChangeEvent<string>) => {
    const value = e.target.value
    setValue(value)
    onChange(value)
  }

  return (
    <FormControl fullWidth className={className}>
      <InputLabel>{strings.DRESS_STYLE}</InputLabel>
      <Select
        value={value}
        label={strings.DRESS_STYLE}
        onChange={handleChange}
      >
        <MenuItem value="">{strings.ALL}</MenuItem>
        <MenuItem value={DressStyle.Traditional}>{strings.STYLE_TRADITIONAL}</MenuItem>
        <MenuItem value={DressStyle.Modern}>{strings.STYLE_MODERN}</MenuItem>
        <MenuItem value={DressStyle.Vintage}>{strings.STYLE_VINTAGE}</MenuItem>
        <MenuItem value={DressStyle.Designer}>{strings.STYLE_DESIGNER}</MenuItem>
      </Select>
    </FormControl>
  )
}

export default DressStyleFilter