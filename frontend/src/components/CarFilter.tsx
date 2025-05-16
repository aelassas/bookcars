import React, { useState, useEffect, useRef } from 'react'
import {
  FormControl,
  Button,
  FormControlLabel,
  Checkbox,
  FormHelperText,
  Input,
  InputLabel,
  IconButton,
} from '@mui/material'
import { DateTimeValidationError } from '@mui/x-date-pickers'
import { addHours } from 'date-fns'
import EditLocationIcon from '@mui/icons-material/EditLocation'
import * as bookcarsTypes from ':bookcars-types'
import env from '@/config/env.config'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/search-form'
import * as UserService from '@/services/UserService'
import DateTimePicker from './DateTimePicker'
import Accordion from './Accordion'
import LocationMapModal from '@/components/LocationMapModal'
import { nanoid } from 'nanoid'

import '@/assets/css/car-filter.css'

// Interface for location coordinates
interface LocationCoordinates {
  latitude: number
  longitude: number
  address: string
  placeId: string
}

interface CarFilterProps {
  from: Date
  to: Date
  pickupLocation: bookcarsTypes.Location
  dropOffLocation: bookcarsTypes.Location
  className?: string
  collapse?: boolean
  onSubmit: bookcarsTypes.CarFilterSubmitEvent
}

const OFFSET_HEIGHT = 100

const CarFilter = ({
  from: filterFrom,
  to: filterTo,
  pickupLocation: filterPickupLocation,
  dropOffLocation: filterDropOffLocation,
  className,
  collapse,
  onSubmit
}: CarFilterProps) => {
  let _minDate = new Date()
  _minDate = addHours(_minDate, env.MIN_PICK_UP_HOURS)

  const [from, setFrom] = useState<Date | undefined>(filterFrom)
  const [to, setTo] = useState<Date | undefined>(filterTo)
  const [minDate, setMinDate] = useState<Date>()
  const [pickupLocation, setPickupLocation] = useState<bookcarsTypes.Location | null | undefined>(filterPickupLocation)
  const [dropOffLocation, setDropOffLocation] = useState<bookcarsTypes.Location | null | undefined>(filterDropOffLocation)
  const [sameLocation, setSameLocation] = useState(filterPickupLocation === filterDropOffLocation)
  const [fromError, setFromError] = useState(false)
  const [toError, setToError] = useState(false)
  const [offsetHeight, setOffsetHeight] = useState(OFFSET_HEIGHT)
  const [minPickupHoursError, setMinPickupHoursError] = useState(false)
  const [minRentalHoursError, setMinRentalHoursError] = useState(false)
  
  // New state for pickup and dropoff coordinates
  const [pickupCoordinates, setPickupCoordinates] = useState<LocationCoordinates | null>(null)
  const [dropOffCoordinates, setDropOffCoordinates] = useState<LocationCoordinates | null>(null)
  
  // State for input values
  const [pickupInputValue, setPickupInputValue] = useState('')
  const [dropOffInputValue, setDropOffInputValue] = useState('')
  
  // Location modal state
  const [locationModalOpen, setLocationModalOpen] = useState(false)
  const [selectedPlace, setSelectedPlace] = useState<google.maps.places.PlaceResult | null>(null)
  const [tempCoordinates, setTempCoordinates] = useState<{ lat: number, lng: number }>({ lat: 13.6929, lng: -89.2182 }) // Default coordinates
  const [locationToRefine, setLocationToRefine] = useState<'pickup' | 'dropoff'>('pickup')
  
  // Refs for Google Places Autocomplete
  const pickupInputRef = useRef<HTMLInputElement>(null)
  const dropOffInputRef = useRef<HTMLInputElement>(null)
  
  // State to track if Google Maps script is loaded
  const [scriptLoaded, setScriptLoaded] = useState(false)
  const apiKey = import.meta.env.VITE_BC_GOOGLE_MAPS_API_KEY
  
  // State to store the current place name from modal
  const [currentPlaceName, setCurrentPlaceName] = useState('')

  // Create a default value to prevent API errors when filter is undefined but a string is required
  const DRAG_MARKER_INSTRUCTIONS = "Drag the marker to the exact location"
  const REFINE_LOCATION = "Refine Location"
  
  // Add these to strings object if they don't exist
  if (typeof strings.DRAG_MARKER_INSTRUCTIONS === 'undefined') {
    // @ts-ignore
    strings.DRAG_MARKER_INSTRUCTIONS = DRAG_MARKER_INSTRUCTIONS
  }
  
  if (typeof strings.REFINE_LOCATION === 'undefined') {
    // @ts-ignore
    strings.REFINE_LOCATION = REFINE_LOCATION
  }
  
  // Add these to commonStrings if needed
  if (typeof commonStrings.REFINE_LOCATION === 'undefined') {
    // @ts-ignore
    commonStrings.REFINE_LOCATION = REFINE_LOCATION
  }
  
  if (typeof commonStrings.DRAG_MARKER_INSTRUCTIONS === 'undefined') {
    // @ts-ignore
    commonStrings.DRAG_MARKER_INSTRUCTIONS = DRAG_MARKER_INSTRUCTIONS
  }
  
  if (typeof commonStrings.SEARCH_LOCATION === 'undefined') {
    // @ts-ignore
    commonStrings.SEARCH_LOCATION = "Search for a location"
  }

  // Load Google Maps script
  useEffect(() => {
    if (!scriptLoaded && !window.google) {
      const script = document.createElement('script')
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
      script.async = true
      script.defer = true
      script.onload = () => {
        setScriptLoaded(true)
      }
      document.head.appendChild(script)
      
      return () => {
        if (script.parentNode) {
          script.parentNode.removeChild(script)
        }
      }
    } else if (window.google) {
      setScriptLoaded(true)
    }
  }, [apiKey])

  // Initialize Google Places autocomplete for pickup input
  useEffect(() => {
    if (scriptLoaded && pickupInputRef.current) {
      initializeAutocomplete(pickupInputRef.current, 'pickup')
    }
  }, [scriptLoaded, pickupInputRef.current])

  // Initialize Google Places autocomplete for dropoff input
  useEffect(() => {
    if (scriptLoaded && dropOffInputRef.current && !sameLocation) {
      initializeAutocomplete(dropOffInputRef.current, 'dropoff')
    }
  }, [scriptLoaded, dropOffInputRef.current, sameLocation])

  // Initialize Google Places Autocomplete
  const initializeAutocomplete = (inputElement: HTMLInputElement, type: 'pickup' | 'dropoff') => {
    if (!window.google || !window.google.maps || !window.google.maps.places) {
      console.error('Google Maps Places API not available')
      return
    }

    try {
      // Destroy existing autocomplete if any
      const existingAutocomplete = inputElement.getAttribute('data-autocomplete-initialized')
      if (existingAutocomplete === 'true') {
        console.log('Refreshing autocomplete instance')
      }
      
      // Create new autocomplete instance
      const autocomplete = new google.maps.places.Autocomplete(inputElement, {
        types: ['geocode', 'establishment'],
        fields: ['address_components', 'formatted_address', 'geometry', 'name', 'place_id'],
        componentRestrictions: { country: 'sv' } // 'sv' is the country code for El Salvador
      })
      
      // Mark the input as initialized
      inputElement.setAttribute('data-autocomplete-initialized', 'true')
      
      // Prevent form submission on enter key
      inputElement.addEventListener('keydown', (e) => {
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
          setLocationToRefine(type)
          
          // Open the map modal for coordinate confirmation
          setLocationModalOpen(true)
        }
      })
    } catch (error) {
      console.error('Error initializing autocomplete:', error)
    }
  }

  useEffect(() => {
    if (filterFrom) {
      let __minDate = new Date(filterFrom)
      __minDate = addHours(__minDate, env.MIN_RENTAL_HOURS)
      setMinDate(__minDate)
    }
  }, [filterFrom])

  useEffect(() => {
    if (from) {
      let __minDate = new Date(from)
      __minDate = addHours(__minDate, env.MIN_RENTAL_HOURS)
      setMinDate(__minDate)

      if (from.getTime() - Date.now() < env.MIN_PICK_UP_HOURS * 60 * 60 * 1000) {
        setMinPickupHoursError(true)
      } else {
        setMinPickupHoursError(false)
      }
    }

    if (from && to) {
      if (from.getTime() > to.getTime()) {
        const _to = new Date(from)
        if (env.MIN_RENTAL_HOURS < 24) {
          _to.setDate(_to.getDate() + 1)
        } else {
          _to.setDate(_to.getDate() + Math.ceil(env.MIN_RENTAL_HOURS / 24) + 1)
        }
        setTo(_to)
      } else if (to.getTime() - from.getTime() < env.MIN_RENTAL_HOURS * 60 * 60 * 1000) {
        setMinRentalHoursError(true)
      } else {
        setMinRentalHoursError(false)
      }
    }
  }, [from, to])

  // Initialize with passed props
  useEffect(() => {
    setPickupLocation(filterPickupLocation)
    if (filterPickupLocation) {
      setPickupInputValue(filterPickupLocation.name || '')
      
      // Set coordinates if available
      if (filterPickupLocation.coordinates) {
        setPickupCoordinates({
          latitude: filterPickupLocation.coordinates.latitude,
          longitude: filterPickupLocation.coordinates.longitude,
          address: filterPickupLocation.name || '',
          placeId: filterPickupLocation._id
        })
      }
    }
  }, [filterPickupLocation])

  useEffect(() => {
    setDropOffLocation(filterDropOffLocation)
    if (filterDropOffLocation) {
      setDropOffInputValue(filterDropOffLocation.name || '')
      
      // Set coordinates if available
      if (filterDropOffLocation.coordinates) {
        setDropOffCoordinates({
          latitude: filterDropOffLocation.coordinates.latitude,
          longitude: filterDropOffLocation.coordinates.longitude,
          address: filterDropOffLocation.name || '',
          placeId: filterDropOffLocation._id
        })
      }
    }
  }, [filterDropOffLocation])

  useEffect(() => {
    const pickupId = pickupLocation?._id
    const dropOffId = dropOffLocation?._id
    const areSameLocation = pickupId === dropOffId && pickupId !== undefined
    setSameLocation(areSameLocation)
  }, [pickupLocation, dropOffLocation])

  useEffect(() => {
    if (sameLocation) {
      setOffsetHeight(OFFSET_HEIGHT)
    } else {
      setOffsetHeight((prev) => prev + 56)
    }
  }, [sameLocation])

  const handlePickupInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPickupInputValue(e.target.value)
  }

  const handleDropOffInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDropOffInputValue(e.target.value)
  }

  const handleSameLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSameLocation(e.target.checked)

    if (e.target.checked) {
      setDropOffLocation(pickupLocation)
      setDropOffCoordinates(pickupCoordinates)
      setDropOffInputValue(pickupInputValue)
    }
  }

  // Handler for confirming exact location from the map modal
  const handleLocationConfirm = (coordinates: { lat: number, lng: number }) => {
    if (selectedPlace?.formatted_address || currentPlaceName) {
      // Use the most up-to-date place name from the modal
      const locationName = currentPlaceName || selectedPlace?.formatted_address || ''
      
      // Create new location data
      const locationData: LocationCoordinates = {
        latitude: coordinates.lat,
        longitude: coordinates.lng,
        address: locationName,
        placeId: `place_${Date.now()}` // Generate a unique ID
      }
      
      // Create location object for the form
      const locationObject: bookcarsTypes.Location = {
        _id: locationData.placeId,
        name: locationData.address,
        coordinates: {
          latitude: locationData.latitude,
          longitude: locationData.longitude
        }
      }
      
      if (locationToRefine === 'pickup') {
        setPickupCoordinates(locationData)
        setPickupLocation(locationObject)
        setPickupInputValue(locationData.address)
        
        // If same location is checked, update dropoff too
        if (sameLocation) {
          setDropOffCoordinates(locationData)
          setDropOffLocation(locationObject)
          setDropOffInputValue(locationData.address)
        }
      } else {
        setDropOffCoordinates(locationData)
        setDropOffLocation(locationObject)
        setDropOffInputValue(locationData.address)
      }
      
      // Clear selected place
      setSelectedPlace(null)
    }
  }
  
  // Handler for closing the location modal
  const handleLocationModalClose = () => {
    setLocationModalOpen(false)
  }

  // Handler for receiving the updated place name from the modal
  const handlePlaceNameUpdate = (name: string) => {
    setCurrentPlaceName(name)
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!pickupLocation || !dropOffLocation || !from || !to || fromError || toError || minPickupHoursError || minRentalHoursError) {
      return
    }

    if (onSubmit) {
      const filter: bookcarsTypes.CarFilter = {
        pickupLocation, 
        dropOffLocation, 
        from, 
        to
      }

      // Add coordinates to the filter object
      if (pickupCoordinates) {
        // @ts-ignore - adding custom properties to filter object
        filter.pickupCoordinates = pickupCoordinates
      }
      if (dropOffCoordinates) {
        // @ts-ignore - adding custom properties to filter object
        filter.dropOffCoordinates = dropOffCoordinates
      }
      
      onSubmit(filter)
    }
  }

  return (
    <Accordion
      title={commonStrings.LOCATION_TERM}
      collapse={collapse}
      offsetHeight={offsetHeight}
      className={`${className ? `${className} ` : ''}car-filter`}
    >
      <form onSubmit={handleSubmit}>
        <FormControl fullWidth className="pickup-location">
          <div style={{ display: 'flex', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <InputLabel className="required" sx={{ left: -14 }}>{commonStrings.PICK_UP_LOCATION}</InputLabel>
              <Input
                type="text"
                fullWidth
                value={pickupInputValue}
                onChange={handlePickupInputChange}
                placeholder={commonStrings.SEARCH_LOCATION}
                inputRef={pickupInputRef}
                required
                autoComplete="off"
              />
            </div>
          </div>
        </FormControl>
        {!sameLocation && (
          <FormControl fullWidth className="drop-off-location">
            <div style={{ display: 'flex', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <InputLabel className="required" sx={{ left: -14 }}>{commonStrings.DROP_OFF_LOCATION}</InputLabel>
                <Input
                  type="text"
                  fullWidth
                  value={dropOffInputValue}
                  onChange={handleDropOffInputChange}
                  placeholder={commonStrings.SEARCH_LOCATION}
                  inputRef={dropOffInputRef}
                  required
                  autoComplete="off"
                />
              </div>
              <IconButton 
                color="primary" 
                onClick={() => {
                  if (dropOffCoordinates) {
                    setLocationToRefine('dropoff')
                    setTempCoordinates({ 
                      lat: dropOffCoordinates.latitude, 
                      lng: dropOffCoordinates.longitude 
                    })
                    setLocationModalOpen(true)
                  }
                }}
                disabled={!dropOffCoordinates}
                sx={{ mt: 1.5, ml: 1 }}
              >
                <EditLocationIcon />
              </IconButton>
            </div>
          </FormControl>
        )}
        <FormControl fullWidth className="from">
          <DateTimePicker
            label={strings.PICK_UP_DATE}
            value={from}
            minDate={_minDate}
            variant="standard"
            required
            onChange={(date) => {
              if (date) {
                setFrom(date)
                setFromError(false)
              } else {
                setFrom(undefined)
                setMinDate(_minDate)
              }
            }}
            onError={(err: DateTimeValidationError) => {
              if (err) {
                setFromError(true)
              } else {
                setFromError(false)
              }
            }}
            language={UserService.getLanguage()}
          />
          <FormHelperText error={minPickupHoursError}>{(minPickupHoursError && strings.MIN_PICK_UP_HOURS_ERROR) || ''}</FormHelperText>
        </FormControl>
        <FormControl fullWidth className="to">
          <DateTimePicker
            label={strings.DROP_OFF_DATE}
            value={to}
            minDate={minDate}
            variant="standard"
            required
            onChange={(date) => {
              if (date) {
                setTo(date)
                setToError(false)
              } else {
                setTo(undefined)
              }
            }}
            onError={(err: DateTimeValidationError) => {
              if (err) {
                setToError(true)
              } else {
                setToError(false)
              }
            }}
            language={UserService.getLanguage()}
          />
          <FormHelperText error={minRentalHoursError}>{(minRentalHoursError && strings.MIN_RENTAL_HOURS_ERROR) || ''}</FormHelperText>
        </FormControl>
        <FormControl fullWidth className="fc-search">
          <Button type="submit" variant="contained" className="btn-primary btn-search">
            {commonStrings.SEARCH}
          </Button>
        </FormControl>
        <FormControl fullWidth className="chk-same-location">
          <FormControlLabel control={<Checkbox checked={sameLocation} onChange={handleSameLocationChange} />} label={strings.DROP_OFF} />
        </FormControl>
      </form>
      
      {/* Map Modal for location refinement */}
      <LocationMapModal
        open={locationModalOpen}
        onClose={handleLocationModalClose}
        placeName={selectedPlace?.formatted_address || currentPlaceName || ''}
        initialCoordinates={tempCoordinates}
        onConfirm={handleLocationConfirm}
        onPlaceNameUpdate={handlePlaceNameUpdate}
      />
    </Accordion>
  )
}

export default CarFilter
