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

interface DressMaterialListProps {
  value?: string
  label?: string
  required?: boolean
  onChange?: (value: string) => void
  disabled?: boolean
}

const DressMaterialList = ({
  value: dressMaterialValue,
  label,
  required,
  onChange,
  disabled
}: DressMaterialListProps) => {
  const [value, setValue] = useState('')

  useEffect(() => {
    if (dressMaterialValue) {
      setValue(dressMaterialValue)
    } else {
      setValue('')
    }
  }, [dressMaterialValue])

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
        <MenuItem value={bookcarsTypes.DressMaterial.Silk}>
          {helper.getDressMaterial(bookcarsTypes.DressMaterial.Silk)}
        </MenuItem>
        <MenuItem value={bookcarsTypes.DressMaterial.Cotton}>
          {helper.getDressMaterial(bookcarsTypes.DressMaterial.Cotton)}
        </MenuItem>
        <MenuItem value={bookcarsTypes.DressMaterial.Lace}>
          {helper.getDressMaterial(bookcarsTypes.DressMaterial.Lace)}
        </MenuItem>
        <MenuItem value={bookcarsTypes.DressMaterial.Satin}>
          {helper.getDressMaterial(bookcarsTypes.DressMaterial.Satin)}
        </MenuItem>
        <MenuItem value={bookcarsTypes.DressMaterial.Chiffon}>
          {helper.getDressMaterial(bookcarsTypes.DressMaterial.Chiffon)}
        </MenuItem>
        <MenuItem value={bookcarsTypes.DressMaterial.Other}>
          {helper.getDressMaterial(bookcarsTypes.DressMaterial.Other)}
        </MenuItem>
      </Select>
    </FormControl>
  )
}

export default DressMaterialList
