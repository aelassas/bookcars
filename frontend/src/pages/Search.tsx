import React, { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Alert, Button, Stack, Typography } from '@mui/material'
import { Tune as FiltersIcon } from '@mui/icons-material'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import { strings } from '@/lang/search'
import * as helper from '@/utils/helper'
import env from '@/config/env.config'
import * as LocationService from '@/services/LocationService'
import * as SupplierService from '@/services/SupplierService'
import * as CarService from '@/services/CarService'
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
  const [nearbySuggestions, setNearbySuggestions] = useState<Array<{ from: string, to: string, availableCars: number }>>([])
  const [hubFallback, setHubFallback] = useState<string | null>(null)
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
        const payload: bookcarsTypes.GetCarsPayload = {
          pickupLocation: pickupLocation._id,
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
  }, [pickupLocation, carSpecs, carType, gearbox, mileage, fuelPolicy, deposit, ranges, multimedia, rating, seats, from, to])

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
      setDropOffLocation(_dropOffLocation)
      setFrom(_from)
      setTo(_to)
      setSuppliers(_suppliers)
      setSupplierIds(_supplierIds)

      try {
        const nearby = await CarService.getNearbyAvailability({
          pickupLocation: _pickupLocation._id,
          from: new Date(_from),
          to: new Date(_to),
          radiusDays: 14,
        })
        setNearbySuggestions(nearby.suggestions)
      } catch {
        setNearbySuggestions([])
      }

      if (_pickupLocation.name && /murree/i.test(_pickupLocation.name)) {
        try {
          const resolution = await LocationService.resolveHub({
            name: _pickupLocation.name,
            latitude: _pickupLocation.latitude,
            longitude: _pickupLocation.longitude,
            radiusKm: 50,
          })
          setHubFallback(
            resolution.nearestHub
              ? `Nearest registered pickup hub: ${resolution.nearestHub.name} (${resolution.nearestHub.distanceKm} km).`
              : 'No registered pickup hub was found near Murree.',
          )
        } catch {
          setHubFallback('Murree inventory was searched directly; no nearest-hub confirmation was available.')
        }
      }

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

                  <CarFilter
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
            <div className="col-2">
              {hubFallback && <Alert severity="info" sx={{ mb: 2 }}>{hubFallback}</Alert>}
              {nearbySuggestions.length > 0 && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  <Typography variant="subtitle2">Nearby available dates</Typography>
                  <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }}>
                    {nearbySuggestions.map((suggestion) => (
                      <Button
                        key={`${suggestion.from}-${suggestion.to}`}
                        size="small"
                        variant="outlined"
                        onClick={() => {
                          setFrom(new Date(suggestion.from))
                          setTo(new Date(suggestion.to))
                        }}
                      >
                        {new Date(suggestion.from).toLocaleDateString()} - {new Date(suggestion.to).toLocaleDateString()} ({suggestion.availableCars})
                      </Button>
                    ))}
                  </Stack>
                </Alert>
              )}
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
                // pickupLocationName={pickupLocation.name}
                loading={loading}
                from={from}
                to={to}
                ranges={ranges}
                multimedia={multimedia}
                rating={rating}
                seats={seats}
                // distance={distance}
                // onLoad={() => setLoadingPage(false)}
                hideSupplier={env.HIDE_SUPPLIERS}
                // includeAlreadyBookedCars
                includeComingSoonCars
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
