import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FormControl,
  Button,
  FormControlLabel,
  Checkbox,
  FormHelperText,
  IconButton,
  Input,
  InputLabel,
} from '@mui/material'
import { DateTimeValidationError } from '@mui/x-date-pickers'
import { addHours } from 'date-fns'
import EditLocationIcon from '@mui/icons-material/EditLocation'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import env from '@/config/env.config'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/search-form'
import * as UserService from '@/services/UserService'
import * as LocationService from '@/services/LocationService'
import DateTimePicker from '@/components/DateTimePicker'
import LocationMapModal from '@/components/LocationMapModal'
import { nanoid } from 'nanoid'

import '@/assets/css/search-form.css'

interface SearchFormProps {
  pickupLocation?: string
  dropOffLocation?: string
  ranges?: bookcarsTypes.CarRange[]
  onCancel?: () => void
}

// Interface for location coordinates
interface LocationCoordinates {
  latitude: number
  longitude: number
  address: string
  placeId: string
}

const SearchForm = ({
  pickupLocation: __pickupLocation,
  dropOffLocation: __dropOffLocation,
  ranges: __ranges,
  onCancel,
}: SearchFormProps) => {
  const navigate = useNavigate()

  let _minDate = new Date()
  _minDate = addHours(_minDate, env.MIN_PICK_UP_HOURS)

  const [pickupLocation, setPickupLocation] = useState('')
  // New state for pickup coordinates
  const [pickupCoordinates, setPickupCoordinates] = useState<LocationCoordinates | null>(null)
  const [dropOffLocation, setDropOffLocation] = useState('')
  // New state for dropoff coordinates
  const [dropOffCoordinates, setDropOffCoordinates] = useState<LocationCoordinates | null>(null)
  const [minDate, setMinDate] = useState(_minDate)
  const [from, setFrom] = useState<Date>()
  const [to, setTo] = useState<Date>()
  const [sameLocation, setSameLocation] = useState(true)
  const [fromError, setFromError] = useState(false)
  const [toError, setToError] = useState(false)
  const [ranges, setRanges] = useState<bookcarsTypes.CarRange[]>(bookcarsHelper.getAllRanges())
  const [minPickupHoursError, setMinPickupHoursError] = useState(false)
  const [minRentalHoursError, setMinRentalHoursError] = useState(false)
  // Error states for location validation
  const [pickupLocationError, setPickupLocationError] = useState(false)
  const [dropOffLocationError, setDropOffLocationError] = useState(false)

  // Location modal state
  const [locationModalOpen, setLocationModalOpen] = useState(false)
  const [selectedPlace, setSelectedPlace] = useState<{ formatted_address?: string, geometry?: { location?: { lat: () => number, lng: () => number } } } | null>(null)
  const [tempCoordinates, setTempCoordinates] = useState<{ lat: number, lng: number }>({ lat: 13.6929, lng: -89.2182 }) // Default coordinates
  const [locationToRefine, setLocationToRefine] = useState<'pickup' | 'dropoff'>('pickup')
  const [pickupInputValue, setPickupInputValue] = useState('')
  const [dropOffInputValue, setDropOffInputValue] = useState('')

  // Refs for Google Places Autocomplete
  const pickupInputRef = useRef<HTMLInputElement>(null)
  const dropOffInputRef = useRef<HTMLInputElement>(null)
  
  // State to track if Google Maps script is loaded
  const [scriptLoaded, setScriptLoaded] = useState(false)
  const apiKey = import.meta.env.VITE_BC_GOOGLE_MAPS_API_KEY

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
        } else {
          console.error('Selected place has no geometry or formatted address')
          if (type === 'pickup') {
            setPickupLocationError(true)
          } else {
            setDropOffLocationError(true)
          }
        }
      })
      
    } catch (error) {
      console.error('Error initializing autocomplete:', error)
    }
  }

  useEffect(() => {
    const _from = new Date()
    if (env.MIN_PICK_UP_HOURS < 72) {
      _from.setDate(_from.getDate() + 3)
    } else {
      _from.setDate(_from.getDate() + Math.ceil(env.MIN_PICK_UP_HOURS / 24) + 1)
    }
    _from.setHours(10)
    _from.setMinutes(0)
    _from.setSeconds(0)
    _from.setMilliseconds(0)

    const _to = new Date(_from)
    if (env.MIN_RENTAL_HOURS < 72) {
      _to.setDate(_to.getDate() + 3)
    } else {
      _to.setDate(_to.getDate() + Math.ceil(env.MIN_RENTAL_HOURS / 24) + 1)
    }

    let __minDate = new Date()
    __minDate = addHours(__minDate, env.MIN_RENTAL_HOURS)

    setMinDate(__minDate)
    setFrom(_from)
    setTo(_to)
  }, [])

  useEffect(() => {
    const init = async () => {
      if (__pickupLocation) {
        const location = await LocationService.getLocation(__pickupLocation)
        setPickupLocation(__pickupLocation)
        
        // Set coordinates based on location data if available
        if (location?.coordinates) {
          const coords = {
            latitude: location.coordinates.latitude,
            longitude: location.coordinates.longitude,
            address: location.name || '',
            placeId: __pickupLocation
          }
          setPickupCoordinates(coords)
          setPickupInputValue(location.name || '')
        }
        
        if (sameLocation) {
          setDropOffLocation(__pickupLocation)
          // Copy coordinates for drop-off as well
          if (location?.coordinates) {
            const coords = {
              latitude: location.coordinates.latitude,
              longitude: location.coordinates.longitude,
              address: location.name || '',
              placeId: __pickupLocation
            }
            setDropOffCoordinates(coords)
            setDropOffInputValue(location.name || '')
          }
        } else {
          setSameLocation(dropOffLocation === __pickupLocation)
        }
      }
    }
    init()
  }, [__pickupLocation]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const init = async () => {
      if (__dropOffLocation) {
        const location = await LocationService.getLocation(__dropOffLocation)
        setDropOffLocation(__dropOffLocation)
        
        // Set coordinates based on location data if available
        if (location?.coordinates) {
          const coords = {
            latitude: location.coordinates.latitude,
            longitude: location.coordinates.longitude,
            address: location.name || '',
            placeId: __dropOffLocation
          }
          setDropOffCoordinates(coords)
          setDropOffInputValue(location.name || '')
        }
        
        setSameLocation(pickupLocation === __dropOffLocation)
      }
    }
    init()
  }, [__dropOffLocation]) // eslint-disable-line react-hooks/exhaustive-deps

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

  useEffect(() => {
    setRanges(__ranges || bookcarsHelper.getAllRanges())
  }, [__ranges])

  const handlePickupInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPickupInputValue(e.target.value)
    if (e.target.value === '') {
      setPickupLocation('')
      setPickupCoordinates(null)
      setPickupLocationError(true)
    } else {
      setPickupLocationError(false)
    }
  }

  const handleDropOffInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDropOffInputValue(e.target.value)
    if (e.target.value === '') {
      setDropOffLocation('')
      setDropOffCoordinates(null)
      setDropOffLocationError(true)
    } else {
      setDropOffLocationError(false)
    }
  }

  const handleSameLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSameLocation(e.target.checked)

    if (e.target.checked) {
      setDropOffLocation(pickupLocation)
      setDropOffCoordinates(pickupCoordinates)
      setDropOffInputValue(pickupInputValue)
    } else {
      setDropOffLocation('')
      setDropOffCoordinates(null)
      setDropOffInputValue('')
    }
  }
  
  // Handler for confirming exact location from the map modal
  const handleLocationConfirm = (coordinates: { lat: number, lng: number }) => {
    if (selectedPlace && selectedPlace.formatted_address) {
      // Use the most up-to-date place name from the modal
      const locationName = currentPlaceName || selectedPlace.formatted_address
      
      // Create new location data
      const locationData = {
        latitude: coordinates.lat,
        longitude: coordinates.lng,
        address: locationName,
        placeId: `place_${Date.now()}` // Generate a unique ID
      }
      
      if (locationToRefine === 'pickup') {
        setPickupCoordinates(locationData)
        setPickupLocation(locationData.placeId)
        setPickupInputValue(locationData.address)
        setPickupLocationError(false)
        
        // If same location is checked, update dropoff too
        if (sameLocation) {
          setDropOffCoordinates(locationData)
          setDropOffLocation(locationData.placeId)
          setDropOffInputValue(locationData.address)
          setDropOffLocationError(false)
        }
      } else {
        setDropOffCoordinates(locationData)
        setDropOffLocation(locationData.placeId)
        setDropOffInputValue(locationData.address)
        setDropOffLocationError(false)
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
  const [currentPlaceName, setCurrentPlaceName] = useState('')
  
  const handlePlaceNameUpdate = (name: string) => {
    setCurrentPlaceName(name)
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    const pickupLocationValid = !!pickupCoordinates
    const dropOffLocationValid = sameLocation || !!dropOffCoordinates
    
    // Update error states
    setPickupLocationError(!pickupLocationValid)
    setDropOffLocationError(!dropOffLocationValid && !sameLocation)

    // Log validation issues for debugging
    console.log('Form validation:', {
      pickupLocationValid,
      dropOffLocationValid,
      hasFrom: !!from,
      hasTo: !!to,
      fromError,
      toError,
      minPickupHoursError,
      minRentalHoursError,
      pickupCoordinates
    })

    if (!pickupLocationValid || !dropOffLocationValid || !from || !to || fromError || toError || minPickupHoursError || minRentalHoursError) {
      console.log('Form validation failed, not submitting')
      return
    }

    console.log('Form submitting with data:', {
      pickupLocation,
      dropOffLocation,
      pickupCoordinates,
      dropOffCoordinates,
      from,
      to
    })

    setTimeout(navigate, 0, '/search', {
      state: {
        pickupLocationId: pickupLocation || `place_${pickupCoordinates?.placeId || nanoid(8)}`,
        dropOffLocationId: dropOffLocation || (sameLocation 
          ? (pickupLocation || `place_${pickupCoordinates?.placeId || nanoid(8)}`) 
          : `place_${dropOffCoordinates ? dropOffCoordinates.placeId || nanoid(8) : nanoid(8)}`),
        from,
        to,
        pickupCoordinates,
        dropOffCoordinates: sameLocation ? pickupCoordinates : dropOffCoordinates,
        radius: 25 // Default radius of 25km
      },
    })
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="home-search-form">
        <FormControl className="pickup-location" error={pickupLocationError}>
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
                error={pickupLocationError}
              />
              {pickupLocationError && (
                <FormHelperText error>{commonStrings.REQUIRED}</FormHelperText>
              )}
            </div>
            <IconButton 
              color="primary" 
              onClick={() => {
                if (pickupCoordinates) {
                  setLocationToRefine('pickup')
                  setTempCoordinates({ 
                    lat: pickupCoordinates.latitude, 
                    lng: pickupCoordinates.longitude 
                  })
                  setLocationModalOpen(true)
                }
              }}
              disabled={!pickupCoordinates}
              sx={{ mt: 1.5, ml: 1 }}
            >
              <EditLocationIcon />
            </IconButton>
          </div>
        </FormControl>
        <FormControl className="from">
          <DateTimePicker
            label={strings.PICK_UP_DATE}
            value={from}
            minDate={_minDate}
            variant="outlined"
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
        <FormControl className="to">
          <DateTimePicker
            label={strings.DROP_OFF_DATE}
            value={to}
            minDate={minDate}
            variant="outlined"
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
        <Button type="submit" variant="contained" className="btn-search">
          {commonStrings.SEARCH}
        </Button>
        {onCancel && (
          <Button
            variant="outlined"
            color="inherit"
            className="btn-cancel"
            onClick={() => {
              onCancel()
            }}
          >
            {commonStrings.CANCEL}
          </Button>
        )}
        {!sameLocation && (
          <FormControl className="drop-off-location" error={dropOffLocationError}>
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
                  error={dropOffLocationError}
                />
                {dropOffLocationError && (
                  <FormHelperText error>{commonStrings.REQUIRED}</FormHelperText>
                )}
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
        <FormControl className="chk-same-location">
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
    </>
  )
}

export default SearchForm

