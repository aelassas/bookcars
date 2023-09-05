import React, { useState, useEffect } from 'react'
import { InputLabel, Select, MenuItem, SelectChangeEvent } from '@mui/material'
import * as bookcarsTypes from 'bookcars-types'

const SeatsList = ({
  value: seatsListValue,
  label,
  required,
  variant,
  onChange
}: {
  value?: string
  label?: string
  required?: boolean
  variant?: bookcarsTypes.Variant
  onChange: (value: string) => void
}) => {
  const [value, setValue] = useState('')

  useEffect(() => {
    setValue(seatsListValue || '')
  }, [seatsListValue])

  const handleChange = (e: SelectChangeEvent<string>) => {
    const value = e.target.value || ''
    setValue(value)

    if (onChange) {
      onChange(value)
    }
  }

  return (
    <div>
      <InputLabel className={required ? 'required' : ''}>{label}</InputLabel>
      <Select label={label} value={value} onChange={handleChange} variant={variant || 'standard'} required={required} fullWidth>
        <MenuItem value={2}>2</MenuItem>
        <MenuItem value={3}>3</MenuItem>
        <MenuItem value={4}>4</MenuItem>
        <MenuItem value={5}>5</MenuItem>
        <MenuItem value={6}>6</MenuItem>
        <MenuItem value={7}>7</MenuItem>
        <MenuItem value={8}>8</MenuItem>
        <MenuItem value={9}>9</MenuItem>
      </Select>
    </div>
  )
}

export default SeatsList
