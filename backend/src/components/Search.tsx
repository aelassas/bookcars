import React, { useState } from 'react'
import { strings as commonStrings } from '../lang/common'
import { IconButton, TextField } from '@mui/material'
import { Search as SearchIcon, Clear as ClearIcon } from '@mui/icons-material'

import '../assets/css/search.css'

const Search = ({
  className,
  onSubmit
}: {
  className?: string,
  onSubmit: (value: string) => void
}) => {
  const [keyword, setKeyword] = useState('')

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setKeyword(e.target.value)
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const handleSearch = () => {
    if (onSubmit) {
      onSubmit(keyword)
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
