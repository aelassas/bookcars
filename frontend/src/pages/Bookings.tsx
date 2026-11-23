import React, { useState } from 'react'
import { Box, Chip, Typography } from '@mui/material'
import {
  DirectionsCar as CarIcon,
  CheckCircle as ActiveIcon,
  Schedule as UpcomingIcon,
  DoneAll as CompletedIcon,
  Cancel as CancelledIcon,
  ListAlt as AllIcon
} from '@mui/icons-material'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import Layout from '@/components/Layout'
import env from '@/config/env.config'
import * as helper from '@/utils/helper'
import BookingList from '@/components/BookingList'
import SupplierFilter from '@/components/SupplierFilter'
import StatusFilter from '@/components/StatusFilter'
import BookingFilter from '@/components/BookingFilter'
import * as SupplierService from '@/services/SupplierService'

import '@/assets/css/bookings.css'

type TripFilterTab = 'all' | 'upcoming' | 'active' | 'completed' | 'cancelled'

const Bookings = () => {
  const [user, setUser] = useState<bookcarsTypes.User>()
  const [allSuppliers, setAllSuppliers] = useState<bookcarsTypes.User[]>([])
  const [suppliers, setSuppliers] = useState<string[]>()
  const [statuses, setStatuses] = useState(helper.getBookingStatuses().map((status) => status.value))
  const [filter, setFilter] = useState<bookcarsTypes.Filter | null>()
  const [loadingSuppliers, setLoadingSuppliers] = useState(true)
  const [activeTab, setActiveTab] = useState<TripFilterTab>('all')

  const handleSupplierFilterChange = (_suppliers: string[]) => {
    setSuppliers(_suppliers)
  }

  const handleStatusFilterChange = (_statuses: bookcarsTypes.BookingStatus[]) => {
    setStatuses(_statuses)
  }

  const handleBookingFilterSubmit = (_filter: bookcarsTypes.Filter | null) => {
    setFilter(_filter)
  }

  const handleTabChange = (tab: TripFilterTab) => {
    setActiveTab(tab)
    if (tab === 'all') {
      setStatuses(helper.getBookingStatuses().map((status) => status.value))
    } else if (tab === 'upcoming') {
      setStatuses([bookcarsTypes.BookingStatus.Reserved, bookcarsTypes.BookingStatus.Deposit])
    } else if (tab === 'active') {
      setStatuses([bookcarsTypes.BookingStatus.Paid, bookcarsTypes.BookingStatus.PaidInFull])
    } else if (tab === 'completed') {
      setStatuses([bookcarsTypes.BookingStatus.PaidInFull])
    } else if (tab === 'cancelled') {
      setStatuses([bookcarsTypes.BookingStatus.Cancelled, bookcarsTypes.BookingStatus.Void])
    }
  }

  const onLoad = async (_user?: bookcarsTypes.User) => {
    setUser(_user)
    setLoadingSuppliers(true)

    try {
      const _allSuppliers = await SupplierService.getAllSuppliers()
      setAllSuppliers(_allSuppliers)
      setSuppliers(bookcarsHelper.flattenSuppliers(_allSuppliers))
    } catch (err) {
      console.error('Could not load suppliers for booking filters', err)
      setAllSuppliers([])
      setSuppliers([])
    } finally {
      setLoadingSuppliers(false)
    }
  }

  return (
    <Layout onLoad={onLoad} strict>
      {user && (
        <div className="bookings">
          {/* Top My Trips Command Header */}
          <Box
            sx={{
              p: { xs: 2, sm: 3 },
              pb: 2,
              bgcolor: 'var(--sr-surface-raised, #F8FAFC)',
              borderBottom: '1px solid var(--sr-border, #E2E8F0)'
            }}
          >
            <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <CarIcon sx={{ color: 'var(--sr-emerald)', fontSize: 18 }} />
                <Typography
                  sx={{
                    color: 'var(--sr-emerald)',
                    fontWeight: 800,
                    fontSize: 11,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase'
                  }}
                >
                  SafarRent • My Reservations & Digital Trip Passes
                </Typography>
              </Box>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 800,
                  color: 'var(--sr-text, #0B1120)',
                  letterSpacing: '-0.02em',
                  mb: 1.5,
                  fontSize: { xs: '22px', sm: '28px' }
                }}
              >
                My Trips & Booking Passes
              </Typography>

              {/* Horizontal Status Filter Pills */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  overflowX: 'auto',
                  pb: 0.5,
                  '&::-webkit-scrollbar': { height: 4 }
                }}
              >
                <Chip
                  icon={<AllIcon fontSize="small" />}
                  label="All Trips"
                  onClick={() => handleTabChange('all')}
                  variant={activeTab === 'all' ? 'filled' : 'outlined'}
                  sx={{
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: 'pointer',
                    bgcolor: activeTab === 'all' ? '#107487' : 'transparent',
                    color: activeTab === 'all' ? '#FFFFFF' : 'var(--sr-text, #334155)',
                    borderColor: activeTab === 'all' ? '#107487' : 'var(--sr-border, #CBD5E1)',
                    '&:hover': { bgcolor: activeTab === 'all' ? '#047857' : 'rgba(5, 150, 105, 0.08)' }
                  }}
                />
                <Chip
                  icon={<UpcomingIcon fontSize="small" />}
                  label="Upcoming"
                  onClick={() => handleTabChange('upcoming')}
                  variant={activeTab === 'upcoming' ? 'filled' : 'outlined'}
                  sx={{
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: 'pointer',
                    bgcolor: activeTab === 'upcoming' ? '#0284C7' : 'transparent',
                    color: activeTab === 'upcoming' ? '#FFFFFF' : 'var(--sr-text, #334155)',
                    borderColor: activeTab === 'upcoming' ? '#0284C7' : 'var(--sr-border, #CBD5E1)',
                    '&:hover': { bgcolor: activeTab === 'upcoming' ? '#0369A1' : 'rgba(2, 132, 199, 0.08)' }
                  }}
                />
                <Chip
                  icon={<ActiveIcon fontSize="small" />}
                  label="Active On-Road"
                  onClick={() => handleTabChange('active')}
                  variant={activeTab === 'active' ? 'filled' : 'outlined'}
                  sx={{
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: 'pointer',
                    bgcolor: activeTab === 'active' ? '#107487' : 'transparent',
                    color: activeTab === 'active' ? '#FFFFFF' : 'var(--sr-text, #334155)',
                    borderColor: activeTab === 'active' ? '#107487' : 'var(--sr-border, #CBD5E1)',
                    '&:hover': { bgcolor: activeTab === 'active' ? '#047857' : 'rgba(5, 150, 105, 0.08)' }
                  }}
                />
                <Chip
                  icon={<CompletedIcon fontSize="small" />}
                  label="Completed"
                  onClick={() => handleTabChange('completed')}
                  variant={activeTab === 'completed' ? 'filled' : 'outlined'}
                  sx={{
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: 'pointer',
                    bgcolor: activeTab === 'completed' ? '#475569' : 'transparent',
                    color: activeTab === 'completed' ? '#FFFFFF' : 'var(--sr-text, #334155)',
                    borderColor: activeTab === 'completed' ? '#475569' : 'var(--sr-border, #CBD5E1)',
                    '&:hover': { bgcolor: activeTab === 'completed' ? '#334155' : 'rgba(71, 85, 105, 0.08)' }
                  }}
                />
                <Chip
                  icon={<CancelledIcon fontSize="small" />}
                  label="Cancelled / Void"
                  onClick={() => handleTabChange('cancelled')}
                  variant={activeTab === 'cancelled' ? 'filled' : 'outlined'}
                  sx={{
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: 'pointer',
                    bgcolor: activeTab === 'cancelled' ? '#DC2626' : 'transparent',
                    color: activeTab === 'cancelled' ? '#FFFFFF' : 'var(--sr-text, #334155)',
                    borderColor: activeTab === 'cancelled' ? '#DC2626' : 'var(--sr-border, #CBD5E1)',
                    '&:hover': { bgcolor: activeTab === 'cancelled' ? '#B91C1C' : 'rgba(220, 38, 38, 0.08)' }
                  }}
                />
              </Box>
            </Box>
          </Box>

          <div className="col-1">
            <div>
              <SupplierFilter suppliers={allSuppliers} onChange={handleSupplierFilterChange} className="cl-supplier-filter" />
              <StatusFilter onChange={handleStatusFilterChange} className="cl-status-filter" />
              <BookingFilter onSubmit={handleBookingFilterSubmit} language={(user && user.language) || env.DEFAULT_LANGUAGE} className="cl-booking-filter" collapse={!env.isMobile} />
            </div>
          </div>
          <div className="col-2">
            <BookingList
              user={user}
              language={user.language}
              suppliers={suppliers}
              statuses={statuses}
              filter={filter}
              loading={loadingSuppliers}
              hideDates={env.isMobile}
              checkboxSelection={false}
              hideSupplierColumn={env.HIDE_SUPPLIERS}
            />
          </div>
        </div>
      )}
    </Layout>
  )
}

export default Bookings
