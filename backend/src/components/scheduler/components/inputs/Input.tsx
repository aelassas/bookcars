import React, { useState, useEffect } from 'react'
import { TextField, Typography } from '@mui/material'
import useStore from '../../hooks/useStore'

interface EditorInputProps {
  variant?: 'standard' | 'filled' | 'outlined';
  label?: string;
  placeholder?: string;
  required?: boolean;
  min?: number;
  max?: number;
  email?: boolean;
  decimal?: boolean;
  disabled?: boolean;
  multiline?: boolean;
  rows?: number;
  value: string;
  name: string;
  onChange(name: string, value: string, isValid: boolean): void;
  touched?: boolean;
}

const EditorInput = ({
  variant = 'outlined',
  label,
  placeholder,
  value,
  name,
  required,
  min,
  max,
  email,
  decimal,
  onChange,
  disabled,
  multiline,
  rows,
  touched,
}: EditorInputProps) => {
  const [state, setState] = useState({
    touched: false,
    valid: false,
    errorMsg: '',
  })
  const { translations } = useStore()

  const handleChange = (_value: string) => {
    const val = _value
    let isValid = true
    let errorMsg = ''
    if (email) {
      const reg = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
      isValid = reg.test(val) && isValid
      errorMsg = translations?.validation?.invalidEmail || 'Invalid Email'
    }
    if (decimal) {
      const reg = /^[0-9]+(\.[0-9]*)?$/
      isValid = reg.test(val) && isValid
      errorMsg = translations?.validation?.onlyNumbers || 'Only Numbers Allowed'
    }
    if (min && `${val}`.trim().length < min) {
      isValid = false
      errorMsg = typeof translations?.validation?.min === 'function'
        ? translations?.validation?.min(min)
        : translations?.validation?.min || `Minimum ${min} letters`
    }
    if (max && `${val}`.trim().length > max) {
      isValid = false
      errorMsg = typeof translations?.validation?.max === 'function'
        ? translations?.validation?.max(max)
        : translations?.validation?.max || `Maximum ${max} letters`
    }
    if (required && `${val}`.trim().length <= 0) {
      isValid = false
      errorMsg = translations?.validation?.required || 'Required'
    }
    setState({ touched: true, valid: isValid, errorMsg })
    onChange(name, val, isValid)
  }

  useEffect(() => {
    if (touched) {
      handleChange(value)
    }
    // eslint-disable-next-line
  }, [touched]);

  return (
    <TextField
      variant={variant}
      label={label && <Typography variant="body2">{`${label} ${required ? '*' : ''}`}</Typography>}
      value={value}
      name={name}
      onChange={(e) => handleChange(e.target.value)}
      disabled={disabled}
      error={state.touched && !state.valid}
      helperText={state.touched && !state.valid && state.errorMsg}
      multiline={multiline}
      rows={rows}
      style={{ width: '100%' }}
      InputProps={{
        placeholder: placeholder || '',
      }}
    />
  )
}

export { EditorInput }
