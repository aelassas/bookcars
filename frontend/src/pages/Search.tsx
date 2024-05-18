import React, { useState } from 'react'
import { useLocation } from 'react-router-dom'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import env from '../config/env.config'
import * as helper from '../common/helper'
import * as LocationService from '../services/LocationService'
import * as SupplierService from '../services/SupplierService'
import Layout from '../components/Layout'
import NoMatch from './NoMatch'
import CarFilter from '../components/CarFilter'
import SupplierFilter from '../components/SupplierFilter'
import CarType from '../components/CarTypeFilter'
import GearboxFilter from '../components/GearboxFilter'
import MileageFilter from '../components/MileageFilter'
import DepositFilter from '../components/DepositFilter'
import CarList from '../components/CarList'

import '../assets/css/cars.css'

const Search = () => {
  const location = useLocation()

  const [visible, setVisible] = useState(false)
  const [noMatch, setNoMatch] = useState(false)
  const [pickupLocation, setPickupLocation] = useState<bookcarsTypes.Location>()
  const [dropOffLocation, setDropOffLocation] = useState<bookcarsTypes.Location>()
  const [from, setFrom] = useState<Date>()
  const [to, setTo] = useState<Date>()
  const [allSuppliers, setAllSuppliers] = useState<bookcarsTypes.User[]>([])
  const [suppliers, setSuppliers] = useState<string[]>()
  const [loading, setLoading] = useState(true)
  const [carType, setCarType] = useState(bookcarsHelper.getAllCarTypes())
  const [gearbox, setGearbox] = useState([bookcarsTypes.GearboxType.Automatic, bookcarsTypes.GearboxType.Manual])
  const [mileage, setMileage] = useState([bookcarsTypes.Mileage.Limited, bookcarsTypes.Mileage.Unlimited])
  const [deposit, setDeposit] = useState(-1)

  const handleSupplierFilterChange = (newSuppliers: string[]) => {
    setSuppliers(newSuppliers)
  }

  const handleCarFilterSubmit = (filter: bookcarsTypes.CarFilter) => {
    setPickupLocation(filter.pickupLocation)
    setDropOffLocation(filter.dropOffLocation)
    setFrom(filter.from)
    setTo(filter.to)
  }

  const handleCarTypeFilterChange = (values: bookcarsTypes.CarType[]) => {
    setCarType(values)
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
    const { state } = location
    if (!state) {
      setNoMatch(true)
      return
    }

    const { pickupLocationId } = state
    const { dropOffLocationId } = state
    const { from: _from } = state
    const { to: _to } = state

    if (!pickupLocationId || !dropOffLocationId || !_from || !_to) {
      setLoading(false)
      setNoMatch(true)
      return
    }

    let _pickupLocation
    let _dropOffLocation
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

      const _allSuppliers = await SupplierService.getAllSuppliers()
      const _suppliers = bookcarsHelper.flattenSuppliers(_allSuppliers)

      setPickupLocation(_pickupLocation)
      setDropOffLocation(_dropOffLocation)
      setFrom(_from)
      setTo(_to)
      setAllSuppliers(_allSuppliers)
      setSuppliers(_suppliers)
      setLoading(false)
      if (!user || (user && user.verified)) {
        setVisible(true)
      }
    } catch (err) {
      helper.error(err)
    }
  }

  return (
    <Layout onLoad={onLoad} strict={false}>
      {visible && suppliers && pickupLocation && dropOffLocation && from && to && (
        <div className="cars">
          <div className="col-1">
            {!loading && (
              <>
                <CarFilter className="filter" pickupLocation={pickupLocation} dropOffLocation={dropOffLocation} from={from} to={to} onSubmit={handleCarFilterSubmit} />
                <SupplierFilter className="filter" suppliers={allSuppliers} onChange={handleSupplierFilterChange} collapse={!env.isMobile()} />
                <CarType className="filter" onChange={handleCarTypeFilterChange} />
                <GearboxFilter className="filter" onChange={handleGearboxFilterChange} />
                <MileageFilter className="filter" onChange={handleMileageFilterChange} />
                <DepositFilter className="filter" onChange={handleDepositFilterChange} />
              </>
            )}
          </div>
          <div className="col-2">
            <CarList
              suppliers={suppliers}
              carType={carType}
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
    </Layout>
  )
}

export default Search
