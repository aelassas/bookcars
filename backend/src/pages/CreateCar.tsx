import React, { useState, useRef, useEffect } from 'react'
import {
  Input,
  InputLabel,
  FormControl,
  Button,
  Paper,
  FormControlLabel,
  Switch,
  TextField,
  FormHelperText,
} from '@mui/material'
import { Info as InfoIcon } from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import Layout from '@/components/Layout'
import env from '@/config/env.config'
import { strings as commonStrings } from '@/lang/common'
import { strings as csStrings } from '@/lang/cars'
import { strings } from '@/lang/create-car'
import * as CarService from '@/services/CarService'
import * as helper from '@/common/helper'
import Error from '@/components/Error'
import Backdrop from '@/components/SimpleBackdrop'
import Avatar from '@/components/Avatar'
import SupplierSelectList from '@/components/SupplierSelectList'
import LocationSelectList from '@/components/LocationSelectList'
import CarTypeList from '@/components/CarTypeList'
import GearboxList from '@/components/GearboxList'
import SeatsList from '@/components/SeatsList'
import DoorsList from '@/components/DoorsList'
import FuelPolicyList from '@/components/FuelPolicyList'
import CarRangeList from '@/components/CarRangeList'
import MultimediaList from '@/components/MultimediaList'
import DateBasedPriceEditList from '@/components/DateBasedPriceEditList'
import { UserContextType, useUserContext } from '@/context/UserContext'
import LocationMapModal from '@/components/LocationMapModal'

import '@/assets/css/create-car.css'
import '@/assets/css/location-map-modal.css'
import { text } from 'stream/consumers'

const CreateCar = () => {
  const navigate = useNavigate()

  const { user } = useUserContext() as UserContextType
  const [isSupplier, setIsSupplier] = useState(false)
  const [loading, setLoading] = useState(false)
  const [visible, setVisible] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [imageSizeError, setImageSizeError] = useState(false)
  const [image, setImage] = useState('')
  const [name, setName] = useState('')
  const [supplier, setSupplier] = useState('')
  const [locations, setLocations] = useState<bookcarsTypes.Option[]>([])
  const [locationInput, setLocationInput] = useState('')
  const [selectedLocations, setSelectedLocations] = useState<{ name: string, latitude: number, longitude: number }[]>([])
  const [range, setRange] = useState('')
  const [multimedia, setMultimedia] = useState<bookcarsTypes.CarMultimedia[]>([])
  const [rating, setRating] = useState('')
  const [co2, setCo2] = useState('')
  const [available, setAvailable] = useState(true)
  const [fullyBooked, setFullyBooked] = useState(false)
  const [comingSoon, setComingSoon] = useState(false)
  const [type, setType] = useState('')
  const [gearbox, setGearbox] = useState('')
  const [dailyPrice, setDailyPrice] = useState('')
  const [discountedDailyPrice, setDiscountedDailyPrice] = useState('')
  const [biWeeklyPrice, setBiWeeklyPrice] = useState('')
  const [discountedBiWeeklyPrice, setDiscountedBiWeeklyPrice] = useState('')
  const [weeklyPrice, setWeeklyPrice] = useState('')
  const [discountedWeeklyPrice, setDiscountedWeeklyPrice] = useState('')
  const [monthlyPrice, setMonthlyPrice] = useState('')
  const [discountedMonthlyPrice, setDiscountedMonthlyPrice] = useState('')
  const [seats, setSeats] = useState('')
  const [doors, setDoors] = useState('')
  const [aircon, setAircon] = useState(false)
  const [mileage, setMileage] = useState('')
  const [fuelPolicy, setFuelPolicy] = useState('')
  const [cancellation, setCancellation] = useState('')
  const [amendments, setAmendments] = useState('')
  const [theftProtection, setTheftProtection] = useState('')
  const [collisionDamageWaiver, setCollisionDamageWaiver] = useState('')
  const [fullInsurance, setFullInsurance] = useState('')
  const [additionalDriver, setAdditionalDriver] = useState('')
  const [minimumAge, setMinimumAge] = useState(String(env.MINIMUM_AGE))
  const [minimumAgeValid, setMinimumAgeValid] = useState(true)
  const [formError, setFormError] = useState(false)
  const [deposit, setDeposit] = useState('')
  const [isDateBasedPrice, setIsDateBasedPrice] = useState(false)
  const [dateBasedPrices, setDateBasedPrices] = useState<bookcarsTypes.DateBasedPrice[]>([])

  // Location modal state
  const [locationModalOpen, setLocationModalOpen] = useState(false)
  const [selectedPlace, setSelectedPlace] = useState<{formatted_address?: string, geometry?: {location?: {lat: () => number, lng: () => number}}} | null>(null)
  const [tempCoordinates, setTempCoordinates] = useState<{ lat: number, lng: number }>({ lat: 13.6929, lng: -89.2182 }) // San Salvador coordinates as default

  const autocompleteInput = useRef<HTMLInputElement>(null)
  const [scriptLoaded, setScriptLoaded] = useState(false)
  const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  
  useEffect(() => {
    // Load Google Maps script
    if (!scriptLoaded) {
      const script = document.createElement('script')
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`
      script.async = true
      script.defer = true
      script.onload = () => {
        setScriptLoaded(true)
      }
      document.head.appendChild(script)
      
      return () => {
        document.head.removeChild(script)
      }
    }
  }, [GOOGLE_MAPS_API_KEY])
  
  // Manual initialization function for Google Places
  const initializeGooglePlaces = () => {
    if (!autocompleteInput.current) {
      return
    }
    
    try {
      const google = (window as any).google
      if (!google || !google.maps || !google.maps.places) {
        console.error('Google Maps Places API not available')
        return
      }
            
      // Destroy existing autocomplete if any
      const existingAutocomplete = autocompleteInput.current.getAttribute('data-autocomplete-initialized')
      if (existingAutocomplete === 'true') {
        console.log('Refreshing autocomplete instance')
      }
      
      // Create new autocomplete instance
      const autocomplete = new google.maps.places.Autocomplete(autocompleteInput.current, {
        types: ['geocode'],
        fields: ['address_components', 'formatted_address', 'geometry', 'name'],
        componentRestrictions: { country: 'sv' } // 'sv' is the country code for El Salvador
      })
      
      // Mark the input as initialized
      autocompleteInput.current.setAttribute('data-autocomplete-initialized', 'true')
      
      // Prevent form submission on enter key
      autocompleteInput.current.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
        }
      })
      
      // Set up place changed listener
      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace()
        
        if (place && place.formatted_address && place.geometry && place.geometry.location) {
          // Store the selected place in state
          setSelectedPlace(place)
          
          // Set temporary coordinates for the modal with proper values 
          const lat = place.geometry.location.lat()
          const lng = place.geometry.location.lng()
          
          setTempCoordinates({ lat, lng })
          
          // Open the map modal for coordinate confirmation
          setLocationModalOpen(true)
        } else {
          console.error('Selected place has no geometry or formatted address')
        }
      })
      
    } catch (error) {
      console.error('Error initializing autocomplete:', error)
    }
  }
  
  useEffect(() => {
    // Initialize autocomplete when script is loaded
    if (scriptLoaded) {
      // Add a small delay to ensure the Google API is fully loaded
      const timer = setTimeout(() => {
        initializeGooglePlaces()
      }, 500)
      
      return () => clearTimeout(timer)
    }
  }, [scriptLoaded])
  
  // Also reinitialize when the input ref changes
  useEffect(() => {
    if (scriptLoaded && autocompleteInput.current) {
      initializeGooglePlaces()
    }
  }, [autocompleteInput.current])
  
  const handleLocationInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocationInput(e.target.value)
  }
  
  // Handler for confirming exact location from the map modal
  const handleLocationConfirm = (coordinates: { lat: number, lng: number }) => {
    if (selectedPlace && selectedPlace.formatted_address) {      
      // Check if we've already reached the maximum of 3 locations
      if (selectedLocations.length >= 3) {
        helper.error(commonStrings.MAX_LOCATIONS_REACHED)
        return
      }
      
      // Use the most up-to-date place name from the modal
      // The currentPlaceName prop will be passed from the modal
      const locationName = currentPlaceName || selectedPlace.formatted_address
      
      const newLocation = {
        name: locationName,
        latitude: coordinates.lat,
        longitude: coordinates.lng
      }
      
      // Add to selected locations array
      setSelectedLocations([...selectedLocations, newLocation])
      setLocationInput('') // Clear input after selection
      
      // We're now handling locations directly via locationCoordinates,
      // so we don't need to maintain a separate locations array with custom IDs
      
      // Clear selected place
      setSelectedPlace(null)
    }
  }
  
  // Handler for closing the location modal
  const handleLocationModalClose = () => {
    setLocationModalOpen(false)
    // We don't clear selectedPlace here to preserve the data for handleLocationConfirm
  }

  // Handler for receiving the updated place name from the modal
  const [currentPlaceName, setCurrentPlaceName] = useState('')
  
  const handlePlaceNameUpdate = (name: string) => {
    setCurrentPlaceName(name)
  }

  const handleRemoveLocation = (index: number) => {
    const newSelectedLocations = [...selectedLocations]
    newSelectedLocations.splice(index, 1)
    setSelectedLocations(newSelectedLocations)
    
    const newLocations = [...locations]
    newLocations.splice(index, 1)
    setLocations(newLocations)
  }

  const handleBeforeUpload = () => {
    setLoading(true)
  }

  const handleImageChange = (_image: bookcarsTypes.Car | string | null) => {
    setLoading(false)
    setImage(_image as string)

    if (_image !== null) {
      setImageError(false)
    }
  }

  const handleImageValidate = (valid: boolean) => {
    if (!valid) {
      setImageSizeError(true)
      setImageError(false)
      setFormError(false)
      setLoading(false)
    } else {
      setImageSizeError(false)
      setImageError(false)
      setFormError(false)
    }
  }

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value)
  }

  const handleSupplierChange = (values: bookcarsTypes.Option[]) => {
    setSupplier(values.length > 0 ? values[0]._id : '')
  }

  const validateMinimumAge = (age: string, updateState = true) => {
    if (age) {
      const _age = Number.parseInt(age, 10)
      const _minimumAgeValid = _age >= env.MINIMUM_AGE && _age <= 99
      if (updateState) {
        setMinimumAgeValid(_minimumAgeValid)
      }
      if (_minimumAgeValid) {
        setFormError(false)
      }
      return _minimumAgeValid
    }
    setMinimumAgeValid(true)
    setFormError(false)
    return true
  }

  const handleMinimumAgeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMinimumAge(e.target.value)

    const _minimumAgeValid = validateMinimumAge(e.target.value, false)
    if (_minimumAgeValid) {
      setMinimumAgeValid(true)
      setFormError(false)
    }
  }

  const handleLocationsChange = (_locations: bookcarsTypes.Option[]) => {
    setLocations(_locations)
  }

  const handleCarRangeChange = (value: string) => {
    setRange(value)
  }

  const handleMultimediaChange = (value: bookcarsTypes.CarMultimedia[]) => {
    setMultimedia(value)
  }

  const handleRatingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRating(e.target.value)
  }

  const handleCo2Change = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCo2(e.target.value)
  }

  const handleAvailableChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAvailable(e.target.checked)
  }

  const handleFullyBookedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFullyBooked(e.target.checked)
  }

  const handleComingSoonChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setComingSoon(e.target.checked)
  }

  const handleCarTypeChange = (value: string) => {
    setType(value)
  }

  const handleGearboxChange = (value: string) => {
    setGearbox(value)
  }

  const handleAirconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAircon(e.target.checked)
  }

  const handleDepositChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDeposit(e.target.value)
  }

  const handleSeatsChange = (value: string) => {
    setSeats(value)
  }

  const handleDoorsChange = (value: string) => {
    setDoors(value)
  }

  const handleMileageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMileage(e.target.value)
  }

  const handleFuelPolicyChange = (value: string) => {
    setFuelPolicy(value)
  }

  const handleCancellationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCancellation(e.target.value)
  }

  const handleAmendmentsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAmendments(e.target.value)
  }

  const handleTheftProtectionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTheftProtection(e.target.value)
  }

  const handleCollisionDamageWaiverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCollisionDamageWaiver(e.target.value)
  }

  const handleFullinsuranceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFullInsurance(e.target.value)
  }

  const handleAdditionalDriverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAdditionalDriver(e.target.value)
  }

  const extraToNumber = (extra: string) => (extra === '' ? -1 : Number(extra))

  const getPrice = (price: string) => (price && Number(price)) || null

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    try {
      e.preventDefault()

      setLoading(true)

      const _minimumAgeValid = validateMinimumAge(minimumAge)
      if (!_minimumAgeValid) {
        setFormError(true)
        setImageError(false)
        return
      }

      if (!image) {
        setImageError(true)
        setImageSizeError(false)
        return
      }

      if (selectedLocations.length === 0) {
        helper.error(commonStrings.FORM_ERROR)
        setFormError(true)
        setLoading(false)
        return
      }

      // Check if any valid location IDs exist
      const validLocationIds = locations
        .filter(l => l._id && typeof l._id === 'string' && l._id.length === 24)
        .map(l => l._id)
        
      console.log('Selected locations:', selectedLocations)
      console.log('Locations array:', locations)
      console.log('Valid location IDs:', validLocationIds)
      
      // If using coordinates but no valid locations, use a placeholder
      const finalLocationIds = validLocationIds.length > 0 
        ? validLocationIds 
        : (selectedLocations.length > 0 ? ['000000000000000000000000'] : [])
        
      console.log('Final location IDs being used:', finalLocationIds)

      const data: bookcarsTypes.CreateCarPayload = {
        loggedUser: user!._id!,
        name,
        supplier,
        minimumAge: Number.parseInt(minimumAge, 10),
        locations: finalLocationIds, // Use the final IDs with fallback
        dailyPrice: Number(dailyPrice),
        discountedDailyPrice: getPrice(discountedDailyPrice),
        biWeeklyPrice: getPrice(biWeeklyPrice),
        discountedBiWeeklyPrice: getPrice(discountedBiWeeklyPrice),
        weeklyPrice: getPrice(weeklyPrice),
        discountedWeeklyPrice: getPrice(discountedWeeklyPrice),
        monthlyPrice: getPrice(monthlyPrice),
        discountedMonthlyPrice: getPrice(discountedMonthlyPrice),
        deposit: Number(deposit),
        available,
        fullyBooked,
        comingSoon,
        type,
        gearbox,
        aircon,
        image,
        seats: Number.parseInt(seats, 10),
        doors: Number.parseInt(doors, 10),
        fuelPolicy,
        mileage: extraToNumber(mileage),
        cancellation: extraToNumber(cancellation),
        amendments: extraToNumber(amendments),
        theftProtection: extraToNumber(theftProtection),
        collisionDamageWaiver: extraToNumber(collisionDamageWaiver),
        fullInsurance: extraToNumber(fullInsurance),
        additionalDriver: extraToNumber(additionalDriver),
        range,
        multimedia,
        rating: Number(rating) || undefined,
        co2: Number(co2) || undefined,
        isDateBasedPrice,
        dateBasedPrices,
        // Include the full location data with coordinates
        locationCoordinates: selectedLocations.map((loc) => ({
          name: loc.name,
          latitude: loc.latitude,
          longitude: loc.longitude
        }))
      }

      console.log('Submitting car creation:', data);

      const car = await CarService.create(data)

      if (car && car._id) {
        navigate('/cars')
      } else {
        helper.error()
      }
    } catch (err) {
      helper.error(err)
    } finally {
      setLoading(false)
    }
  }

  const onLoad = (user?: bookcarsTypes.User) => {
    if (user && user.verified) {
      setVisible(true)

      if (user.type === bookcarsTypes.RecordType.Supplier) {
        setSupplier(user._id as string)
        setIsSupplier(true)
      }
    }
  }

  return (
    <Layout onLoad={onLoad} strict>
      <div className="create-car">
        <Paper className="car-form car-form-wrapper" elevation={10} style={visible ? {} : { display: 'none' }}>
          <h1 className="car-form-title">
            {' '}
            {strings.NEW_CAR_HEADING}
            {' '}
          </h1>
          <form onSubmit={handleSubmit}>
            <Avatar
              type={bookcarsTypes.RecordType.Car}
              mode="create"
              record={null}
              size="large"
              readonly={false}
              onBeforeUpload={handleBeforeUpload}
              onChange={handleImageChange}
              onValidate={handleImageValidate}
              color="disabled"
              className="avatar-ctn"
            />

            <div className="info">
              <InfoIcon />
              <span>{strings.RECOMMENDED_IMAGE_SIZE}</span>
            </div>

            <FormControl fullWidth margin="dense">
                <InputLabel className="required" sx={{ left: -14 }}>{strings.NAME}</InputLabel>
              <Input type="text" required value={name} autoComplete="off" onChange={handleNameChange} />
            </FormControl>

            {!isSupplier && (
              <FormControl fullWidth margin="dense">
                <SupplierSelectList
                  label={strings.SUPPLIER}
                  required
                  variant="standard"
                  onChange={handleSupplierChange}
                />
              </FormControl>
            )}

            <FormControl fullWidth margin="dense">
              <InputLabel className="required">{strings.MINIMUM_AGE}</InputLabel>
              <Input
                type="text"
                required
                error={!minimumAgeValid}
                value={minimumAge}
                autoComplete="off"
                onChange={handleMinimumAgeChange}
                inputProps={{ inputMode: 'numeric', pattern: '^\\d{2}$' }}
              />
              <FormHelperText error={!minimumAgeValid}>{(!minimumAgeValid && strings.MINIMUM_AGE_NOT_VALID) || ''}</FormHelperText>
            </FormControl>

            <FormControl fullWidth margin="dense">
              <InputLabel className="required" sx={{ left: -14 }}>{commonStrings.PICK_UP_LOCATION}</InputLabel>
                <Input
                  type="text"
                  fullWidth
                  value={locationInput}
                  onChange={handleLocationInputChange}
                  placeholder={commonStrings.SEARCH_LOCATION}
                  inputRef={autocompleteInput}
                  required={selectedLocations.length === 0}
                  autoComplete="off"
                />
                <FormHelperText>
                  {strings.LOCATION_HELPER_TEXT}
                </FormHelperText>
            </FormControl>

            {selectedLocations.length > 0 && (
              <div className="selected-locations">
                {selectedLocations.map((loc, index) => (
                  <div key={index} className="selected-location-item">
                    <span>{loc.name}</span>
                    <Button 
                      variant="text" 
                      color="primary" 
                      size="small"
                      onClick={() => handleRemoveLocation(index)}
                    >
                      {commonStrings.DELETE}
                    </Button>
                  </div>
                ))}
              </div>
            )}
            
            {/* Map Modal */}
            <LocationMapModal
              open={locationModalOpen}
              onClose={handleLocationModalClose}
              placeName={selectedPlace?.formatted_address || ''}
              initialCoordinates={tempCoordinates}
              onConfirm={handleLocationConfirm}
              onPlaceNameUpdate={handlePlaceNameUpdate}
            />

            <FormControl fullWidth margin="dense">
              <TextField
                label={`${strings.DAILY_PRICE} (${commonStrings.CURRENCY})`}
                slotProps={{
                  htmlInput: {
                    inputMode: 'numeric',
                    pattern: '^\\d+(\\.\\d+)?$'
                  }
                }}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setDailyPrice(e.target.value)
                }}
                required
                variant="standard"
                autoComplete="off"
                value={dailyPrice}
              />
            </FormControl>

            <FormControl fullWidth margin="dense">
              <TextField
                label={`${strings.DISCOUNTED_DAILY_PRICE} (${commonStrings.CURRENCY})`}
                slotProps={{
                  htmlInput: {
                    inputMode: 'numeric',
                    pattern: '^\\d+(\\.\\d+)?$'
                  }
                }}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setDiscountedDailyPrice(e.target.value)
                }}
                variant="standard"
                autoComplete="off"
                value={discountedDailyPrice}
              />
            </FormControl>

            <FormControl fullWidth margin="dense" className="checkbox-fc">
              <FormControlLabel
                control={(
                  <Switch
                    checked={isDateBasedPrice}
                    color="primary"
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      setIsDateBasedPrice(e.target.checked)
                    }}
                  />
                )}
                label={strings.IS_DATE_BASED_PRICE}
                className="checkbox-fcl"
              />
            </FormControl>

            {
              isDateBasedPrice && (
                <DateBasedPriceEditList
                  title={strings.DATE_BASED_PRICES}
                  values={dateBasedPrices}
                  onAdd={(value) => {
                    const _dateBasedPrices = bookcarsHelper.clone(dateBasedPrices) as bookcarsTypes.DateBasedPrice[]
                    _dateBasedPrices.push(value)
                    setDateBasedPrices(_dateBasedPrices)
                  }}
                  onUpdate={(value, index) => {
                    const _dateBasedPrices = bookcarsHelper.clone(dateBasedPrices) as bookcarsTypes.DateBasedPrice[]
                    _dateBasedPrices[index] = value
                    setDateBasedPrices(_dateBasedPrices)
                  }}
                  onDelete={(_, index) => {
                    const _dateBasedPrices = bookcarsHelper.clone(dateBasedPrices) as bookcarsTypes.DateBasedPrice[]
                    _dateBasedPrices.splice(index, 1)
                    setDateBasedPrices(_dateBasedPrices)
                  }}
                />
              )
            }

            {
              !isDateBasedPrice && (
                <>
                  <FormControl fullWidth margin="dense">
                    <TextField
                      label={`${strings.BI_WEEKLY_PRICE} (${commonStrings.CURRENCY})`}
                      slotProps={{
                        htmlInput: {
                          inputMode: 'numeric',
                          pattern: '^\\d+(\\.\\d+)?$'
                        }
                      }}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        setBiWeeklyPrice(e.target.value)
                      }}
                      variant="standard"
                      autoComplete="off"
                      value={biWeeklyPrice}
                    />
                  </FormControl>

                  <FormControl fullWidth margin="dense">
                    <TextField
                      label={`${strings.DISCOUNTED_BI_WEEKLY_PRICE} (${commonStrings.CURRENCY})`}
                      slotProps={{
                        htmlInput: {
                          inputMode: 'numeric',
                          pattern: '^\\d+(\\.\\d+)?$'
                        }
                      }}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        setDiscountedBiWeeklyPrice(e.target.value)
                      }}
                      variant="standard"
                      autoComplete="off"
                      value={discountedBiWeeklyPrice}
                    />
                  </FormControl>

                  <FormControl fullWidth margin="dense">
                    <TextField
                      label={`${strings.WEEKLY_PRICE} (${commonStrings.CURRENCY})`}
                      slotProps={{
                        htmlInput: {
                          inputMode: 'numeric',
                          pattern: '^\\d+(\\.\\d+)?$'
                        }
                      }}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        setWeeklyPrice(e.target.value)
                      }}
                      variant="standard"
                      autoComplete="off"
                      value={weeklyPrice}
                    />
                  </FormControl>

                  <FormControl fullWidth margin="dense">
                    <TextField
                      label={`${strings.DISCOUNTED_WEEKLY_PRICE} (${commonStrings.CURRENCY})`}
                      slotProps={{
                        htmlInput: {
                          inputMode: 'numeric',
                          pattern: '^\\d+(\\.\\d+)?$'
                        }
                      }}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        setDiscountedWeeklyPrice(e.target.value)
                      }}
                      variant="standard"
                      autoComplete="off"
                      value={discountedWeeklyPrice}
                    />
                  </FormControl>

                  <FormControl fullWidth margin="dense">
                    <TextField
                      label={`${strings.MONTHLY_PRICE} (${commonStrings.CURRENCY})`}
                      slotProps={{
                        htmlInput: {
                          inputMode: 'numeric',
                          pattern: '^\\d+(\\.\\d+)?$'
                        }
                      }}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        setMonthlyPrice(e.target.value)
                      }}
                      variant="standard"
                      autoComplete="off"
                      value={monthlyPrice}
                    />
                  </FormControl>

                  <FormControl fullWidth margin="dense">
                    <TextField
                      label={`${strings.DISCOUNTED_MONThLY_PRICE} (${commonStrings.CURRENCY})`}
                      slotProps={{
                        htmlInput: {
                          inputMode: 'numeric',
                          pattern: '^\\d+(\\.\\d+)?$'
                        }
                      }}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        setDiscountedMonthlyPrice(e.target.value)
                      }}
                      variant="standard"
                      autoComplete="off"
                      value={discountedMonthlyPrice}
                    />
                  </FormControl>
                </>
              )
            }

            <FormControl fullWidth margin="dense">
              <TextField
                label={`${csStrings.DEPOSIT} (${commonStrings.CURRENCY})`}
                slotProps={{
                  htmlInput: {
                    inputMode: 'numeric',
                    pattern: '^\\d+(\\.\\d+)?$'
                  }
                }}
                onChange={handleDepositChange}
                required
                variant="standard"
                autoComplete="off"
                value={deposit}
              />
            </FormControl>

            <FormControl fullWidth margin="dense">
              <CarRangeList label={strings.CAR_RANGE} variant="standard" required value={range} onChange={handleCarRangeChange} />
            </FormControl>

            <FormControl fullWidth margin="dense">
              <MultimediaList label={strings.MULTIMEDIA} value={multimedia} onChange={handleMultimediaChange} />
            </FormControl>

            <FormControl fullWidth margin="dense">
              <TextField
                label={strings.RATING}
                slotProps={{
                  htmlInput: {
                    type: 'number',
                    min: 1,
                    max: 5,
                    step: 0.01,
                  }
                }}
                onChange={handleRatingChange}
                variant="standard"
                autoComplete="off"
                value={rating}
              />
            </FormControl>

            <FormControl fullWidth margin="dense">
              <TextField
                label={strings.CO2}
                slotProps={{ htmlInput: { inputMode: 'numeric', pattern: '^\\d+(\\.\\d+)?$' } }}
                onChange={handleCo2Change}
                variant="standard"
                autoComplete="off"
                value={co2}
              />
            </FormControl>

            <FormControl fullWidth margin="dense" className="checkbox-fc">
              <FormControlLabel control={<Switch checked={available} onChange={handleAvailableChange} color="primary" />} label={strings.AVAILABLE} className="checkbox-fcl" />
            </FormControl>

            <FormControl fullWidth margin="dense" className="checkbox-fc">
              <FormControlLabel
                control={(
                  <Switch
                    checked={fullyBooked}
                    color="primary"
                    onChange={handleFullyBookedChange}
                  />
                )}
                label={strings.FULLY_BOOKED}
                className="checkbox-fcl"
              />
            </FormControl>

            <FormControl fullWidth margin="dense" className="checkbox-fc">
              <FormControlLabel
                control={(
                  <Switch
                    checked={comingSoon}
                    color="primary"
                    onChange={handleComingSoonChange}
                  />
                )}
                label={strings.COMING_SOON}
                className="checkbox-fcl"
              />
            </FormControl>

            <FormControl fullWidth margin="dense">
              <CarTypeList label={strings.CAR_TYPE} variant="standard" required onChange={handleCarTypeChange} />
            </FormControl>

            <FormControl fullWidth margin="dense">
              <GearboxList label={strings.GEARBOX} variant="standard" required onChange={handleGearboxChange} />
            </FormControl>

            <FormControl fullWidth margin="dense">
              <SeatsList label={strings.SEATS} variant="standard" required onChange={handleSeatsChange} />
            </FormControl>

            <FormControl fullWidth margin="dense">
              <DoorsList label={strings.DOORS} variant="standard" required onChange={handleDoorsChange} />
            </FormControl>

            <FormControl fullWidth margin="dense">
              <FuelPolicyList label={csStrings.FUEL_POLICY} variant="standard" required onChange={handleFuelPolicyChange} />
            </FormControl>

            <div className="info">
              <InfoIcon />
              <span>{commonStrings.OPTIONAL}</span>
            </div>

            <FormControl fullWidth margin="dense" className="checkbox-fc">
              <FormControlLabel control={<Switch checked={aircon} onChange={handleAirconChange} color="primary" />} label={strings.AIRCON} className="checkbox-fcl" />
            </FormControl>

            <FormControl fullWidth margin="dense">
              <TextField
                label={`${csStrings.MILEAGE} (${csStrings.MILEAGE_UNIT})`}
                slotProps={{ htmlInput: { inputMode: 'numeric', pattern: '^\\d+(\\.\\d+)?$' } }}
                onChange={handleMileageChange}
                variant="standard"
                autoComplete="off"
                value={mileage}
              />
            </FormControl>

            <FormControl fullWidth margin="dense">
              <TextField
                label={`${csStrings.CANCELLATION} (${commonStrings.CURRENCY})`}
                slotProps={{ htmlInput: { inputMode: 'numeric', pattern: '^\\d+(\\.\\d+)?$' } }}
                onChange={handleCancellationChange}
                variant="standard"
                autoComplete="off"
                value={cancellation}
              />
            </FormControl>

            <FormControl fullWidth margin="dense">
              <TextField
                label={`${csStrings.AMENDMENTS} (${commonStrings.CURRENCY})`}
                slotProps={{ htmlInput: { inputMode: 'numeric', pattern: '^\\d+(\\.\\d+)?$' } }}
                onChange={handleAmendmentsChange}
                variant="standard"
                autoComplete="off"
                value={amendments}
              />
            </FormControl>

            <FormControl fullWidth margin="dense">
              <TextField
                label={`${csStrings.THEFT_PROTECTION} (${csStrings.CAR_CURRENCY})`}
                slotProps={{ htmlInput: { inputMode: 'numeric', pattern: '^\\d+(\\.\\d+)?$' } }}
                onChange={handleTheftProtectionChange}
                variant="standard"
                autoComplete="off"
                value={theftProtection}
              />
            </FormControl>

            <FormControl fullWidth margin="dense">
              <TextField
                label={`${csStrings.COLLISION_DAMAGE_WAVER} (${csStrings.CAR_CURRENCY})`}
                slotProps={{ htmlInput: { inputMode: 'numeric', pattern: '^\\d+(\\.\\d+)?$' } }}
                onChange={handleCollisionDamageWaiverChange}
                variant="standard"
                autoComplete="off"
                value={collisionDamageWaiver}
              />
            </FormControl>

            <FormControl fullWidth margin="dense">
              <TextField
                label={`${csStrings.FULL_INSURANCE} (${csStrings.CAR_CURRENCY})`}
                slotProps={{ htmlInput: { inputMode: 'numeric', pattern: '^\\d+(\\.\\d+)?$' } }}
                onChange={handleFullinsuranceChange}
                variant="standard"
                autoComplete="off"
                value={fullInsurance}
              />
            </FormControl>

            <FormControl fullWidth margin="dense">
              <TextField
                label={`${csStrings.ADDITIONAL_DRIVER} (${csStrings.CAR_CURRENCY})`}
                slotProps={{ htmlInput: { inputMode: 'numeric', pattern: '^\\d+(\\.\\d+)?$' } }}
                onChange={handleAdditionalDriverChange}
                variant="standard"
                autoComplete="off"
                value={additionalDriver}
              />
            </FormControl>

            <div className="buttons">
              <Button type="submit" variant="contained" className="btn-primary btn-margin-bottom" size="small" disabled={loading}>
                {commonStrings.CREATE}
              </Button>
              <Button
                variant="contained"
                className="btn-secondary btn-margin-bottom"
                size="small"
                onClick={async () => {
                  if (image) {
                    await CarService.deleteTempImage(image)
                  }
                  navigate('/cars')
                }}
              >
                {commonStrings.CANCEL}
              </Button>
            </div>

            <div className="form-error">
              {imageError && <Error message={commonStrings.IMAGE_REQUIRED} />}
              {imageSizeError && <Error message={strings.CAR_IMAGE_SIZE_ERROR} />}
              {formError && <Error message={commonStrings.FORM_ERROR} />}
            </div>
          </form>
        </Paper>
      </div>
      {loading && <Backdrop text={commonStrings.PLEASE_WAIT} />}
    </Layout>
  )
}

export default CreateCar
