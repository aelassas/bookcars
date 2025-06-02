import React from 'react'
import { TextField, InputAdornment, IconButton } from '@mui/material'
import { Search as SearchIcon, Clear as ClearIcon } from '@mui/icons-material'

interface SearchBoxProps {
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onKeyDown?: (e: React.KeyboardEvent<HTMLElement>) => void
  onClear?: () => void
  placeholder?: string
  disabled?: boolean
}

const SearchBox: React.FC<SearchBoxProps> = ({
  value,
  onChange,
  onKeyDown,
  onClear,
  placeholder = 'Search...',
  disabled = false
}) => {
  return (
    <TextField
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      disabled={disabled}
      fullWidth
      variant="outlined"
      size="small"
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon />
          </InputAdornment>
        ),
        endAdornment: value && onClear && (
          <InputAdornment position="end">
            <IconButton
              aria-label="clear search"
              onClick={onClear}
              edge="end"
              size="small"
            >
              <ClearIcon />
            </IconButton>
          </InputAdornment>
        ),
      }}
    />
  )
}

export default SearchBox
