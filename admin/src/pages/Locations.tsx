import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  Box,
  TextField,
  InputAdornment,
  Chip,
  Stack,
} from '@mui/material'
import {
  Search as SearchIcon,
  AddLocationAlt as AddLocationAltIcon,
} from '@mui/icons-material'
import * as bookcarsTypes from ':bookcars-types'
import Layout from '@/components/Layout'
import { strings } from '@/lang/locations'
import LocationList from '@/components/LocationList'

import '@/assets/css/locations.css'

const CARD_STYLE = {
  backgroundColor: 'var(--sr-surface)',
  borderRadius: '16px',
  border: '1px solid #E2E8F0',
  padding: '20px 24px',
}

const SECTION_TITLE_STYLE = {
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  fontWeight: 600,
  fontSize: '13px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.08em',
  color: 'var(--sr-emerald)',
  margin: 0,
}

const Locations = () => {
  const navigate = useNavigate()

  const [keyword, setKeyword] = useState('')
  const [inputVal, setInputVal] = useState('')
  const [rowCount, setRowCount] = useState(-1)
  const [countryFilter, setCountryFilter] = useState<string>('All')

  const handleSearch = () => {
    setKeyword(inputVal)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
handleSearch()
}
  }

  const handleLocationListLoad: bookcarsTypes.DataEvent<bookcarsTypes.Location> = (data) => {
    if (data) {
      setRowCount(data.rowCount)
    }
  }

  const handleLocationDelete = (_rowCount: number) => {
    setRowCount(_rowCount)
  }

  const onLoad = () => { }

  const countryChips = ['All', 'PK', 'AE', 'GB', 'US']

  return (
    <Layout onLoad={onLoad} strict>
      <Box sx={{ p: 3, backgroundColor: 'var(--sr-surface-raised)', minHeight: '100vh' }}>
        {/* Page Header */}
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <p style={SECTION_TITLE_STYLE}>Network</p>
            <h2 style={{ margin: '4px 0 0', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: '24px', color: 'var(--sr-text)' }}>
              Hubs &amp; Locations
            </h2>
          </Box>
          {rowCount > -1 && (
            <Button
              variant="contained"
              startIcon={<AddLocationAltIcon />}
              onClick={() => navigate('/create-location')}
              sx={{
                background: '#107487',
                borderRadius: '10px',
                fontWeight: 600,
                fontSize: '14px',
                textTransform: 'none',
                px: 3,
                py: 1.2,
                '&:hover': { background: '#047857' },
              }}
            >
              {strings.NEW_LOCATION}
            </Button>
          )}
        </Box>

        {/* Top Bar Card */}
        <Box sx={{ ...CARD_STYLE, mb: 3 }}>
          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
            {/* Search */}
            <TextField
              placeholder="Search by hub name or city…"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={handleKeyDown}
              size="small"
              sx={{
                flex: 1,
                minWidth: 240,
                '& .MuiOutlinedInput-root': {
                  borderRadius: '10px',
                  '&:hover fieldset': { borderColor: '#059669' },
                  '&.Mui-focused fieldset': { borderColor: '#059669' },
                },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: 'var(--sr-muted)', fontSize: 18 }} />
                  </InputAdornment>
                ),
              }}
            />

            {/* Country Filter Chips */}
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {countryChips.map((c) => (
                <Chip
                  key={c}
                  label={c === 'All' ? 'All Countries' : `🌐 ${c}`}
                  size="small"
                  onClick={() => setCountryFilter(c)}
                  sx={{
                    borderRadius: '8px',
                    fontWeight: 500,
                    fontSize: '12px',
                    cursor: 'pointer',
                    background: countryFilter === c ? '#107487' : 'var(--sr-surface-raised)',
                    color: countryFilter === c ? '#fff' : 'var(--sr-muted)',
                    border: countryFilter === c ? 'none' : '1px solid #E2E8F0',
                    '&:hover': {
                      background: countryFilter === c ? '#047857' : '#E2E8F0',
                    },
                  }}
                />
              ))}
            </Stack>

            {/* Search Button */}
            <Button
              variant="contained"
              onClick={handleSearch}
              sx={{
                background: '#107487',
                borderRadius: '10px',
                fontWeight: 600,
                fontSize: '13px',
                textTransform: 'none',
                px: 2.5,
                '&:hover': { background: '#047857' },
              }}
            >
              Search
            </Button>
          </Stack>

          {rowCount > 0 && (
            <Box sx={{ mt: 2 }}>
              <Chip
                label={`${rowCount} ${rowCount > 1 ? 'Hubs' : 'Hub'}`}
                size="small"
                sx={{
                  backgroundColor: 'var(--sr-surface-raised)',
                  color: 'var(--sr-emerald)',
                  fontWeight: 600,
                  border: '1px solid #BBF7D0',
                  borderRadius: '8px',
                }}
              />
            </Box>
          )}
        </Box>

        {/* Location List */}
        <Box sx={{ ...CARD_STYLE }}>
          <LocationList
            keyword={keyword}
            onLoad={handleLocationListLoad}
            onDelete={handleLocationDelete}
          />
        </Box>
      </Box>
    </Layout>
  )
}

export default Locations
