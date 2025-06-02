import React, { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Button } from '@mui/material'
import { Tune as FiltersIcon } from '@mui/icons-material'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import { strings } from '@/lang/search'
import * as helper from '@/common/helper'
import env from '@/config/env.config'
import * as LocationService from '@/services/LocationService'
import * as SupplierService from '@/services/SupplierService'
// import * as UserService from '@/services/UserService'
import Layout from '@/components/Layout'
import NoMatch from './NoMatch'
import SupplierFilter from '@/components/SupplierFilter'
import DepositFilter from '@/components/DepositFilter'
import DressList from '@/components/DressList'
import DressTypeFilter from '@/components/DressTypeFilter'
import DressSizeFilter from '@/components/DressSizeFilter'
import DressStyleFilter from '@/components/DressStyleFilter'
import DressMaterialFilter from '@/components/DressMaterialFilter'
import Map from '@/components/Map'
// import Progress from '@/components/Progress'
import ViewOnMapButton from '@/components/ViewOnMapButton'
import MapDialog from '@/components/MapDialog'

import '@/assets/css/search.css'

const Search = () => {
  const location = useLocation()

  const [visible, setVisible] = useState(false)
  const [noMatch, setNoMatch] = useState(false)
  const [pickupLocation, setPickupLocation] = useState<bookcarsTypes.Location>()
  const [dropOffLocation, setDropOffLocation] = useState<bookcarsTypes.Location>()
  const [from, setFrom] = useState<Date>()
  const [to, setTo] = useState<Date>()
  const [allSuppliers, setAllSuppliers] = useState<bookcarsTypes.User[]>([])
  const [allSuppliersIds, setAllSuppliersIds] = useState<string[]>([])
  const [suppliers, setSuppliers] = useState<bookcarsTypes.User[]>([])
  const [supplierIds, setSupplierIds] = useState<string[]>()
  const [loading, setLoading] = useState(true)
  const [dressType, setDressType] = useState(bookcarsHelper.getAllDressTypes())
  const [dressSize, setDressSize] = useState(bookcarsHelper.getAllDressSizes())
  const [dressStyle, setDressStyle] = useState(bookcarsHelper.getAllDressStyles())
  const [dressMaterial, setDressMaterial] = useState(bookcarsHelper.getAllDressMaterials())
  const [deposit, setDeposit] = useState(-1)
  const [openMapDialog, setOpenMapDialog] = useState(false)
  // const [distance, setDistance] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  // const [loadingPage, setLoadingPage] = useState(true)

  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const fetchedSuppliers = await SupplierService.getAllSuppliers()
        setAllSuppliers(fetchedSuppliers)
        setAllSuppliersIds(bookcarsHelper.flattenSuppliers(fetchedSuppliers))
      } catch (err) {
        helper.error(err, 'Failed to fetch suppliers')
      }
    }

    fetchSuppliers()
  }, [])

  useEffect(() => {
    const updateSuppliers = async () => {
      if (pickupLocation) {
        const payload: bookcarsTypes.GetDressesPayload = {
          pickupLocation: pickupLocation._id,
          dressType,
          dressSize,
          dressStyle,
          dressMaterial,
          deposit,
          days: bookcarsHelper.days(from, to),
        }
        const _suppliers = await SupplierService.getFrontendSuppliers(payload)
        setSuppliers(_suppliers)
      }
    }

    if (from && to) {
      updateSuppliers()
    }
  }, [pickupLocation, dressType, dressSize, dressStyle, dressMaterial, deposit, from, to])

  const handleSupplierFilterChange = (newSuppliers: string[]) => {
    setSupplierIds(newSuppliers)
  }

  const handleDressTypeFilterChange = (values: bookcarsTypes.DressType[]) => {
    setDressType(values)
  }

  const handleDressSizeFilterChange = (values: bookcarsTypes.DressSize[]) => {
    setDressSize(values)
  }

  const handleDressStyleFilterChange = (values: bookcarsTypes.DressStyle[]) => {
    setDressStyle(values)
  }

  const handleDressMaterialFilterChange = (values: bookcarsTypes.DressMaterial[]) => {
    setDressMaterial(values)
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

      const payload: bookcarsTypes.GetDressesPayload = {
        pickupLocation: _pickupLocation._id,
        dressType,
        dressSize,
        dressStyle,
        dressMaterial,
        deposit,
        days: bookcarsHelper.days(from, to),
      }
      const _suppliers = await SupplierService.getFrontendSuppliers(payload)
      const _supplierIds = bookcarsHelper.flattenSuppliers(_suppliers)

      setPickupLocation(_pickupLocation)
      setDropOffLocation(_dropOffLocation)
      setFrom(_from)
      setTo(_to)
      setSuppliers(_suppliers)
      setSupplierIds(_supplierIds)

      const { ranges: _ranges } = state
      if (_ranges) {
        setRanges(_ranges)
      }

      // if (_pickupLocation.latitude && _pickupLocation.longitude) {
      //   const l = await helper.getLocation()
      //   if (l) {
      //     const d = bookcarsHelper.distance(_pickupLocation.latitude, _pickupLocation.longitude, l[0], l[1], 'K')
      //     setDistance(bookcarsHelper.formatDistance(d, UserService.getLanguage()))
      //   }
      // }

      setLoading(false)
      if (!user || (user && user.verified)) {
        setVisible(true)
      }
    } catch (err) {
      helper.error(err)
    }
  }

  return (
    <>
      <Layout onLoad={onLoad} strict={false}>
        {visible && supplierIds && pickupLocation && dropOffLocation && from && to && (
          <div className="search">
            <div className="col-1">
              {!loading && (
                <>
                  {((pickupLocation.latitude && pickupLocation.longitude)
                    || (pickupLocation.parkingSpots && pickupLocation.parkingSpots.length > 0)) && (
                      <Map
                        position={[pickupLocation.latitude || Number(pickupLocation.parkingSpots![0].latitude), pickupLocation.longitude || Number(pickupLocation.parkingSpots![0].longitude)]}
                        initialZoom={10}
                        locations={[pickupLocation]}
                        parkingSpots={pickupLocation.parkingSpots}
                        className="map"
                      >
                        <ViewOnMapButton onClick={() => setOpenMapDialog(true)} />
                      </Map>
                    )}

                  {/* Dress filter would go here if needed */}

                  <Button
                    variant="outlined"
                    color="primary"
                    startIcon={<FiltersIcon />}
                    disableElevation
                    fullWidth
                    className="btn btn-filters"
                    onClick={() => setShowFilters((prev) => !prev)}
                  >
                    {showFilters ? strings.HILE_FILTERS : strings.SHOW_FILTERS}
                  </Button>

                  {
                    showFilters && (
                      <>
                        {!env.HIDE_SUPPLIERS && <SupplierFilter className="filter" suppliers={suppliers} onChange={handleSupplierFilterChange} />}
                        <DressTypeFilter className="filter" onChange={handleDressTypeFilterChange} />
                        <DressSizeFilter className="filter" onChange={handleDressSizeFilterChange} />
                        <DressStyleFilter className="filter" onChange={handleDressStyleFilterChange} />
                        <DressMaterialFilter className="filter" onChange={handleDressMaterialFilterChange} />
                        <DepositFilter className="filter" onChange={handleDepositFilterChange} />
                      </>
                    )
                  }
                </>
              )}
            </div>
            <div className="col-2">
              <DressList
                suppliers={supplierIds}
                dressType={dressType}
                dressSize={dressSize}
                dressStyle={dressStyle}
                dressMaterial={dressMaterial}
                deposit={deposit}
                pickupLocation={pickupLocation._id}
                dropOffLocation={dropOffLocation._id}
                loading={loading}
                from={from}
                to={to}
                hideSupplier={env.HIDE_SUPPLIERS}
                includeComingSoonDresses
              />
            </div>
          </div>
        )}

        <MapDialog
          pickupLocation={pickupLocation}
          openMapDialog={openMapDialog}
          onClose={() => setOpenMapDialog(false)}
        />

        {noMatch && <NoMatch hideHeader />}
      </Layout>

      {/* {loadingPage && !noMatch && <Progress />} */}
    </>
  )
}

export default Search
