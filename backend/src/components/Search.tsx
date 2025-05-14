import React, { useRef } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { IconButton, TextField, InputAdornment } from '@mui/material'
import { Search as SearchIcon, Clear as ClearIcon } from '@mui/icons-material'
import { strings as commonStrings } from '@/lang/common'

import '@/assets/css/search.css'

const schema = z.object({
  keyword: z.string().optional()
})

type FormFields = z.infer<typeof schema>

interface SearchProps {
  className?: string
  onSubmit?: (value: string) => void
}

const Search = ({
  className,
  onSubmit
}: SearchProps) => {
  const inputRef = useRef<HTMLInputElement>(null)

  const { register, handleSubmit, setValue, control } = useForm<FormFields>({
    resolver: zodResolver(schema),
    mode: 'onSubmit',
  })

  const keyword = useWatch({ control, name: 'keyword' })

  const handleFormSubmit = (data: FormFields) => {
    if (onSubmit) {
      onSubmit(data.keyword || '')
    }
  }

  return (
    <div className={className}>
      <form autoComplete="off" onSubmit={handleSubmit(handleFormSubmit)}>
        <input autoComplete="false" name="hidden" type="text" style={{ display: 'none' }} />
        <TextField
          inputRef={inputRef}
          variant="standard"
          {...register('keyword')}
          placeholder={commonStrings.SEARCH_PLACEHOLDER}
          slotProps={{
            input: {
              endAdornment: keyword ? (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={() => {
                      setValue('keyword', '')
                      inputRef.current?.focus()
                    }}
                  >
                    <ClearIcon style={{ width: 20, height: 20 }} />
                  </IconButton>
                </InputAdornment>
              ) : null
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
