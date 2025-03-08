import React, { useState, useEffect } from 'react'
import {
  FormControl,
  FormHelperText,
  MenuItem,
  Checkbox,
  useTheme,
  Chip,
  Typography,
  CircularProgress,
  InputLabel,
  Select,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import useStore from '../../hooks/useStore'

export type SelectOption = {
  id: string | number;
  text: string;
  value: any;
};
interface EditorSelectProps {
  options: Array<SelectOption>;
  value: string;
  name: string;
  onChange(name: string, value: string, isValid: boolean): void;
  variant?: 'standard' | 'filled' | 'outlined';
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  touched?: boolean;
  loading?: boolean;
  multiple?: 'default' | 'chips';
  errMsg?: string;
}

const LoadingIcon = () => <CircularProgress size={5} />

const EditorSelect = ({
  options,
  value,
  name,
  required,
  onChange,
  label,
  disabled,
  touched,
  variant = 'outlined',
  loading,
  multiple,
  placeholder,
  errMsg,
}: EditorSelectProps) => {
  const theme = useTheme()
  const { translations } = useStore()
  const [state, setState] = useState({
    touched: false,
    valid: !!value,
    errorMsg: errMsg || (required
      ? translations?.validation?.required || 'Required'
      : undefined),
  })

  const handleChange = (_value: string | any) => {
    const val = _value
    let isValid = true
    let errorMsg = errMsg
    if (required && (multiple ? !val.length : !val)) {
      isValid = false
      errorMsg = errMsg || translations?.validation?.required || 'Required'
    }
    setState((prev) => ({ ...prev, touched: true, valid: isValid, errorMsg }))
    onChange(name, val, isValid)
  }

  useEffect(() => {
    if (touched) {
      handleChange(value)
    }
    // eslint-disable-next-line
  }, [touched]);

  // const handleTouched = () => {
  //   if (!state.touched) {
  //     setState((prev) => ({ ...prev, touched: true, errorMsg: errMsg || prev.errorMsg }))
  //   }
  // }

  return (
    <>
      <FormControl
        variant={variant || 'outlined'}
        fullWidth
        error={required && state.touched && !state.valid}
        // style={{ minWidth: 230 }}
        disabled={disabled}
      >
        {label && (
          <InputLabel id={`input_${name}`}>
            <Typography variant="body2">{`${label} ${required ? '*' : ''}`}</Typography>
          </InputLabel>
        )}
        <Select
          label={label}
          labelId={`input_${name}`}
          value={value}
          IconComponent={loading ? LoadingIcon : ExpandMoreIcon}
          onChange={(e) => handleChange(e.target.value)}
          multiple={!!multiple}
          classes={{
            select: multiple === 'chips' ? 'flex__wrap' : undefined,
          }}
          renderValue={(selected: string | Array<any> | any) => {
            if (!selected || selected.length === 0) {
              return <em>{label}</em>
            }
            const text = []
            if (multiple) {
              for (const opt of options) {
                if (selected.includes(opt.value)) {
                  text.push([opt.text])
                }
              }
              if (multiple === 'chips') {
                return text.map((t) => (
                  <Chip key={t.toString()} label={t} style={{ margin: '0 2px' }} color="primary" />
                ))
              }
              return text.join(',')
            }
            for (const opt of options) {
              if (selected === opt.value) {
                text.push([opt.text])
              }
            }
            return text.join(',')
          }}
        >
          {placeholder && (
            <MenuItem value="">
              <em>{placeholder}</em>
            </MenuItem>
          )}
          {options.map((op) => (
            <MenuItem value={op.value} key={op.id || op.value}>
              {multiple && <Checkbox checked={value.indexOf(op.value) > -1} color="primary" />}
              {op.text}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormHelperText style={{ color: theme.palette.error.main }}>
        {state.touched && !state.valid && state.errorMsg}
      </FormHelperText>
    </>
  )
}

export { EditorSelect }
