import React, { useState, useEffect } from 'react'
import { Button } from '@mui/material'
import * as bookcarsTypes from 'bookcars-types'
import * as bookcarsHelper from 'bookcars-helper'
import Master from '../components/Master'
import env from '../config/env.config'
import { strings } from '../lang/bookings'
import * as helper from '../common/helper'
import BookingList from '../components/BookingList'
import SupplierFilter from '../components/SupplierFilter'
import StatusFilter from '../components/StatusFilter'
import BookingFilter from '../components/BookingFilter'
import * as SupplierService from '../services/SupplierService'

import '../assets/css/bookings.css'

const Bookings = () => {
  const [user, setUser] = useState<bookcarsTypes.User>()
  const [leftPanel, setLeftPanel] = useState(false)
  const [admin, setAdmin] = useState(false)
  const [allCompanies, setAllCompanies] = useState<bookcarsTypes.User[]>([])
  const [companies, setCompanies] = useState<string[]>()
  const [statuses, setStatuses] = useState(helper.getBookingStatuses().map((status) => status.value))
  const [filter, setFilter] = useState<bookcarsTypes.Filter | null>()
  const [loadingCompanies, setLoadingCompanies] = useState(true)
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    if (user && user.verified) {
      const col1 = document.querySelector('div.col-1')
      if (col1) {
        setOffset(col1.clientHeight)
      }
    }
  }, [user])

  const handleSupplierFilterChange = (_companies: string[]) => {
    setCompanies(_companies)
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
      setLoadingCompanies(_admin)

      const _allCompanies = _admin ? await SupplierService.getAllSuppliers() : []
      const _companies = _admin ? bookcarsHelper.flattenCompanies(_allCompanies) : [_user._id ?? '']
      setAllCompanies(_allCompanies)
      setCompanies(_companies)
      setLeftPanel(true)
      setLoadingCompanies(false)
    }
  }

  return (
    <Master onLoad={onLoad} strict>
      {user && (
        <div className="bookings">
          <div className="col-1">
            {leftPanel && (
              <>
                <Button variant="contained" className="btn-primary cl-new-booking" size="small" href="/create-booking">
                  {strings.NEW_BOOKING}
                </Button>
                {admin
                  && (
                  <SupplierFilter
                    companies={allCompanies}
                    onChange={handleSupplierFilterChange}
                    className="cl-company-filter"
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
                  collapse={!env.isMobile()}
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
              companies={companies}
              statuses={statuses}
              filter={filter}
              loading={loadingCompanies}
              hideDates={env.isMobile()}
              checkboxSelection={!env.isMobile()}
            />
          </div>
        </div>
      )}
    </Master>
  )
}

export default Bookings
