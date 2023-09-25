import React, { useEffect, useState } from 'react'
import Master from '../components/Master'
import Env from '../config/env.config'
import * as Helper from '../common/Helper'
import BookingList from '../components/BookingList'
import SupplierFilter from '../components/SupplierFilter'
import StatusFilter from '../components/StatusFilter'
import BookingFilter from '../components/BookingFilter'
import * as SupplierService from '../services/SupplierService'
import * as bookcarsTypes from 'bookcars-types'
import * as bookcarsHelper from 'bookcars-helper'

import '../assets/css/bookings.css'

const Bookings = () => {
  const [user, setUser] = useState<bookcarsTypes.User>()
  const [allCompanies, setAllCompanies] = useState<bookcarsTypes.User[]>([])
  const [companies, setCompanies] = useState<string[]>([])
  const [statuses, setStatuses] = useState(Helper.getBookingStatuses().map((status) => status.value))
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

  const handleSupplierFilterChange = (companies: string[]) => {
    setCompanies(companies)
  }

  const handleStatusFilterChange = (statuses: bookcarsTypes.BookingStatus[]) => {
    setStatuses(statuses)
  }

  const handleBookingFilterSubmit = (filter: bookcarsTypes.Filter | null) => {
    setFilter(filter)
  }

  const onLoad = async (user?: bookcarsTypes.User) => {
    setUser(user)
    setLoadingCompanies(true)

    const allCompanies = await SupplierService.getAllSuppliers()
    const companies = bookcarsHelper.flattenCompanies(allCompanies)
    setAllCompanies(allCompanies)
    setCompanies(companies)
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
              <BookingFilter onSubmit={handleBookingFilterSubmit} language={(user && user.language) || Env.DEFAULT_LANGUAGE} className="cl-booking-filter" collapse={!Env.isMobile()} />
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
              hideDates={Env.isMobile()}
              checkboxSelection={false}
            />
          </div>
        </div>
      )}
    </Master>
  )
}

export default Bookings
