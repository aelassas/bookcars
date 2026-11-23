import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Box, Chip, Typography } from '@mui/material'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import { strings } from '@/lang/bookings'
import env from '@/config/env.config'
import * as helper from '@/utils/helper'
import * as SupplierService from '@/services/SupplierService'
import VehicleScheduler from '@/components/VehicleScheduler'
import SupplierFilter from '@/components/SupplierFilter'
import StatusFilter from '@/components/StatusFilter'
import VehicleSchedulerFilter from '@/components/VehicleSchedulerFilter'

import Layout from '@/components/Layout'

import '@/assets/css/scheduler.css'

const Scheduler = () => {
  const navigate = useNavigate()

  const [user, setUser] = useState<bookcarsTypes.User>()
  const [leftPanel, setLeftPanel] = useState(false)
  const [admin, setAdmin] = useState(false)
  const [allSuppliers, setAllSuppliers] = useState<bookcarsTypes.User[]>([])
  const [suppliers, setSuppliers] = useState<string[]>()
  const [statuses, setStatuses] = useState(helper.getBookingStatuses().map((status) => status.value))
  const [filter, setFilter] = useState<bookcarsTypes.Filter | null>()

  const handleSupplierFilterChange = (_suppliers: string[]) => {
    setSuppliers(_suppliers)
  }

  const handleStatusFilterChange = (_statuses: bookcarsTypes.BookingStatus[]) => {
    setStatuses(_statuses)
  }

  const handleVehicleSchedulerFilterSubmit = (_filter: bookcarsTypes.Filter | null) => {
    setFilter(_filter)
  }

  const onLoad = async (_user?: bookcarsTypes.User) => {
    if (_user) {
      const _admin = helper.admin(_user)
      setUser(_user)
      setAdmin(_admin)
      setLeftPanel(!_admin)

      const _allSuppliers = await SupplierService.getAllSuppliers()
      const _suppliers = _admin ? bookcarsHelper.flattenSuppliers(_allSuppliers) : [_user._id ?? '']
      setAllSuppliers(_allSuppliers)
      setSuppliers(_suppliers)
      setLeftPanel(true)
    }
  }

  return (
    <Layout onLoad={onLoad} strict>
      {user && suppliers && (
        <div className="scheduler">
          <div className="col-1">
            {leftPanel && (
              <>
                <Button variant="contained" className="btn-primary cl-new-booking" size="small" onClick={() => navigate('/create-booking')}>
                  {strings.NEW_BOOKING}
                </Button>
                {admin
                  && (
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
                <VehicleSchedulerFilter
                  onSubmit={handleVehicleSchedulerFilterSubmit}
                  className="cl-scheduler-filter"
                  collapse={!env.isMobile}
                />
              </>
            )}
          </div>
          <div className="col-2">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.2, bgcolor: 'var(--sr-surface-raised, #F8FAFC)', borderBottom: '1px solid var(--sr-border, #E2E8F0)', flexWrap: 'wrap' }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Timeline Legend:
              </Typography>
              <Chip size="small" label="Confirmed (Paid / Deposit)" sx={{ bgcolor: '#107487', color: '#FFFFFF', fontWeight: 600, fontSize: 11, height: 22 }} />
              <Chip size="small" label="Reserved / Scheduled" sx={{ bgcolor: '#036a9f', color: '#FFFFFF', fontWeight: 600, fontSize: 11, height: 22 }} />
              <Chip size="small" label="Pending KYC / Payment" sx={{ bgcolor: '#995000', color: '#FFFFFF', fontWeight: 600, fontSize: 11, height: 22 }} />
              <Chip size="small" label="Cancelled / Void" sx={{ bgcolor: '#DC2626', color: '#FFFFFF', fontWeight: 600, fontSize: 11, height: 22 }} />
            </Box>
            <VehicleScheduler
              suppliers={suppliers}
              statuses={statuses}
              filter={filter!}
              language={user.language!}
            />
          </div>
        </div>
      )}
    </Layout>
  )
}

export default Scheduler
