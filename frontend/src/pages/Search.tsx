import React, { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Button, Accordion, AccordionSummary, AccordionDetails } from '@mui/material'
import { 
  Tune as FiltersIcon,
  ExpandMore as ExpandMoreIcon,
  LocationOn as LocationIcon
} from '@mui/icons-material'
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
  // Add state for coordinates
  const [searchCoordinates, setSearchCoordinates] = useState<{ latitude: number, longitude: number } | null>(null)
  const [searchAddress, setSearchAddress] = useState<string>('')
  const [searchRadius, setSearchRadius] = useState<number>(25) // Default radius of 25km
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
          days: bookcarsHelper.days(from, to),
        }

        // Add coordinates for coordinate-based search if available
        if (searchCoordinates && searchRadius) {
          payload.coordinates = searchCoordinates
          payload.radius = searchRadius
          
          // Important: If we have coordinates, we shouldn't send the invalid location ID
          if (pickupLocation._id === '000000000000000000000000') {
            delete payload.pickupLocation
          }
        }

        const _suppliers = await SupplierService.getFrontendSuppliers(payload)
        setSuppliers(_suppliers)
      }
    }

    if (from && to) {
      updateSuppliers()
    }
  }, [pickupLocation, carSpecs, carType, gearbox, mileage, fuelPolicy, deposit, ranges, multimedia, rating, seats, from, to, searchCoordinates, searchRadius])

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
      console.log('Search failed: No state provided in location')
      setNoMatch(true)
      return
    }

    const { pickupLocationId } = state
    const { dropOffLocationId } = state
    const { from: _from } = state
    const { to: _to } = state
    const { pickupCoordinates, radius } = state

    console.log('Search state:', {
      pickupLocationId,
      dropOffLocationId,
      from: _from,
      to: _to,
      pickupCoordinates,
      radius
    })

    if (!_from || !_to) {
      console.log('Search failed: Missing from or to dates')
      setLoading(false)
      setNoMatch(true)
      return
    }

    try {
      let _pickupLocation
      let _dropOffLocation
      
      // Check if we have coordinate-based search
      if (pickupCoordinates && pickupCoordinates.latitude && pickupCoordinates.longitude) {
        // For coordinate-based search, we don't strictly need location IDs
        console.log('Using coordinate-based search', pickupCoordinates)
        
        // Set coordinates information
        setSearchCoordinates({
          latitude: pickupCoordinates.latitude,
          longitude: pickupCoordinates.longitude
        })
        setSearchAddress(pickupCoordinates.address || '')
        if (radius) {
          setSearchRadius(radius)
        }
        
        // Create placeholder location object if needed
        if (pickupLocationId && pickupLocationId.startsWith('place_')) {
          _pickupLocation = {
            _id: '000000000000000000000000', // Use a different placeholder ID that won't be sent to API
            name: pickupCoordinates.address,
            coordinates: {
              latitude: pickupCoordinates.latitude,
              longitude: pickupCoordinates.longitude
            }
          }
          
          if (dropOffLocationId === pickupLocationId) {
            _dropOffLocation = _pickupLocation
          } else if (state.dropOffCoordinates) {
            _dropOffLocation = {
              _id: '000000000000000000000000', // Use a different placeholder ID that won't be sent to API
              name: state.dropOffCoordinates.address,
              coordinates: {
                latitude: state.dropOffCoordinates.latitude,
                longitude: state.dropOffCoordinates.longitude
              }
            }
          }
          
          console.log('Created placeholder locations:', { 
            pickup: _pickupLocation, 
            dropOff: _dropOffLocation 
          })
        }
      }
      
      // If no coordinate data or we have real location IDs, fetch from database
      if (!_pickupLocation && pickupLocationId) {
        console.log('Fetching pickup location from database:', pickupLocationId)
        _pickupLocation = await LocationService.getLocation(pickupLocationId)
      }

      if (!_pickupLocation) {
        console.log('Search failed: Could not determine pickup location')
        setLoading(false)
        setNoMatch(true)
        return
      }

      if (!_dropOffLocation) {
        if (dropOffLocationId !== pickupLocationId) {
          console.log('Fetching dropoff location from database:', dropOffLocationId)
          _dropOffLocation = await LocationService.getLocation(dropOffLocationId)
        } else {
          _dropOffLocation = _pickupLocation
        }
      }

      if (!_dropOffLocation) {
        console.log('Search failed: Could not determine drop-off location')
        setLoading(false)
        setNoMatch(true)
        return
      }

      console.log('Locations resolved successfully:', {
        pickup: _pickupLocation,
        dropoff: _dropOffLocation
      })

      const days = bookcarsHelper.days(_from, _to)
      console.log('Calculated rental days:', days)

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
        days,
        suppliers: allSuppliersIds.length > 0 ? allSuppliersIds : [], // Use all available suppliers if we have them
      }

      // Add coordinates for coordinate-based search if available
      if (pickupCoordinates && radius) {
        payload.coordinates = {
          latitude: pickupCoordinates.latitude,
          longitude: pickupCoordinates.longitude
        }
        payload.radius = radius
        
        // Important: If we have coordinates, we shouldn't send the invalid location ID
        if (_pickupLocation._id === '000000000000000000000000') {
          delete payload.pickupLocation
        }
      }

      // Debug log the payload
      console.log('API Search payload:', JSON.stringify(payload, null, 2))

      try {
        console.log('Calling SupplierService.getFrontendSuppliers...')
        const _suppliers = await SupplierService.getFrontendSuppliers(payload)
        console.log('Received suppliers:', _suppliers)
        
        const _supplierIds = bookcarsHelper.flattenSuppliers(_suppliers)
        console.log('Flattened supplier IDs:', _supplierIds)

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

        setLoading(false)
        if (!user || (user && user.verified)) {
          setVisible(true)
        }
      } catch (error) {
        // Type-safe error handling
        const err = error as any
        console.error('Error fetching suppliers:', err?.response?.data || err)
        setLoading(false)
        setVisible(true) // Still show the search UI even if suppliers fetch fails
      }
    } catch (error) {
      // Type-safe error handling
      const err = error as any
      console.error('General error in search process:', err?.response?.data || err)
      helper.error(error, 'Failed to get location')
      setLoading(false)
      setVisible(true) // Still show the search UI even on error
    }
  }

  return (
    <Layout onLoad={onLoad} strict={false}>
      {visible && (
        <div className="search">
          {/* Left column with map and filters */}
          <div className="col-1">
            {!env.isMobile && (pickupLocation || searchCoordinates) && (
                <Map
                  location={searchCoordinates || pickupLocation}
                  zoom={13}
                  radius={searchRadius}
                  className="map"
                  initialZoom={10}

                />
            )}
            {pickupLocation && dropOffLocation && from && to && (
              <CarFilter
                className="filter"
                pickupLocation={pickupLocation}
                dropOffLocation={dropOffLocation}
                from={from}
                to={to}
                collapse
                onSubmit={handleCarFilterSubmit}
              />
            )}
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
          </div>

          {/* Right column with car list */}
          <div className="col-2">
            <CarList
              className="car-list"
              from={from}
              to={to}
              suppliers={supplierIds}
              pickupLocation={pickupLocation?._id}
              dropOffLocation={dropOffLocation?._id}
              pickupLocationName={searchAddress || pickupLocation?.name}
              carSpecs={carSpecs}
              carType={carType}
              gearbox={gearbox}
              mileage={mileage}
              fuelPolicy={fuelPolicy}
              deposit={deposit}
              ranges={ranges}
              multimedia={multimedia}
              rating={rating}
              seats={seats}
              coordinates={searchCoordinates || undefined}
              radius={searchRadius}
              includeAlreadyBookedCars={false}
              includeComingSoonCars={false}
            />
            
            {env.isMobile && (
              <ViewOnMapButton
                onClick={() => {
                  setOpenMapDialog(true)
                }}
              />
            )}
          </div>

          <MapDialog
            open={openMapDialog}
            zoom={13}
            location={searchCoordinates || pickupLocation}
            radius={searchRadius}
            onClose={() => {
              setOpenMapDialog(false)
            }}
          />
        </div>
      )}

      {noMatch && <NoMatch hideHeader />}
    </Layout>
  )
}

export default Search
