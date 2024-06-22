import React, { useEffect, useState } from 'react'
import { Button } from '@mui/material'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import * as helper from '../common/helper'
import env from '../config/env.config'
import { strings } from '../lang/cars'
import { strings as commonStrings } from '../lang/common'
import Layout from '../components/Layout'
import Search from '../components/Search'
import InfoBox from '../components/InfoBox'
import SupplierFilter from '../components/SupplierFilter'
import CarSpecsFilter from '../components/CarSpecsFilter'
import CarTypeFilter from '../components/CarTypeFilter'
import GearboxFilter from '../components/GearboxFilter'
import MileageFilter from '../components/MileageFilter'
import FuelPolicyFilter from '../components/FuelPolicyFilter'
import DepositFilter from '../components/DepositFilter'
import AvailabilityFilter from '../components/AvailabilityFilter'
import CarList from '../components/CarList'
import * as SupplierService from '../services/SupplierService'

import '../assets/css/cars.css'

const Cars = () => {
  const [user, setUser] = useState<bookcarsTypes.User>()
  const [admin, setAdmin] = useState(false)
  const [allSuppliers, setAllSuppliers] = useState<bookcarsTypes.User[]>([])
  const [suppliers, setSuppliers] = useState<string[]>()
  const [keyword, setKeyword] = useState('')
  const [rowCount, setRowCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [carSpecs, setCarSpecs] = useState<bookcarsTypes.CarSpecs>({})
  const [carType, setCarType] = useState<string[]>(bookcarsHelper.getAllCarTypes())
  const [gearbox, setGearbox] = useState<string[]>([bookcarsTypes.GearboxType.Automatic, bookcarsTypes.GearboxType.Manual])
  const [mileage, setMileage] = useState<string[]>([bookcarsTypes.Mileage.Limited, bookcarsTypes.Mileage.Unlimited])
  const [availability, setAvailability] = useState<string[]>([bookcarsTypes.Availablity.Available, bookcarsTypes.Availablity.Unavailable])
  const [fuelPolicy, setFuelPolicy] = useState([bookcarsTypes.FuelPolicy.FreeTank, bookcarsTypes.FuelPolicy.LikeForlike])
  const [deposit, setDeposit] = useState(-1)
  const [language, setLanguage] = useState(env.DEFAULT_LANGUAGE)

  useEffect(() => {
    const updateSuppliers = async () => {
      const payload: bookcarsTypes.GetCarsPayload = {
        carSpecs,
        carType,
        gearbox,
        mileage,
        fuelPolicy,
        deposit,
        availability,
      }
      const _allSuppliers = await SupplierService.getBackendSuppliers(payload)
      setAllSuppliers(_allSuppliers)
    }

    updateSuppliers()
  }, [carSpecs, carType, gearbox, mileage, fuelPolicy, deposit, availability])

  const handleSearch = (newKeyword: string) => {
    setKeyword(newKeyword)
  }

  const handleCarListLoad: bookcarsTypes.DataEvent<bookcarsTypes.Car> = (data) => {
    if (data) {
      setRowCount(data.rowCount)
    }
  }

  const handleCarDelete = (_rowCount: number) => {
    setRowCount(_rowCount)
  }

  const handleSupplierFilterChange = (newSuppliers: string[]) => {
    setSuppliers(newSuppliers)
  }

  const handleCarSpecsFilterChange = (value: bookcarsTypes.CarSpecs) => {
    setCarSpecs(value)
  }

  const handleCarTypeFilterChange = (values: string[]) => {
    setCarType(values)
  }

  const handleGearboxFilterChange = (values: string[]) => {
    setGearbox(values)
  }

  const handleMileageFilterChange = (values: string[]) => {
    setMileage(values)
  }

  const handleFuelPolicyFilterChange = (values: bookcarsTypes.FuelPolicy[]) => {
    setFuelPolicy(values)
  }

  const handleDepositFilterChange = (value: number) => {
    setDeposit(value)
  }

  const handleAvailabilityFilterChange = (values: string[]) => {
    setAvailability(values)
  }

  const onLoad = async (_user?: bookcarsTypes.User) => {
    setUser(_user)
    setLanguage(_user?.language as string)
    setAdmin(helper.admin(_user))

    const payload: bookcarsTypes.GetCarsPayload = {
      carSpecs,
      carType,
      gearbox,
      mileage,
      fuelPolicy,
      deposit,
      availability,
    }
    const _allSuppliers = await SupplierService.getBackendSuppliers(payload)
    const _suppliers = bookcarsHelper.flattenSuppliers(_allSuppliers)
    setAllSuppliers(_allSuppliers)
    setSuppliers(_suppliers)
    setLoading(false)
  }

  return (
    <Layout onLoad={onLoad} strict>
      {user && (
        <div className="cars">
          <div className="col-1">
            <div className="col-1-container">
              <Search onSubmit={handleSearch} className="search" />

              <Button type="submit" variant="contained" className="btn-primary new-car" size="small" href="/create-car">
                {strings.NEW_CAR}
              </Button>

              {rowCount > 0 && <InfoBox value={`${rowCount} ${rowCount > 1 ? commonStrings.CARS : commonStrings.CAR}`} className="car-count" />}

              <SupplierFilter suppliers={allSuppliers} onChange={handleSupplierFilterChange} className="filter" />

              {rowCount > -1 && (
                <>
                  <CarSpecsFilter className="filter" onChange={handleCarSpecsFilterChange} />
                  <CarTypeFilter className="car-filter" onChange={handleCarTypeFilterChange} />
                  <GearboxFilter className="car-filter" onChange={handleGearboxFilterChange} />
                  <MileageFilter className="car-filter" onChange={handleMileageFilterChange} />
                  <FuelPolicyFilter className="filter" onChange={handleFuelPolicyFilterChange} />
                  <DepositFilter className="car-filter" onChange={handleDepositFilterChange} />
                  {admin && <AvailabilityFilter className="car-filter" onChange={handleAvailabilityFilterChange} />}
                </>
              )}
            </div>
          </div>
          <div className="col-2">
            <CarList
              user={user}
              suppliers={suppliers}
              carSpecs={carSpecs}
              carType={carType}
              gearbox={gearbox}
              mileage={mileage}
              fuelPolicy={fuelPolicy}
              deposit={deposit}
              availability={availability}
              keyword={keyword}
              loading={loading}
              language={language}
              onLoad={handleCarListLoad}
              onDelete={handleCarDelete}
            />
          </div>
        </div>
      )}
    </Layout>
  )
}

export default Cars
