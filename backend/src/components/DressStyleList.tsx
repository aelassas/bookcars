import React, { useState, useEffect } from 'react'
import {
  InputLabel,
  Select,
  MenuItem,
  FormControl,
  SelectChangeEvent
} from '@mui/material'
import { strings } from '@/lang/dresses'

interface DressStyleListProps {
  value?: string
  label?: string
  required?: boolean
  onChange?: (value: string) => void
  disabled?: boolean
}

const DressStyleList = ({
  value: dressStyleValue,
  label,
  required,
  onChange,
  disabled
}: DressStyleListProps) => {
  const [value, setValue] = useState('')

  useEffect(() => {
    if (dressStyleValue) {
      setValue(dressStyleValue)
    } else {
      setValue('')
    }
  }, [dressStyleValue])

  const handleChange = (e: SelectChangeEvent<string>) => {
    setValue(e.target.value)
    if (onChange) {
      onChange(e.target.value)
    }
  }

  return (
    <FormControl fullWidth variant="standard" required={required} disabled={disabled}>
      <InputLabel shrink>{label}</InputLabel>
      <Select
        value={value}
        onChange={handleChange}
        displayEmpty
      >
        <MenuItem value="">
          <em>None</em>
        </MenuItem>
        <MenuItem value="traditional">
          {strings.STYLE_TRADITIONAL}
        </MenuItem>
        <MenuItem value="modern">
          {strings.STYLE_MODERN}
        </MenuItem>
        <MenuItem value="vintage">
          {strings.STYLE_VINTAGE}
        </MenuItem>
        <MenuItem value="designer">
          {strings.STYLE_DESIGNER}
        </MenuItem>
      </Select>
    </FormControl>
  )
}

export default DressStyleList
