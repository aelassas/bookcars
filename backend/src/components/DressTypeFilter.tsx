import React, { useState, useEffect } from 'react'
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent
} from '@mui/material'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/dresses'
import * as helper from '@/common/helper'

interface DressTypeFilterProps {
  className?: string
  onChange?: (value: string) => void
}

const DressTypeFilter = ({
  className,
  onChange
}: DressTypeFilterProps) => {
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
      <InputLabel id="type-label">{strings.DRESS_TYPE}</InputLabel>
      <Select
        labelId="type-label"
        value={value}
        label={strings.DRESS_TYPE}
        onChange={handleChange}
        autoWidth
      >
        <MenuItem value="">{commonStrings.ALL}</MenuItem>
        {bookcarsHelper.getAllDressTypes().map((type) => (
          <MenuItem key={type} value={type}>{helper.getDressType(type)}</MenuItem>
        ))}
      </Select>
    </FormControl>
  )
}

export default DressTypeFilter
