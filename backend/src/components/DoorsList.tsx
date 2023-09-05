import React, { useState, useEffect } from 'react'
import { InputLabel, Select, MenuItem, SelectChangeEvent } from '@mui/material'
import * as bookcarsTypes from 'bookcars-types'

const DoorsList = ({
  value: doorsListValue,
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
    setValue(doorsListValue || '')
  }, [doorsListValue])

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
      </Select>
    </div>
  )
}

export default DoorsList
