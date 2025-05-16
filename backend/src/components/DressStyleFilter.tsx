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

interface DressStyleFilterProps {
  className?: string
  onChange?: (value: string) => void
}

const DressStyleFilter = ({
  className,
  onChange
}: DressStyleFilterProps) => {
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
      <InputLabel id="style-label">{strings.DRESS_STYLE}</InputLabel>
      <Select
        labelId="style-label"
        value={value}
        label={strings.DRESS_STYLE}
        onChange={handleChange}
        autoWidth
      >
        <MenuItem value="">{commonStrings.ALL}</MenuItem>
        <MenuItem value="traditional">{strings.STYLE_TRADITIONAL}</MenuItem>
        <MenuItem value="modern">{strings.STYLE_MODERN}</MenuItem>
        <MenuItem value="vintage">{strings.STYLE_VINTAGE}</MenuItem>
        <MenuItem value="designer">{strings.STYLE_DESIGNER}</MenuItem>
      </Select>
    </FormControl>
  )
}

export default DressStyleFilter
