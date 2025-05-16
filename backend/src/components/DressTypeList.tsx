import React, { useState, useEffect } from 'react'
import {
  InputLabel,
  Select,
  MenuItem,
  FormControl,
  SelectChangeEvent
} from '@mui/material'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import * as helper from '@/common/helper'

interface DressTypeListProps {
  value?: string
  label?: string
  required?: boolean
  onChange?: (value: string) => void
  disabled?: boolean
}

const DressTypeList = ({
  value: dressTypeValue,
  label,
  required,
  onChange,
  disabled
}: DressTypeListProps) => {
  const [value, setValue] = useState('')

  useEffect(() => {
    if (dressTypeValue) {
      setValue(dressTypeValue)
    } else {
      setValue('')
    }
  }, [dressTypeValue])

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
        {bookcarsHelper.getAllDressTypes().map((dressType) => (
          <MenuItem key={dressType} value={dressType}>
            {helper.getDressType(dressType)}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  )
}

export default DressTypeList
