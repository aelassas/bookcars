import React, { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Button, useMediaQuery } from '@mui/material'
import { Tune as FiltersIcon } from '@mui/icons-material'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import { strings } from '@/lang/search'
import * as helper from '@/utils/helper'
import env from '@/config/env.config'
import * as LocationService from '@/services/LocationService'
import * as SupplierService from '@/services/SupplierService'
// import * as UserService from '@/services/UserService'
import Layout from '@/components/Layout'
import NoMatch from './NoMatch'
import CarFilter from '@/components/CarFilter'
import CarSpecsFilter from '@/components/CarSpecsFilter'
import SupplierFilter from '@/components/SupplierFilter'
import CarType from '@/components/CarTypeFilter'
import GearboxFilter from '@/components/GearboxFilter'
import MileageFilter from '@/components/MileageFilter'
import FuelPolicyFilter from '@/components/FuelPolicyFilter'
import DepositFilter from '@/components/DepositFilter'
import CarList from '@/components/CarList'
import CarRatingFilter from '@/components/CarRatingFilter'
import CarRangeFilter from '@/components/CarRangeFilter'
import CarMultimediaFilter from '@/components/CarMultimediaFilter'
import CarSeatsFilter from '@/components/CarSeatsFilter'
import Map from '@/components/Map'
// import Progress from '@/components/Progress'
import ViewOnMapButton from '@/components/ViewOnMapButton'
import MapDialog from '@/components/MapDialog'

import '@/assets/css/search.css'

const Search = () => {
  const location = useLocation()
  const inlineMap = useMediaQuery('(min-width: 1281px)')

  const [visible, setVisible] = useState(false)
  const [noMatch, setNoMatch] = useState(false)
  const [pickupLocation, setPickupLocation] = useState<bookcarsTypes.Location>()
  const [pickupCoordinates, setPickupCoordinates] = useState<{ latitude: number; longitude: number }>()
  const [dropOffLocation, setDropOffLocation] = useState<bookcarsTypes.Location>()
  const [from, setFrom] = useState<Date>()
  const [to, setTo] = useState<Date>()
  const [allSuppliers, setAllSuppliers] = useState<bookcarsTypes.User[]>([])
  const [allSuppliersIds, setAllSuppliersIds] = useState<string[]>([])
  const [suppliers, setSuppliers] = useState<bookcarsTypes.User[]>([])
  const [supplierIds, setSupplierIds] = useState<string[]>()
  const [loading, setLoading] = useState(true)
  const [carSpecs, setCarSpecs] = useState<bookcarsTypes.CarSpecs>({})
  const [carType, setCarType] = useState(bookcarsHelper.getAllCarTypes())
  const [gearbox, setGearbox] = useState([bookcarsTypes.GearboxType.Automatic, bookcarsTypes.GearboxType.Manual])
  const [mileage, setMileage] = useState([bookcarsTypes.Mileage.Limited, bookcarsTypes.Mileage.Unlimited])
  const [fuelPolicy, setFuelPolicy] = useState(bookcarsHelper.getAllFuelPolicies())
  const [deposit, setDeposit] = useState(-1)
  const [ranges, setRanges] = useState(bookcarsHelper.getAllRanges())
  const [multimedia, setMultimedia] = useState<bookcarsTypes.CarMultimedia[]>([])
  const [rating, setRating] = useState(-1)
  const [seats, setSeats] = useState(-1)
  const [openMapDialog, setOpenMapDialog] = useState(false)
  // const [distance, setDistance] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [hubLocations, setHubLocations] = useState<bookcarsTypes.Location[]>([])
  const [searchedPlace, setSearchedPlace] = useState('')
  const [showMapPane, setShowMapPane] = useState(true)
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
    LocationService.getLocationsWithPosition().then(setHubLocations).catch(() => setHubLocations([]))
  }, [])

  useEffect(() => {
    const updateSuppliers = async () => {
      if (pickupLocation) {
        const payload: bookcarsTypes.GetCarsPayload = {
          pickupLocation: pickupLocation._id,
          pickupLatitude: pickupCoordinates?.latitude,
          pickupLongitude: pickupCoordinates?.longitude,
          carSpecs,
          carType,
          gearbox,
          mileage,
          fuelPolicy,
          deposit,
          ranges,
          multimedia,
          rating,
          seats,
          from,
          to,
        }
        const _suppliers = await SupplierService.getFrontendSuppliers(payload)
        setSuppliers(_suppliers)
      }
    }

    if (from && to) {
      updateSuppliers()
    }
  }, [pickupLocation, pickupCoordinates, carSpecs, carType, gearbox, mileage, fuelPolicy, deposit, ranges, multimedia, rating, seats, from, to])

  const handleCarFilterSubmit = async (filter: bookcarsTypes.CarFilter) => {
    if (suppliers.length < allSuppliers.length) {
      const _supplierIds = bookcarsHelper.clone(allSuppliersIds)
      setSupplierIds(_supplierIds)
    }

    setPickupLocation(filter.pickupLocation)
    if (filter.pickupLocation._id !== pickupLocation?._id) {
      setPickupCoordinates(undefined)
    }
    setDropOffLocation(filter.dropOffLocation)
    setFrom(filter.from)
    setTo(filter.to)
  }

  const handleSupplierFilterChange = (newSuppliers: string[]) => {
    setSupplierIds(newSuppliers)
  }

  const handleRatingFilterChange = (value: number) => {
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
    let state = location.state
    if (!state) {
      // Direct visits still open a usable search with a real pickup hub.
      try {
        const hubs = await LocationService.getLocationsWithPosition()
        if (!hubs.length) {
 setLoading(false); setNoMatch(true); return 
}
        const start = new Date()
        start.setDate(start.getDate() + 1)
        start.setHours(10, 0, 0, 0)
        const end = new Date(start)
        end.setDate(end.getDate() + 3)
        state = { pickupLocationId: hubs[0]._id, dropOffLocationId: hubs[0]._id, from: start, to: end }
      } catch (error) {
        helper.error(error)
        setLoading(false)
        setNoMatch(true)
        return
      }
    }

    const { pickupLocationId } = state
    const { dropOffLocationId } = state
    const { pickupCoordinates: _pickupCoordinates, pickupPlace } = state
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
        pickupLatitude: _pickupCoordinates?.latitude,
        pickupLongitude: _pickupCoordinates?.longitude,
        pickupLabel: pickupPlace,
        carSpecs,
        carType,
        gearbox,
        mileage,
        fuelPolicy,
        deposit,
        ranges,
        multimedia,
        rating,
        seats,
        from: _from,
        to: _to,
      }
      const _suppliers = await SupplierService.getFrontendSuppliers(payload)
      const _supplierIds = bookcarsHelper.flattenSuppliers(_suppliers)

      setPickupLocation(_pickupLocation)
      setPickupCoordinates(_pickupCoordinates)
      setDropOffLocation(_dropOffLocation)
      setSearchedPlace(pickupPlace || '')
      setFrom(new Date(_from))
      setTo(new Date(_to))
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
      setLoading(false)
      setNoMatch(true)
    }
  }

  const isFallbackHub = Boolean(
    (searchedPlace && pickupLocation && !(pickupLocation.name || '').toLowerCase().includes(searchedPlace.toLowerCase().trim()))
  )

  return (
    <>
      <Layout onLoad={onLoad} strict={false}>
        {visible && supplierIds && pickupLocation && dropOffLocation && from && to && (
          <div className="search">
            <div className="col-1 filter-rail">
              {!loading && (
                <>
                  <CarFilter
                    key={[pickupLocation._id, dropOffLocation._id, from.getTime(), to.getTime()].join('-')}
                    className="filter"
                    pickupLocation={pickupLocation}
                    dropOffLocation={dropOffLocation}
                    from={from}
                    to={to}
                    collapse
                    onSubmit={handleCarFilterSubmit}
                  />

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
                    )
                  }
                </>
              )}
            </div>
            <div className="col-2 vehicle-feed">
              {isFallbackHub && (
                <div className="hub-fallback-banner">
                  <div className="hub-fallback-top">
                    <span className="hub-fallback-badge">Available pickup point: {pickupLocation.name}</span>
                    <span className="hub-fallback-status">Confirm route suitability</span>
                  </div>
                  <h3 className="hub-fallback-title">No pickup point matched your requested area</h3>
                  <p className="hub-fallback-desc">
                    Results use the available pickup point shown above. Contact the supplier to confirm delivery, travel distance, and mountain-route suitability before booking.
                  </p>
                  <div className="hub-fallback-footer">
                    <span className="outstation-delivery-text">Delivery fees and timing require supplier confirmation.</span>
                  </div>
                </div>
              )}

              <div className="feed-toolbar">
                <span className="feed-meta">Showing available listings with PKR pricing</span>
                <Button
                  variant="outlined"
                  size="small"
                  className="toggle-map-btn"
                  onClick={() => inlineMap ? setShowMapPane((prev) => !prev) : setOpenMapDialog(true)}
                >
                  {inlineMap && showMapPane ? 'Hide map' : 'View hub map'}
                </Button>
              </div>

              <CarList
                carSpecs={carSpecs}
                suppliers={supplierIds}
                carType={carType}
                gearbox={gearbox}
                mileage={mileage}
                fuelPolicy={fuelPolicy}
                deposit={deposit}
                pickupLocation={pickupLocation._id}
                pickupCoordinates={pickupCoordinates}
                pickupLocationName={pickupLocation.name}
                dropOffLocation={dropOffLocation._id}
                loading={loading}
                from={from}
                to={to}
                ranges={ranges}
                multimedia={multimedia}
                rating={rating}
                seats={seats}
                hideSupplier={env.HIDE_SUPPLIERS}
                rentalMode={location.state?.rentalMode}
                nearbyHubs={hubLocations
                  .filter((hub) => hub.name && hub._id !== pickupLocation._id && hub.latitude != null && hub.longitude != null
                    && pickupLocation.latitude != null && pickupLocation.longitude != null)
                  .map((hub) => ({ hub, distance: bookcarsHelper.distance(pickupLocation.latitude!, pickupLocation.longitude!, hub.latitude!, hub.longitude!, 'K') }))
                  .sort((a, b) => a.distance - b.distance)
                  .slice(0, 3)
                  .map(({ hub }) => hub)}
                onDateChange={(newFrom, newTo) => {
                  setSupplierIds(allSuppliersIds)
                  setFrom(newFrom)
                  setTo(newTo)
                }}
                onHubChange={(hub) => {
                  if (pickupLocation._id === dropOffLocation._id) {
setDropOffLocation(hub)
}
                  setPickupLocation(hub)
                  setPickupCoordinates(undefined)
                  setSearchedPlace('')
                  setSupplierIds(allSuppliersIds)
                }}
              />
            </div>

            {inlineMap && showMapPane && (
              <div className="col-3 map-pane">
                <div className="map-pane-header">
                  <span className="map-pane-title">Pickup hub map</span>
                  <button
                    type="button"
                    className="map-pane-close"
                    onClick={() => setShowMapPane(false)}
                    title="Close Map Pane"
                  >
                    ✕
                  </button>
                </div>
                {((pickupLocation.latitude && pickupLocation.longitude)
                  || (pickupLocation.parkingSpots && pickupLocation.parkingSpots.length > 0)) && (
                    <Map
                      position={[
                        pickupLocation.latitude || Number(pickupLocation.parkingSpots![0].latitude),
                        pickupLocation.longitude || Number(pickupLocation.parkingSpots![0].longitude),
                      ]}
                      initialZoom={10}
                      locations={[pickupLocation]}
                      parkingSpots={pickupLocation.parkingSpots}
                      className="search-pane-map"
                    >
                      <ViewOnMapButton onClick={() => setOpenMapDialog(true)} />
                    </Map>
                  )}
              </div>
            )}
          </div>
        )}

        <MapDialog
          pickupLocation={pickupLocation}
          openMapDialog={openMapDialog}
          onClose={() => setOpenMapDialog(false)}
        />

        {noMatch && <NoMatch hideHeader />}
      </Layout>
    </>
  )
}

export default Search
