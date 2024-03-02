import React, { useState } from 'react'
import * as bookcarsTypes from 'bookcars-types'
import * as bookcarsHelper from 'bookcars-helper'
import env from '../config/env.config'
import * as helper from '../common/helper'
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

import '../assets/css/cars.css'

const Cars = () => {
  const [visible, setVisible] = useState(false)
  const [noMatch, setNoMatch] = useState(false)
  const [pickupLocation, setPickupLocation] = useState<bookcarsTypes.Location>()
  const [dropOffLocation, setDropOffLocation] = useState<bookcarsTypes.Location>()
  const [from, setFrom] = useState<Date>()
  const [to, setTo] = useState<Date>()
  const [allCompanies, setAllCompanies] = useState<bookcarsTypes.User[]>([])
  const [companies, setCompanies] = useState<string[]>()
  const [loading, setLoading] = useState(true)
  const [fuel, setFuel] = useState([bookcarsTypes.CarType.Diesel, bookcarsTypes.CarType.Gasoline])
  const [gearbox, setGearbox] = useState([bookcarsTypes.GearboxType.Automatic, bookcarsTypes.GearboxType.Manual])
  const [mileage, setMileage] = useState([bookcarsTypes.Mileage.Limited, bookcarsTypes.Mileage.Unlimited])
  const [deposit, setDeposit] = useState(-1)

  const handleSupplierFilterChange = (newCompanies: string[]) => {
    setCompanies(newCompanies)
  }

  const handleCarFilterSubmit = (filter: bookcarsTypes.CarFilter) => {
    setPickupLocation(filter.pickupLocation)
    setDropOffLocation(filter.dropOffLocation)
    setFrom(filter.from)
    setTo(filter.to)
  }

  const handleFuelFilterChange = (values: bookcarsTypes.CarType[]) => {
    setFuel(values)
  }

  const handleGearboxFilterChange = (values: bookcarsTypes.GearboxType[]) => {
    setGearbox(values)
  }

  const handleMileageFilterChange = (values: bookcarsTypes.Mileage[]) => {
    setMileage(values)
  }

  const handleDepositFilterChange = (value: number) => {
    setDeposit(value)
  }

  const onLoad = async (user?: bookcarsTypes.User) => {
    let pickupLocationId
    let dropOffLocationId
    let _pickupLocation
    let _dropOffLocation
    let _from
    let _to
    const params = new URLSearchParams(window.location.search)
    if (params.has('p')) {
      pickupLocationId = params.get('p')
    }
    if (params.has('d')) {
      dropOffLocationId = params.get('d')
    }
    if (params.has('f')) {
      const val = params.get('f')
      _from = val && bookcarsHelper.isInteger(val) && new Date(Number.parseInt(val, 10))
    }
    if (params.has('t')) {
      const val = params.get('t')
      _to = val && bookcarsHelper.isInteger(val) && new Date(Number.parseInt(val, 10))
    }

    if (!pickupLocationId || !dropOffLocationId || !_from || !_to) {
      setLoading(false)
      setNoMatch(true)
      return
    }

    try {
      _pickupLocation = await LocationService.getLocation(pickupLocationId)

      if (!_pickupLocation) {
        setLoading(false)
        setNoMatch(true)
        return
      }

      if (dropOffLocationId !== pickupLocationId) {
        _dropOffLocation = await LocationService.getLocation(dropOffLocationId)
      } else {
        _dropOffLocation = _pickupLocation
      }

      if (!_dropOffLocation) {
        setLoading(false)
        setNoMatch(true)
        return
      }

      const _allCompanies = await SupplierService.getAllSuppliers()
      const _companies = bookcarsHelper.flattenCompanies(_allCompanies)

      setPickupLocation(_pickupLocation)
      setDropOffLocation(_dropOffLocation)
      setFrom(_from)
      setTo(_to)
      setAllCompanies(_allCompanies)
      setCompanies(_companies)
      setLoading(false)
      if (!user || (user && user.verified)) {
        setVisible(true)
      }
    } catch (err) {
      helper.error(err)
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
                <SupplierFilter className="filter" companies={allCompanies} onChange={handleSupplierFilterChange} collapse={!env.isMobile()} />
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
              loading={loading}
              from={from}
              to={to}
            />
          </div>
        </div>
      )}
      {noMatch && <NoMatch hideHeader />}
    </Master>
  )
}

export default Cars
