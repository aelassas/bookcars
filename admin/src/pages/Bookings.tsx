import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  Box,
  TextField,
  Chip,
  Stack,
  InputAdornment,
  IconButton,
  Tooltip,
} from '@mui/material'
import {
  Search as SearchIcon,
  ContentCopy as CopyIcon,
  CheckCircle as CheckCircleIcon,
  CheckCircle,
  VerifiedUser as VerifyIcon,
  MonetizationOn as ReleaseIcon,
  Visibility as ViewIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material'
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import Layout from '@/components/Layout'
import env from '@/config/env.config'
import { strings } from '@/lang/bookings'
import * as helper from '@/utils/helper'
import BookingList from '@/components/BookingList'
import SupplierFilter from '@/components/SupplierFilter'
import StatusFilter from '@/components/StatusFilter'
import BookingFilter from '@/components/BookingFilter'
import * as SupplierService from '@/services/SupplierService'

import '@/assets/css/bookings.css'

// ─── Design tokens ───────────────────────────────────────────────────────────
const EMERALD = '#107487'
const EMERALD_HOVER = '#047857'
const GOLD = '#995000'
const CRIMSON = '#DC2626'
const CANVAS = 'var(--sr-ink)'
const CARD_BG = 'var(--sr-surface)'
const CARD_BORDER = '#E2E8F0'

// ─── Status filter chips config ───────────────────────────────────────────────
const STATUS_CHIPS = [
  { label: 'All', value: 'all' },
  { label: 'Confirmed ✓', value: bookcarsTypes.BookingStatus.PaidInFull },
  { label: 'Pending KYC ⏳', value: bookcarsTypes.BookingStatus.Pending },
  { label: 'Active 🚗', value: bookcarsTypes.BookingStatus.Reserved },
  { label: 'Completed', value: bookcarsTypes.BookingStatus.Paid },
  { label: 'Cancelled', value: bookcarsTypes.BookingStatus.Cancelled },
] as const

// ─── Escrow pill helper ───────────────────────────────────────────────────────
function EscrowPill({ status }: { status?: string }) {
  if (!status) {
return null
}
  if (status === 'deposit_locked') {
    return (
      <Chip
        label="20% Locked 🔒"
        size="small"
        sx={{ background: GOLD, color: '#fff', fontWeight: 600, fontSize: 12 }}
      />
    )
  }
  if (status === 'deposit_refunded') {
    return (
      <Chip
        label="Deposit Refunded ↺"
        size="small"
        sx={{ background: EMERALD, color: '#fff', fontWeight: 600, fontSize: 12 }}
      />
    )
  }
  if (status === 'overdue') {
    return (
      <Chip
        label="Overdue 🚨"
        size="small"
        sx={{ background: CRIMSON, color: '#fff', fontWeight: 600, fontSize: 12 }}
      />
    )
  }
  return <Chip label={status} size="small" />
}

// ─── Booking ID copyable chip ─────────────────────────────────────────────────
function BookingIdChip({ id }: { id: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(id).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <Box
        component="span"
        sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, letterSpacing: '0.02em' }}
      >
        {id.slice(-8).toUpperCase()}
      </Box>
      <Tooltip title={copied ? 'Copied!' : 'Copy ID'}>
        <IconButton size="small" onClick={handleCopy} sx={{ p: 0.3 }}>
          {copied ? <CheckCircle sx={{ fontSize: 14, color: 'var(--sr-emerald)' }} /> : <CopyIcon sx={{ fontSize: 14 }} />}
        </IconButton>
      </Tooltip>
    </Box>
  )
}

// ─── DataGrid columns ─────────────────────────────────────────────────────────
const buildColumns = (navigate: ReturnType<typeof useNavigate>): GridColDef[] => [
  {
    field: '_id',
    headerName: 'Booking ID',
    width: 160,
    renderCell: (params: GridRenderCellParams) => <BookingIdChip id={String(params.value ?? '')} />,
  },
  {
    field: 'driver',
    headerName: 'Renter',
    width: 200,
    renderCell: (params: GridRenderCellParams) => {
      const driver = params.value as bookcarsTypes.User | undefined
      const name = driver?.fullName ?? '—'
      const verified = driver?.verified ?? false
      const avatarChar = name.charAt(0).toUpperCase()
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            sx={{
              width: 32, height: 32, borderRadius: '50%', background: CANVAS,
              border: `1px solid ${CARD_BORDER}`, display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontWeight: 700, fontSize: 13, color: 'var(--sr-text)',
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {avatarChar}
          </Box>
          <Box>
            <Box sx={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 500 }}>{name}</Box>
            {verified ? (
              <Chip label="CNIC ✓" size="small" sx={{ height: 18, fontSize: 10, background: EMERALD, color: '#fff' }} />
            ) : (
              <Chip label="CNIC ⚠" size="small" sx={{ height: 18, fontSize: 10, background: '#D97706', color: '#fff' }} />
            )}
          </Box>
        </Box>
      )
    },
  },
  {
    field: 'car',
    headerName: 'Vehicle',
    width: 180,
    renderCell: (params: GridRenderCellParams) => {
      const car = params.value as bookcarsTypes.Car | undefined
      const plate = (car as any)?.plateNumber ?? (car as any)?.plate ?? '—'
      const thumb = car && (car as any).thumbnail
        ? `${env.CDN_CARS}${(car as any).thumbnail}`
        : null
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {thumb ? (
            <Box component="img" src={thumb} alt="car" sx={{ width: 32, height: 24, objectFit: 'cover', borderRadius: 1 }} />
          ) : (
            <Box sx={{ width: 32, height: 24, background: CANVAS, borderRadius: 1, border: `1px solid ${CARD_BORDER}` }} />
          )}
          <Box
            component="span"
            sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, letterSpacing: '0.03em' }}
          >
            {plate}
          </Box>
        </Box>
      )
    },
  },
  {
    field: 'from',
    headerName: 'Trip Dates',
    width: 220,
    renderCell: (params: GridRenderCellParams) => {
      const row = params.row as bookcarsTypes.Booking
      const pickup = row.from ? new Date(row.from).toLocaleDateString() : '—'
      const ret = row.to ? new Date(row.to).toLocaleDateString() : '—'
      const hub = (row.pickupLocation as bookcarsTypes.Location)?.name ?? ''
      return (
        <Box sx={{ lineHeight: 1.4 }}>
          <Box sx={{ fontFamily: "'Inter', sans-serif", fontSize: 12 }}>
            {pickup} → {ret}
          </Box>
          {hub && (
            <Chip
              label={hub}
              size="small"
              sx={{ height: 16, fontSize: 10, mt: 0.3, background: CANVAS, border: `1px solid ${CARD_BORDER}` }}
            />
          )}
        </Box>
      )
    },
  },
  {
    field: 'price',
    headerName: 'PKR Total',
    width: 130,
    renderCell: (params: GridRenderCellParams) => (
      <Box
        component="span"
        sx={{
          fontFamily: "'JetBrains Mono', monospace",
          fontVariantNumeric: 'tabular-nums',
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--sr-emerald)',
        }}
      >
        {params.value != null ? `PKR ${Number(params.value).toLocaleString('en-PK')}` : '—'}
      </Box>
    ),
  },
  {
    field: 'escrowStatus',
    headerName: 'Escrow Status',
    width: 180,
    renderCell: (params: GridRenderCellParams) => <EscrowPill status={params.value as string | undefined} />,
  },
  {
    field: 'actions',
    headerName: 'Actions',
    width: 170,
    sortable: false,
    renderCell: (params: GridRenderCellParams) => {
      const id = (params.row as bookcarsTypes.Booking)._id ?? ''
      return (
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="Verify Handover ✓">
            <IconButton
              size="small"
              sx={{ color: 'var(--sr-emerald)', '&:hover': { color: EMERALD_HOVER } }}
              onClick={() => navigate(`/update-booking?b=${id}`)}
            >
              <VerifyIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Release Deposit 💸">
            <IconButton size="small" sx={{ color: 'var(--sr-accent-text)' }}>
              <ReleaseIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="View Details 👁">
            <IconButton size="small" onClick={() => navigate(`/update-booking?b=${id}`)}>
              <ViewIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Cancel 🗑">
            <IconButton size="small" sx={{ color: CRIMSON }}>
              <CancelIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      )
    },
  },
]

// ─── Main component ───────────────────────────────────────────────────────────
const Bookings = () => {
  const navigate = useNavigate()

  const [user, setUser] = useState<bookcarsTypes.User>()
  const [leftPanel, setLeftPanel] = useState(false)
  const [admin, setAdmin] = useState(false)
  const [allSuppliers, setAllSuppliers] = useState<bookcarsTypes.User[]>([])
  const [suppliers, setSuppliers] = useState<string[]>()
  const [statuses, setStatuses] = useState(helper.getBookingStatuses().map((status) => status.value))
  const [filter, setFilter] = useState<bookcarsTypes.Filter | null>()
  const [loadingSuppliers, setLoadingSuppliers] = useState(true)
  const [offset, setOffset] = useState(0)

  // ── Top filter-bar state ──────────────────────────────────────────────────
  const [searchText, setSearchText] = useState('')
  const [dateFrom, setDateFrom] = useState<Date | null>(null)
  const [dateTo, setDateTo] = useState<Date | null>(null)
  const [activeStatusChip, setActiveStatusChip] = useState<string>('all')

  useEffect(() => {
    if (user && user.verified) {
      const col1 = document.querySelector('div.col-1')
      if (col1) {
        setOffset(col1.clientHeight)
      }
    }
  }, [user])

  const handleSupplierFilterChange = (_suppliers: string[]) => {
    setSuppliers(_suppliers)
  }

  const handleStatusFilterChange = (_statuses: bookcarsTypes.BookingStatus[]) => {
    setStatuses(_statuses)
  }

  const handleBookingFilterSubmit = (_filter: bookcarsTypes.Filter | null) => {
    setFilter(_filter)
  }

  const onLoad = async (_user?: bookcarsTypes.User) => {
    if (_user) {
      const _admin = helper.admin(_user)
      setUser(_user)
      setAdmin(_admin)
      setLeftPanel(!_admin)
      setLoadingSuppliers(_admin)

      const _allSuppliers = await SupplierService.getAllSuppliers()
      const _suppliers = _admin ? bookcarsHelper.flattenSuppliers(_allSuppliers) : [_user._id ?? '']
      setAllSuppliers(_allSuppliers)
      setSuppliers(_suppliers)
      setLeftPanel(true)
      setLoadingSuppliers(false)
    }
  }

  // Build a combined filter merging the top-bar with BookingFilter
  const combinedFilter: bookcarsTypes.Filter | null = (() => {
    const base = filter ? { ...filter } : {}
    if (searchText) {
(base as any).keyword = searchText
}
    if (dateFrom) {
(base as any).from = dateFrom
}
    if (dateTo) {
(base as any).to = dateTo
}
    return Object.keys(base).length > 0 ? (base as bookcarsTypes.Filter) : null
  })()

  // Status chip click also updates the sidebar StatusFilter state
  const handleStatusChip = (val: string) => {
    setActiveStatusChip(val)
    if (val === 'all') {
      setStatuses(helper.getBookingStatuses().map((s) => s.value))
    } else {
      setStatuses([val as bookcarsTypes.BookingStatus])
    }
  }

  const columns = buildColumns(navigate)

  return (
    <Layout onLoad={onLoad} strict>
      {user && (
        <Box sx={{ background: CANVAS, minHeight: '100vh' }}>
          {/* ── Top filter bar ── */}
          <Box
            sx={{
              background: CARD_BG,
              borderBottom: `1px solid ${CARD_BORDER}`,
              px: 3,
              py: 1.5,
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 2,
            }}
          >
            {/* Search */}
            <TextField
              size="small"
              placeholder="Search booking ID or renter…"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
                sx: { fontFamily: "'Inter', sans-serif", fontSize: 13 },
              }}
              sx={{ minWidth: 230 }}
            />

            {/* Date range */}
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Pickup from"
                value={dateFrom}
                onChange={(d) => setDateFrom(d)}
                slotProps={{ textField: { size: 'small', sx: { minWidth: 150 } } }}
              />
              <DatePicker
                label="Return to"
                value={dateTo}
                onChange={(d) => setDateTo(d)}
                slotProps={{ textField: { size: 'small', sx: { minWidth: 150 } } }}
              />
            </LocalizationProvider>

            {/* Status chips */}
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {STATUS_CHIPS.map((chip) => (
                <Chip
                  key={chip.value}
                  label={chip.label}
                  size="small"
                  onClick={() => handleStatusChip(chip.value)}
                  sx={{
                    cursor: 'pointer',
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: activeStatusChip === chip.value ? 700 : 400,
                    background: activeStatusChip === chip.value ? EMERALD : CANVAS,
                    color: activeStatusChip === chip.value ? '#fff' : 'var(--sr-muted)',
                    border: `1px solid ${activeStatusChip === chip.value ? EMERALD : CARD_BORDER}`,
                    '&:hover': { background: activeStatusChip === chip.value ? EMERALD_HOVER : '#E2E8F0' },
                  }}
                />
              ))}
            </Stack>

            {/* New booking button */}
            <Box sx={{ ml: 'auto' }}>
              <Button
                variant="contained"
                size="small"
                onClick={() => navigate('/create-booking')}
                sx={{
                  background: EMERALD,
                  '&:hover': { background: EMERALD_HOVER },
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontWeight: 600,
                  textTransform: 'none',
                  borderRadius: '8px',
                }}
              >
                {strings.NEW_BOOKING}
              </Button>
            </Box>
          </Box>

          {/* ── Main layout ── */}
          <div className="bookings">
            <div className="col-1">
              {leftPanel && (
                <>
                  {admin && (
                    <SupplierFilter
                      suppliers={allSuppliers}
                      onChange={handleSupplierFilterChange}
                      className="cl-supplier-filter"
                    />
                  )}
                  <StatusFilter
                    onChange={handleStatusFilterChange}
                    className="cl-status-filter"
                  />
                  <BookingFilter
                    onSubmit={handleBookingFilterSubmit}
                    language={(user && user.language) || env.DEFAULT_LANGUAGE}
                    className="cl-booking-filter"
                    collapse={!env.isMobile}
                  />
                </>
              )}
            </div>
            <div className="col-2">
              <BookingList
                containerClassName="bookings"
                offset={offset}
                language={user.language}
                loggedUser={user}
                suppliers={suppliers}
                statuses={statuses}
                filter={combinedFilter}
                loading={loadingSuppliers}
                hideDates={env.isMobile}
                checkboxSelection={!env.isMobile}
              />
            </div>
          </div>
        </Box>
      )}
    </Layout>
  )
}

export default Bookings
