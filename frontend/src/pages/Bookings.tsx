import React, { useEffect, useState } from 'react'
import * as bookcarsTypes from 'bookcars-types'
import * as bookcarsHelper from 'bookcars-helper'
import Master from '../components/Master'
import env from '../config/env.config'
import * as helper from '../common/helper'
import BookingList from '../components/BookingList'
import SupplierFilter from '../components/SupplierFilter'
import StatusFilter from '../components/StatusFilter'
import BookingFilter from '../components/BookingFilter'
import * as SupplierService from '../services/SupplierService'

import '../assets/css/bookings.css'

const Bookings = () => {
  const [user, setUser] = useState<bookcarsTypes.User>()
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
    setUser(_user)
    setLoadingCompanies(true)

    const _allCompanies = await SupplierService.getAllSuppliers()
    const _companies = bookcarsHelper.flattenCompanies(_allCompanies)
    setAllCompanies(_allCompanies)
    setCompanies(_companies)
    setLoadingCompanies(false)
  }

  return (
    <Master onLoad={onLoad} strict>
      {user && (
        <div className="bookings">
          <div className="col-1">
            <div>
              <SupplierFilter companies={allCompanies} onChange={handleSupplierFilterChange} className="cl-company-filter" />
              <StatusFilter onChange={handleStatusFilterChange} className="cl-status-filter" />
              <BookingFilter onSubmit={handleBookingFilterSubmit} language={(user && user.language) || env.DEFAULT_LANGUAGE} className="cl-booking-filter" collapse={!env.isMobile()} />
            </div>
          </div>
          <div className="col-2">
            <BookingList
              containerClassName="bookings"
              offset={offset}
              user={user}
              language={user.language}
              companies={companies}
              statuses={statuses}
              filter={filter}
              loading={loadingCompanies}
              hideDates={env.isMobile()}
              checkboxSelection={false}
            />
          </div>
        </div>
      )}
    </Master>
  )
}

export default Bookings
