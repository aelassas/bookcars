import React, { useState } from 'react'
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent
} from '@mui/material'
import { strings } from '../lang/dresses'

interface RentalsCountFilterProps {
  onChange: (value: string) => void
  className?: string
}

const RentalsCountFilter: React.FC<RentalsCountFilterProps> = ({ onChange, className }) => {
  const [value, setValue] = useState('')

  const handleChange = (e: SelectChangeEvent<string>) => {
    const value = e.target.value
    setValue(value)
    onChange(value)
  }

  return (
    <FormControl fullWidth className={className}>
      <InputLabel>{strings.RENTALS_COUNT || 'Rentals'}</InputLabel>
      <Select
        value={value}
        label={strings.RENTALS_COUNT || 'Rentals'}
        onChange={handleChange}
      >
        <MenuItem value="">{strings.ALL}</MenuItem>
        <MenuItem value="0">0 {strings.RENTALS_COUNT || 'Rentals'}</MenuItem>
        <MenuItem value="1-5">1-5 {strings.RENTALS_COUNT || 'Rentals'}</MenuItem>
        <MenuItem value="6-10">6-10 {strings.RENTALS_COUNT || 'Rentals'}</MenuItem>
        <MenuItem value="11-20">11-20 {strings.RENTALS_COUNT || 'Rentals'}</MenuItem>
        <MenuItem value="20+">{strings.MORE_THAN} 20 {strings.RENTALS_COUNT || 'Rentals'}</MenuItem>
      </Select>
    </FormControl>
  )
}

export default RentalsCountFilter
