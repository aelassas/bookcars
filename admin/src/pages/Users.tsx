import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Chip, Box, TextField, InputAdornment, Stack, Typography } from '@mui/material'
import { Search as SearchIcon, PersonAdd as PersonAddIcon } from '@mui/icons-material'
import * as bookcarsTypes from ':bookcars-types'
import Layout from '@/components/Layout'
import env from '@/config/env.config'
import { strings } from '@/lang/users'
import * as helper from '@/utils/helper'
import UserTypeFilter from '@/components/UserTypeFilter'
import Search from '@/components/Search'
import UserList from '@/components/UserList'

import '@/assets/css/users.css'

// ── Design tokens ──────────────────────────────────────────────
const EMERALD = '#107487'
const GOLD = '#995000'
const OBSIDIAN = '#0F172A'
const CANVAS = 'var(--sr-ink)'

const sectionHeader: React.CSSProperties = {
  color: 'var(--sr-emerald)',
  fontWeight: 600,
  fontSize: 13,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
}

const cardStyle: React.CSSProperties = {
  backgroundColor: 'var(--sr-surface)',
  borderRadius: '16px',
  border: '1px solid var(--sr-border)',
  padding: '24px',
}

const KYC_FILTER_OPTIONS = [
  { label: 'Verified ✓', value: 'verified' },
  { label: 'Unverified', value: 'unverified' },
]

const ROLE_FILTER_OPTIONS = [
  { label: 'All', value: '' },
  { label: 'Admin', value: bookcarsTypes.UserType.Admin },
  { label: 'Supplier', value: bookcarsTypes.UserType.Supplier },
  { label: 'Customer', value: bookcarsTypes.UserType.User },
]

const Users = () => {
  const navigate = useNavigate()

  const [user, setUser] = useState<bookcarsTypes.User>()
  const [admin, setAdmin] = useState(false)
  const [types, setTypes] = useState<bookcarsTypes.UserType[]>()
  const [keyword, setKeyword] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [kycFilter, setKycFilter] = useState('')

  const handleUserTypeFilterChange = (newTypes: bookcarsTypes.UserType[]) => {
    setTypes(newTypes)
  }

  const handleSearch = (newKeyword: string) => {
    setKeyword(newKeyword)
  }

  const onLoad = (_user?: bookcarsTypes.User) => {
    const _admin = helper.admin(_user)
    const _types = _admin
      ? helper.getUserTypes().map((userType) => userType.value)
      : [bookcarsTypes.UserType.Supplier, bookcarsTypes.UserType.User]

    setUser(_user)
    setAdmin(_admin)
    setTypes(_types)
  }

  const roleBadgeColor = (role: string) => {
    if (role === bookcarsTypes.UserType.Admin) {
return OBSIDIAN
}
    if (role === bookcarsTypes.UserType.Supplier) {
return GOLD
}
    return EMERALD
  }

  return (
    <Layout onLoad={onLoad} strict>
      {user && (
        <Box sx={{ background: CANVAS, minHeight: '100vh', p: { xs: 2, md: 3 } }}>
          {/* Page Header */}
          <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, color: 'var(--sr-text)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              Users
            </Typography>
            <Button
              variant="contained"
              size="small"
              startIcon={<PersonAddIcon />}
              onClick={() => navigate('/create-user')}
              sx={{
                background: EMERALD,
                borderRadius: 2,
                fontWeight: 600,
                textTransform: 'none',
                px: 2.5,
                '&:hover': { background: '#047857' },
              }}
            >
              {strings.NEW_USER}
            </Button>
          </Box>

          {/* Filter Bar Card */}
          <Box sx={{ ...cardStyle, mb: 3 }}>
            <Typography sx={{ ...sectionHeader, mb: 2 }}>Search & Filter</Typography>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} useFlexGap alignItems={{ sm: 'center' }} flexWrap={{ xs: 'nowrap', sm: 'wrap' }}>
              {/* Search */}
              <TextField
                placeholder="Search by name, email, or CNIC…"
                size="small"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: 'var(--sr-muted)', fontSize: 18 }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  flex: 1,
                  minWidth: { xs: 0, sm: 240 },
                  '& .MuiOutlinedInput-root': { borderRadius: 2, fontSize: 14 },
                }}
              />

              {/* Role Filter Chips */}
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                {ROLE_FILTER_OPTIONS.map((opt) => (
                  <Chip
                    key={opt.value}
                    label={opt.label}
                    size="small"
                    onClick={() => {
                      setRoleFilter(opt.value)
                      if (opt.value === '') {
                        const allTypes = helper.getUserTypes().map((ut) => ut.value)
                        setTypes(allTypes)
                      } else {
                        setTypes([opt.value as bookcarsTypes.UserType])
                      }
                    }}
                    sx={{
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: 12,
                      borderRadius: '20px',
                      border: roleFilter === opt.value ? 'none' : '1px solid #E2E8F0',
                      background: roleFilter === opt.value ? roleBadgeColor(opt.value) || OBSIDIAN : 'var(--sr-surface-raised)',
                      color: roleFilter === opt.value ? '#fff' : 'var(--sr-muted)',
                      '&:hover': {
                        background: roleFilter === opt.value ? roleBadgeColor(opt.value) || OBSIDIAN : '#E2E8F0',
                      },
                    }}
                  />
                ))}
              </Stack>

              {/* KYC Status Filter */}
              <Stack direction="row" spacing={1}>
                {KYC_FILTER_OPTIONS.map((opt) => (
                  <Chip
                    key={opt.value}
                    label={opt.label}
                    size="small"
                    onClick={() => setKycFilter(kycFilter === opt.value ? '' : opt.value)}
                    sx={{
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: 12,
                      borderRadius: '20px',
                      border: kycFilter === opt.value ? 'none' : '1px solid #E2E8F0',
                      background: kycFilter === opt.value ? (opt.value === 'verified' ? EMERALD : GOLD) : 'var(--sr-surface-raised)',
                      color: kycFilter === opt.value ? '#fff' : 'var(--sr-muted)',
                      '&:hover': {
                        background: kycFilter === opt.value
                          ? opt.value === 'verified' ? EMERALD : GOLD
                          : '#E2E8F0',
                      },
                    }}
                  />
                ))}
              </Stack>
            </Stack>

            {/* Hidden legacy UserTypeFilter for state sync when admin */}
            {admin && (
              <Box sx={{ display: 'none' }}>
                <UserTypeFilter
                  className="user-type-filter"
                  onChange={handleUserTypeFilterChange}
                />
              </Box>
            )}
          </Box>

          {/* User List Card */}
          <Box sx={{ ...cardStyle, p: 0, overflow: 'hidden' }}>
            <UserList
              user={user}
              types={types}
              keyword={keyword}
              checkboxSelection={!env.isMobile && admin}
              hideDesktopColumns={env.isMobile}
            />
          </Box>
        </Box>
      )}
    </Layout>
  )
}

export default Users
