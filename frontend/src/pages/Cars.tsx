import React, { useState } from 'react'
import Env from '../config/env.config'
import * as Helper from '../common/Helper'
import * as LocationService from '../services/LocationService'
import * as SupplierService from '../services/SupplierService'
import Master from '../components/Master'
import NoMatch from './NoMatch'
import CarFilter from '../components/CarFilter'
import SupplierFilter from '../components/SupplierFilter'
import FuelFilter from '../components/FuelFilter'
import GearboxFilter from '../components/GearboxFilter'
import MileageFilter from '../components/MileageFilter'
import DepositFilter from '../components/DepositFilter'
import CarList from '../components/CarList'
import * as bookcarsTypes from 'bookcars-types'

import '../assets/css/cars.css'

const Cars = () => {
  const [visible, setVisible] = useState(false)
  const [noMatch, setNoMatch] = useState(false)
  const [pickupLocation, setPickupLocation] = useState<bookcarsTypes.Location>()
  const [dropOffLocation, setDropOffLocation] = useState<bookcarsTypes.Location>()
  const [from, setFrom] = useState<Date>()
  const [to, setTo] = useState<Date>()
  const [allCompanies, setAllCompanies] = useState<bookcarsTypes.User[]>([])
  const [companies, setCompanies] = useState<string[]>([])
  const [reload, setReload] = useState(false)
  const [loading, setLoading] = useState(true)
  const [fuel, setFuel] = useState([bookcarsTypes.CarType.Diesel, bookcarsTypes.CarType.Gasoline])
  const [gearbox, setGearbox] = useState([bookcarsTypes.GearboxType.Automatic, bookcarsTypes.GearboxType.Manual])
  const [mileage, setMileage] = useState([bookcarsTypes.Mileage.Limited, bookcarsTypes.Mileage.Unlimited])
  const [deposit, setDeposit] = useState(-1)

  const handleCarListLoad = () => {
    setReload(false)
  }

  const handleSupplierFilterChange = (newCompanies: string[]) => {
    setCompanies(newCompanies)
    setReload(Helper.arrayEqual(newCompanies, companies))
  }

  const handleCarFilterSubmit = (filter: bookcarsTypes.CarFilter) => {
    setPickupLocation(filter.pickupLocation)
    setDropOffLocation(filter.dropOffLocation)
    setFrom(filter.from)
    setTo(filter.to)
    setReload((pickupLocation && pickupLocation._id === filter.pickupLocation._id) || false)
  }

  const handleFuelFilterChange = (values: bookcarsTypes.CarType[]) => {
    setFuel(values)
    setReload(Helper.arrayEqual(values, fuel))
  }

  const handleGearboxFilterChange = (values: bookcarsTypes.GearboxType[]) => {
    setGearbox(values)
    setReload(Helper.arrayEqual(values, gearbox))
  }

  const handleMileageFilterChange = (values: bookcarsTypes.Mileage[]) => {
    setMileage(values)
    setReload(Helper.arrayEqual(values, mileage))
  }

  const handleDepositFilterChange = (value: number) => {
    setDeposit(value)
    setReload(value === deposit)
  }

  const onLoad = async (user?: bookcarsTypes.User) => {
    let pickupLocationId, dropOffLocationId, pickupLocation, dropOffLocation, from, to
    const params = new URLSearchParams(window.location.search)
    if (params.has('p')) {
      pickupLocationId = params.get('p')
    }
    if (params.has('d')) {
      dropOffLocationId = params.get('d')
    }
    if (params.has('f')) {
      const val = params.get('f')
      from = val && Helper.isInteger(val) && new Date(Number.parseInt(val))
    }
    if (params.has('t')) {
      const val = params.get('t')
      to = val && Helper.isInteger(val) && new Date(Number.parseInt(val))
    }

    if (!pickupLocationId || !dropOffLocationId || !from || !to) {
      setLoading(false)
      setNoMatch(true)
      return
    }

    try {
      pickupLocation = await LocationService.getLocation(pickupLocationId)

      if (!pickupLocation) {
        setLoading(false)
        setNoMatch(true)
        return
      }

      if (dropOffLocationId !== pickupLocationId) {
        dropOffLocation = await LocationService.getLocation(dropOffLocationId)
      } else {
        dropOffLocation = pickupLocation
      }

      if (!dropOffLocation) {
        setLoading(false)
        setNoMatch(true)
        return
      }

      const allCompanies = await SupplierService.getAllCompanies()
      const companies = Helper.flattenCompanies(allCompanies)

      setPickupLocation(pickupLocation)
      setDropOffLocation(dropOffLocation)
      setFrom(from)
      setTo(to)
      setAllCompanies(allCompanies)
      setCompanies(companies)
      setLoading(false)
      if (!user || (user && user.verified)) {
        setVisible(true)
      }
    } catch (err) {
      Helper.error(err)
    }
  }

  return (
    <Master onLoad={onLoad} strict={false}>
      {visible && companies && pickupLocation && dropOffLocation && from && to && (
        <div className="cars">
          <div className="col-1">
            {!loading && (
              <>
                <CarFilter className="filter" pickupLocation={pickupLocation} dropOffLocation={dropOffLocation} from={from} to={to} onSubmit={handleCarFilterSubmit} />
                <SupplierFilter className="filter" companies={allCompanies} onChange={handleSupplierFilterChange} collapse={!Env.isMobile()} />
                <FuelFilter className="filter" onChange={handleFuelFilterChange} />
                <GearboxFilter className="filter" onChange={handleGearboxFilterChange} />
                <MileageFilter className="filter" onChange={handleMileageFilterChange} />
                <DepositFilter className="filter" onChange={handleDepositFilterChange} />
              </>
            )}
          </div>
          <div className="col-2">
            <CarList
              companies={companies}
              fuel={fuel}
              gearbox={gearbox}
              mileage={mileage}
              deposit={deposit}
              pickupLocation={pickupLocation._id}
              dropOffLocation={dropOffLocation._id}
              reload={reload}
              loading={loading}
              from={from}
              to={to}
              onLoad={handleCarListLoad}
            />
          </div>
        </div>
      )}
      {noMatch && <NoMatch hideHeader />}
    </Master>
  )
}

export default Cars
