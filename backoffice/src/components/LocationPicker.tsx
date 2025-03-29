import React, { useEffect, useRef, useState } from 'react'
import { FormControl, InputLabel, Input } from '@mui/material'
import { strings as commonStrings } from '@/lang/common'

import '@/assets/css/location-picker.css'

interface Location {
  address: string
  coordinates?: {
    lat: number
    lng: number
  }
}

interface LocationPickerProps {
  value?: string
  onChange: (location: Location) => void
  required?: boolean
  label?: string
}

const LocationPicker = ({
  value = '',
  onChange,
  required = false,
  label = commonStrings.LOCATION
}: LocationPickerProps) => {
  const [address, setAddress] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  
  useEffect(() => {
    // Load Google Maps API script if not already loaded
    if (!window.google?.maps?.places) {
      const apiKey = 'AIzaSyAky_LAk9E9vvepmobFuxIQK06f8zzgZoc' // From .env file
      const script = document.createElement('script')
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
      script.async = true
      document.head.appendChild(script)
      
      return () => {
        // Clean up script if component unmounts before load
        if (document.head.contains(script)) {
          document.head.removeChild(script)
        }
      }
    }
  }, [])
  
  useEffect(() => {
    // Initialize autocomplete once Google Maps is loaded
    const initAutocomplete = () => {
      if (inputRef.current && window.google?.maps?.places) {
        autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current)
        
        autocompleteRef.current.addListener('place_changed', () => {
          const place = autocompleteRef.current?.getPlace()
          
          if (place && place.formatted_address) {
            const newLocation: Location = {
              address: place.formatted_address,
            }
            
            if (place.geometry?.location) {
              newLocation.coordinates = {
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng()
              }
            }
            
            setAddress(place.formatted_address)
            onChange(newLocation)
          }
        })
      }
    }
    
    // Check if Google Maps is loaded, if so initialize
    if (window.google?.maps?.places) {
      initAutocomplete()
    } else {
      // Otherwise wait for it to load
      const checkGoogleMapsLoaded = setInterval(() => {
        if (window.google?.maps?.places) {
          clearInterval(checkGoogleMapsLoaded)
          initAutocomplete()
        }
      }, 100)
      
      return () => clearInterval(checkGoogleMapsLoaded)
    }
  }, [onChange])
  
  useEffect(() => {
    setAddress(value)
  }, [value])
  
  return (
    <FormControl fullWidth margin="dense">
      <InputLabel className={required ? 'required' : ''}>{label}</InputLabel>
      <Input
        inputRef={inputRef}
        type="text"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        autoComplete="off"
        required={required}
      />
    </FormControl>
  )
}

export default LocationPicker 