import React, { useState, useRef } from 'react'
import { IconButton, TextField } from '@mui/material'
import { Search as SearchIcon, Clear as ClearIcon } from '@mui/icons-material'
import { strings as commonStrings } from '@/lang/common'

import '@/assets/css/search.css'

interface SearchProps {
  className?: string
  onSubmit?: (value: string) => void
}

const Search = ({
  className,
  onSubmit
}: SearchProps) => {
  const [keyword, setKeyword] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setKeyword(e.target.value)
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement> | React.KeyboardEvent<HTMLElement>) => {
    e.preventDefault()

    if (onSubmit) {
      onSubmit(keyword)
    }
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Enter') {
      handleSubmit(e)
    }
  }

  return (
    <div className={className}>
      <form autoComplete="off" onSubmit={handleSubmit}>
        <input autoComplete="false" name="hidden" type="text" style={{ display: 'none' }} />
        <TextField
          inputRef={inputRef}
          variant="standard"
          value={keyword}
          onKeyDown={handleSearchKeyDown}
          onChange={handleSearchChange}
          placeholder={commonStrings.SEARCH_PLACEHOLDER}
          slotProps={{
            input: {
              endAdornment: keyword ? (
                <IconButton
                  size="small"
                  onClick={() => {
                    setKeyword('')
                    inputRef.current?.focus()
                  }}
                >
                  <ClearIcon style={{ width: 20, height: 20 }} />
                </IconButton>
              ) : (
                <></>
              ),
            }
          }}
          className="sc-search"
          id="search"
        />
        <IconButton type="submit">
          <SearchIcon />
        </IconButton>
      </form>
    </div>
  )
}

export default Search
