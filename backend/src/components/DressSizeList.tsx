import React, { useState, useEffect } from 'react'
import {
  InputLabel,
  Select,
  MenuItem,
  FormControl,
  SelectChangeEvent
} from '@mui/material'
import * as bookcarsTypes from ':bookcars-types'
import * as helper from '@/common/helper'

interface DressSizeListProps {
  value?: string
  label?: string
  required?: boolean
  onChange?: (value: string) => void
  disabled?: boolean
}

const DressSizeList = ({
  value: dressSizeValue,
  label,
  required,
  onChange,
  disabled
}: DressSizeListProps) => {
  const [value, setValue] = useState('')

  useEffect(() => {
    if (dressSizeValue) {
      setValue(dressSizeValue)
    } else {
      setValue('')
    }
  }, [dressSizeValue])

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
        <MenuItem value={bookcarsTypes.DressSize.ExtraSmall}>
          {helper.getDressSize(bookcarsTypes.DressSize.ExtraSmall)}
        </MenuItem>
        <MenuItem value={bookcarsTypes.DressSize.Small}>
          {helper.getDressSize(bookcarsTypes.DressSize.Small)}
        </MenuItem>
        <MenuItem value={bookcarsTypes.DressSize.Medium}>
          {helper.getDressSize(bookcarsTypes.DressSize.Medium)}
        </MenuItem>
        <MenuItem value={bookcarsTypes.DressSize.Large}>
          {helper.getDressSize(bookcarsTypes.DressSize.Large)}
        </MenuItem>
        <MenuItem value={bookcarsTypes.DressSize.ExtraLarge}>
          {helper.getDressSize(bookcarsTypes.DressSize.ExtraLarge)}
        </MenuItem>
        <MenuItem value={bookcarsTypes.DressSize.DoubleExtraLarge}>
          {helper.getDressSize(bookcarsTypes.DressSize.DoubleExtraLarge)}
        </MenuItem>
        <MenuItem value={bookcarsTypes.DressSize.Custom}>
          {helper.getDressSize(bookcarsTypes.DressSize.Custom)}
        </MenuItem>
      </Select>
    </FormControl>
  )
}

export default DressSizeList
