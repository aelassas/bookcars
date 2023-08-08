import React, { useState, useEffect } from 'react'
import Env from '../config/env.config'
import * as Helper from '../common/Helper'
import { strings } from '../lang/cars'
import { strings as commonStrings } from '../lang/common'
import Master from '../components/Master'
import SupplierFilter from '../components/SupplierFilter'
import Search from '../components/Search'
import InfoBox from '../components/InfoBox'
import FuelFilter from '../components/FuelFilter'
import GearboxFilter from '../components/GearboxFilter'
import MileageFilter from '../components/MileageFilter'
import DepositFilter from '../components/DepositFilter'
import AvailabilityFilter from '../components/AvailabilityFilter'
import CarList from '../components/CarList'
import * as SupplierService from '../services/SupplierService'
import { Button } from '@mui/material'

import '../assets/css/cars.css'

const Cars = () => {
  const [user, setUser] = useState()
  const [admin, setAdmin] = useState(false)
  const [allCompanies, setAllCompanies] = useState([])
  const [companies, setCompanies] = useState([])
  const [keyword, setKeyword] = useState('')
  const [rowCount, setRowCount] = useState(0)
  const [reload, setReload] = useState(false)
  const [loading, setLoading] = useState(true)
  const [gearbox, setGearbox] = useState([Env.GEARBOX_TYPE.AUTOMATIC, Env.GEARBOX_TYPE.MANUAL])
  const [fuel, setFuel] = useState([Env.CAR_TYPE.DIESEL, Env.CAR_TYPE.GASOLINE])
  const [mileage, setMileage] = useState([Env.MILEAGE.LIMITED, Env.MILEAGE.UNLIMITED])
  const [availability, setAvailability] = useState([Env.AVAILABILITY.AVAILABLE, Env.AVAILABILITY.UNAVAILABLE])
  const [deposit, setDeposit] = useState(-1)
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    if (user && user.verified) {
      setOffset(document.querySelector('div.col-1').clientHeight)
    }
  }, [user])

  const handleSearch = (newKeyword) => {
    setKeyword(newKeyword)
    setReload(newKeyword === keyword)
  }

  const handleSupplierFilterChange = (newCompanies) => {
    setCompanies(newCompanies)
    setReload(Helper.arrayEqual(newCompanies, companies))
  }

  const handleCarListLoad = (data) => {
    setReload(false)
    setRowCount(data.rowCount)
  }

  const handleCarDelete = (rowCount) => {
    setRowCount(rowCount)
  }

  const handleFuelFilterChange = (values) => {
    setFuel(values)
    setReload(Helper.arrayEqual(values, fuel))
  }

  const handleGearboxFilterChange = (values) => {
    setGearbox(values)
    setReload(Helper.arrayEqual(values, gearbox))
  }

  const handleMileageFilterChange = (values) => {
    setMileage(values)
    setReload(Helper.arrayEqual(values, mileage))
  }

  const handleDepositFilterChange = (value) => {
    setDeposit(value)
    setReload(value === deposit)
  }

  const handleAvailabilityFilterChange = (values) => {
    setAvailability(values)
    setReload(Helper.arrayEqual(values, availability))
  }

  const onLoad = async (user) => {
    setUser(user)
    setAdmin(Helper.admin(user))
    const allCompanies = await SupplierService.getAllCompanies()
    const companies = Helper.flattenCompanies(allCompanies)
    setAllCompanies(allCompanies)
    setCompanies(companies)
    setLoading(false)
  }

  return (
    <Master onLoad={onLoad} strict={true}>
      {user && (
        <div className="cars">
          <div className="col-1">
            <div className="col-1-container">
              <Search onSubmit={handleSearch} className="search" />

              <Button type="submit" variant="contained" className="btn-primary new-car" size="small" href="/create-car">
                {strings.NEW_CAR}
              </Button>

              {rowCount > 0 && <InfoBox value={`${rowCount} ${commonStrings.CAR}${rowCount > 1 ? 's' : ''}`} className="car-count" />}

              <SupplierFilter companies={allCompanies} onChange={handleSupplierFilterChange} className="filter" />

              {rowCount > -1 && (
                <>
                  <FuelFilter className="car-filter" onChange={handleFuelFilterChange} />
                  <GearboxFilter className="car-filter" onChange={handleGearboxFilterChange} />
                  <MileageFilter className="car-filter" onChange={handleMileageFilterChange} />
                  <DepositFilter className="car-filter" onChange={handleDepositFilterChange} />
                  {admin && <AvailabilityFilter className="car-filter" onChange={handleAvailabilityFilterChange} />}
                </>
              )}
            </div>
          </div>
          <div className="col-2">
            <CarList
              containerClassName="cars"
              offset={offset}
              user={user}
              companies={companies}
              fuel={fuel}
              gearbox={gearbox}
              mileage={mileage}
              deposit={deposit}
              availability={availability}
              keyword={keyword}
              reload={reload}
              loading={loading}
              onLoad={handleCarListLoad}
              onDelete={handleCarDelete}
            />
          </div>
        </div>
      )}
    </Master>
  )
}

export default Cars
