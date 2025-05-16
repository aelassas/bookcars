import React, { useState, useEffect } from 'react'
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent
} from '@mui/material'
import * as bookcarsTypes from ':bookcars-types'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/dresses'
import * as helper from '@/common/helper'

interface DressSizeFilterProps {
  className?: string
  onChange?: (value: string) => void
}

const DressSizeFilter = ({
  className,
  onChange
}: DressSizeFilterProps) => {
  const [value, setValue] = useState('')

  const handleChange = (e: SelectChangeEvent<string>) => {
    const value = e.target.value
    setValue(value)

    if (onChange) {
      onChange(value)
    }
  }

  return (
    <FormControl className={className}>
      <InputLabel id="size-label">{strings.DRESS_SIZE}</InputLabel>
      <Select
        labelId="size-label"
        value={value}
        label={strings.DRESS_SIZE}
        onChange={handleChange}
        autoWidth
      >
        <MenuItem value="">{commonStrings.ALL}</MenuItem>
        <MenuItem value={bookcarsTypes.DressSize.Small}>{helper.getDressSize(bookcarsTypes.DressSize.Small)}</MenuItem>
        <MenuItem value={bookcarsTypes.DressSize.Medium}>{helper.getDressSize(bookcarsTypes.DressSize.Medium)}</MenuItem>
        <MenuItem value={bookcarsTypes.DressSize.Large}>{helper.getDressSize(bookcarsTypes.DressSize.Large)}</MenuItem>
        <MenuItem value={bookcarsTypes.DressSize.ExtraLarge}>{helper.getDressSize(bookcarsTypes.DressSize.ExtraLarge)}</MenuItem>
      </Select>
    </FormControl>
  )
}

export default DressSizeFilter
