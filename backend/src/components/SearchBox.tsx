import React, { useState } from 'react'
import { InputAdornment, IconButton, TextField } from '@mui/material'
import { Search as SearchIcon, Clear as ClearIcon } from '@mui/icons-material'

interface SearchBoxProps {
  value?: string
  placeholder?: string
  onChange?: (value: string) => void
  onSubmit?: (value: string) => void
  className?: string
}

const SearchBox: React.FC<SearchBoxProps> = ({
  value = '',
  placeholder = 'Search...',
  onChange,
  onSubmit,
  className
}) => {
  const [searchValue, setSearchValue] = useState(value)

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value
    setSearchValue(newValue)
    if (onChange) {
      onChange(newValue)
    }
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (onSubmit) {
      onSubmit(searchValue)
    }
  }

  const handleClear = () => {
    setSearchValue('')
    if (onChange) {
      onChange('')
    }
    if (onSubmit) {
      onSubmit('')
    }
  }

  return (
    <form onSubmit={handleSubmit} className={className}>
      <TextField
        value={searchValue}
        onChange={handleChange}
        placeholder={placeholder}
        variant="outlined"
        size="small"
        fullWidth
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <IconButton type="submit" size="small">
                <SearchIcon />
              </IconButton>
            </InputAdornment>
          ),
          endAdornment: searchValue && (
            <InputAdornment position="end">
              <IconButton onClick={handleClear} size="small">
                <ClearIcon />
              </IconButton>
            </InputAdornment>
          ),
        }}
      />
    </form>
  )
}

export default SearchBox
