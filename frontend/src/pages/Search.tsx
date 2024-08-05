import React, { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import * as helper from '../common/helper'
import * as LocationService from '../services/LocationService'
import * as SupplierService from '../services/SupplierService'
import Layout from '../components/Layout'
import NoMatch from './NoMatch'
import CarFilter from '../components/CarFilter'
import CarSpecsFilter from '../components/CarSpecsFilter'
import SupplierFilter from '../components/SupplierFilter'
import CarType from '../components/CarTypeFilter'
import GearboxFilter from '../components/GearboxFilter'
import MileageFilter from '../components/MileageFilter'
import FuelPolicyFilter from '../components/FuelPolicyFilter'
import DepositFilter from '../components/DepositFilter'
import CarList from '../components/CarList'
import CarRatingFilter from '../components/CarRatingFilter'
import CarRangeFilter from '../components/CarRangeFilter'
import CarMultimediaFilter from '../components/CarMultimediaFilter'
import CarSeatsFilter from '../components/CarSeatsFilter'

import '../assets/css/cars.css'

const allSuppliers = await SupplierService.getAllSuppliers()
const allSuppliersIds = bookcarsHelper.flattenSuppliers(allSuppliers)

const Search = () => {
  const location = useLocation()

  const [visible, setVisible] = useState(false)
  const [noMatch, setNoMatch] = useState(false)
  const [pickupLocation, setPickupLocation] = useState<bookcarsTypes.Location>()
  const [dropOffLocation, setDropOffLocation] = useState<bookcarsTypes.Location>()
  const [from, setFrom] = useState<Date>()
  const [to, setTo] = useState<Date>()
  const [suppliers, setSuppliers] = useState<bookcarsTypes.User[]>([])
  const [supplierIds, setSupplierIds] = useState<string[]>()
  const [loading, setLoading] = useState(true)
  const [carSpecs, setCarSpecs] = useState<bookcarsTypes.CarSpecs>({})
  const [carType, setCarType] = useState(bookcarsHelper.getAllCarTypes())
  const [gearbox, setGearbox] = useState([bookcarsTypes.GearboxType.Automatic, bookcarsTypes.GearboxType.Manual])
  const [mileage, setMileage] = useState([bookcarsTypes.Mileage.Limited, bookcarsTypes.Mileage.Unlimited])
  const [fuelPolicy, setFuelPolicy] = useState([bookcarsTypes.FuelPolicy.FreeTank, bookcarsTypes.FuelPolicy.LikeForlike])
  const [deposit, setDeposit] = useState(-1)
  const [ranges, setRanges] = useState(bookcarsHelper.getAllRanges())
  const [multimedia, setMultimedia] = useState<bookcarsTypes.CarMultimedia[]>([])
  const [rating, setRating] = useState(bookcarsHelper.getAllRatings())
  const [seats, setSeats] = useState(-1)

  useEffect(() => {
    const updateSuppliers = async () => {
      if (pickupLocation) {
        const payload: bookcarsTypes.GetCarsPayload = {
          pickupLocation: pickupLocation._id,
          carSpecs,
          carType,
          gearbox,
          mileage,
          fuelPolicy,
          deposit,
        }
        const _suppliers = await SupplierService.getFrontendSuppliers(payload)
        setSuppliers(_suppliers)
      }
    }

    updateSuppliers()
  }, [pickupLocation, carSpecs, carType, gearbox, mileage, fuelPolicy, deposit])

  const handleCarFilterSubmit = async (filter: bookcarsTypes.CarFilter) => {
    if (suppliers.length < allSuppliers.length) {
      const _supplierIds = bookcarsHelper.clone(allSuppliersIds)
      setSupplierIds(_supplierIds)
    }

    setPickupLocation(filter.pickupLocation)
    setDropOffLocation(filter.dropOffLocation)
    setFrom(filter.from)
    setTo(filter.to)
  }

  const handleSupplierFilterChange = (newSuppliers: string[]) => {
    setSupplierIds(newSuppliers)
  }

  const handleRatingFilterChange = (value: number[]) => {
    setRating(value)
  }

  const handleRangeFilterChange = (value: bookcarsTypes.CarRange[]) => {
    setRanges(value)
  }

  const handleMultimediaFilterChange = (value: bookcarsTypes.CarMultimedia[]) => {
    setMultimedia(value)
  }

  const handleSeatsFilterChange = (value: number) => {
    setSeats(value)
  }

  const handleCarSpecsFilterChange = (value: bookcarsTypes.CarSpecs) => {
    setCarSpecs(value)
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

  const handleFuelPolicyFilterChange = (values: bookcarsTypes.FuelPolicy[]) => {
    setFuelPolicy(values)
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

      const payload: bookcarsTypes.GetCarsPayload = {
        pickupLocation: _pickupLocation._id,
        carSpecs,
        carType,
        gearbox,
        mileage,
        fuelPolicy,
        deposit,
      }
      const _suppliers = await SupplierService.getFrontendSuppliers(payload)
      const _supplierIds = bookcarsHelper.flattenSuppliers(_suppliers)

      setPickupLocation(_pickupLocation)
      setDropOffLocation(_dropOffLocation)
      setFrom(_from)
      setTo(_to)
      setSuppliers(_suppliers)
      setSupplierIds(_supplierIds)
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
      {visible && supplierIds && pickupLocation && dropOffLocation && from && to && (
        <div className="cars">
          <div className="col-1">
            {!loading && (
              <>
                <CarFilter
                  className="filter"
                  pickupLocation={pickupLocation}
                  dropOffLocation={dropOffLocation}
                  from={from}
                  to={to}
                  accordion
                  collapse
                  onSubmit={handleCarFilterSubmit}
                />
                <SupplierFilter className="filter" suppliers={suppliers} onChange={handleSupplierFilterChange} />
                <CarRatingFilter className="filter" onChange={handleRatingFilterChange} />
                <CarRangeFilter className="filter" onChange={handleRangeFilterChange} />
                <CarMultimediaFilter className="filter" onChange={handleMultimediaFilterChange} />
                <CarSeatsFilter className="filter" onChange={handleSeatsFilterChange} />
                <CarSpecsFilter className="filter" onChange={handleCarSpecsFilterChange} />
                <CarType className="filter" onChange={handleCarTypeFilterChange} />
                <GearboxFilter className="filter" onChange={handleGearboxFilterChange} />
                <MileageFilter className="filter" onChange={handleMileageFilterChange} />
                <FuelPolicyFilter className="filter" onChange={handleFuelPolicyFilterChange} />
                <DepositFilter className="filter" onChange={handleDepositFilterChange} />
              </>
            )}
          </div>
          <div className="col-2">
            <CarList
              carSpecs={carSpecs}
              suppliers={supplierIds}
              carType={carType}
              gearbox={gearbox}
              mileage={mileage}
              fuelPolicy={fuelPolicy}
              deposit={deposit}
              pickupLocation={pickupLocation._id}
              dropOffLocation={dropOffLocation._id}
              loading={loading}
              from={from}
              to={to}
              ranges={ranges}
              multimedia={multimedia}
              rating={rating}
              seats={seats}
            />
          </div>
        </div>
      )}
      {noMatch && <NoMatch hideHeader />}
    </Layout>
  )
}

export default Search
