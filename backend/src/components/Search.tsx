import React, { useState } from 'react'
import { IconButton, TextField } from '@mui/material'
import { Search as SearchIcon, Clear as ClearIcon } from '@mui/icons-material'
import { strings as commonStrings } from '../lang/common'

import '../assets/css/search.css'

interface SearchProps {
  className?: string,
  onSubmit?: (value: string) => void
}

function Search({
  className,
  onSubmit
}: SearchProps) {
  const [keyword, setKeyword] = useState('')

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setKeyword(e.target.value)
  }

  const handleSearch = () => {
    if (onSubmit) {
      onSubmit(keyword)
    }
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  return (
    <div className={className}>
      <TextField
        variant="standard"
        value={keyword}
        onKeyDown={handleSearchKeyDown}
        onChange={handleSearchChange}
        placeholder={commonStrings.SEARCH_PLACEHOLDER}
        InputProps={{
          endAdornment: keyword ? (
            <IconButton
              size="small"
              onClick={() => {
                setKeyword('')
              }}
            >
              <ClearIcon style={{ width: 20, height: 20 }} />
            </IconButton>
          ) : (
            <></>
          ),
        }}
        autoComplete="off"
        className="sc-search"
        id="search"
      />
      <IconButton onClick={handleSearch}>
        <SearchIcon />
      </IconButton>
    </div>
  )
}

export default Search
