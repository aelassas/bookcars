import React, { useState, useEffect } from 'react'
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent
} from '@mui/material'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/dresses'

interface RentalsCountFilterProps {
  className?: string
  onChange?: (value: string) => void
}

const RentalsCountFilter = ({
  className,
  onChange
}: RentalsCountFilterProps) => {
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
      <InputLabel id="rentals-count-label">{strings.RENTALS_COUNT}</InputLabel>
      <Select
        labelId="rentals-count-label"
        value={value}
        label={strings.RENTALS_COUNT}
        onChange={handleChange}
        autoWidth
      >
        <MenuItem value="">{commonStrings.ALL}</MenuItem>
        <MenuItem value="0">0</MenuItem>
        <MenuItem value="1-5">1-5</MenuItem>
        <MenuItem value="6-10">6-10</MenuItem>
        <MenuItem value="11-20">11-20</MenuItem>
        <MenuItem value="20+">20+</MenuItem>
      </Select>
    </FormControl>
  )
}

export default RentalsCountFilter
