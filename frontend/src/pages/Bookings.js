import React, { useEffect, useState } from 'react'
import Master from '../components/Master'
import Env from '../config/env.config'
import * as Helper from '../common/Helper'
import BookingList from '../components/BookingList'
import SupplierFilter from '../components/SupplierFilter'
import StatusFilter from '../components/StatusFilter'
import BookingFilter from '../components/BookingFilter'
import * as SupplierService from '../services/SupplierService'

import '../assets/css/bookings.css'

const Bookings = () => {
  const [user, setUser] = useState()
  const [allCompanies, setAllCompanies] = useState([])
  const [companies, setCompanies] = useState([])
  const [statuses, setStatuses] = useState(Helper.getBookingStatuses().map((status) => status.value))
  const [filter, setFilter] = useState(null)
  const [reload, setReload] = useState(false)
  const [loadingCompanies, setLoadingCompanies] = useState(true)
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    if (user && user.verified) {
      setOffset(document.querySelector('div.col-1').clientHeight)
    }
  }, [user])

  const handleSupplierFilterChange = (newCompanies) => {
    setCompanies(newCompanies)
    setReload(Helper.arrayEqual(companies, newCompanies))
  }

  const handleStatusFilterChange = (newStatuses) => {
    setStatuses(newStatuses)
    setReload(Helper.arrayEqual(statuses, newStatuses))
  }

  const handleBookingFilterSubmit = (newFilter) => {
    setFilter(newFilter)
    setReload(Helper.filterEqual(filter, newFilter))
  }

  const handleBookingListLoad = () => {
    setReload(false)
  }

  const onLoad = async (user) => {
    setUser(user)
    setLoadingCompanies(true)

    const allCompanies = await SupplierService.getAllCompanies()
    const companies = Helper.flattenCompanies(allCompanies)
    setAllCompanies(allCompanies)
    setCompanies(companies)
    setLoadingCompanies(false)
  }

  return (
    <Master onLoad={onLoad} strict={true}>
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
              reload={reload}
              onLoad={handleBookingListLoad}
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
