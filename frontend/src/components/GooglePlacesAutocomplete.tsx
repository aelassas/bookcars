import React, { useEffect, useRef, useState } from 'react';
import { TextField, FormControl, FormHelperText } from '@mui/material';
import env from '@/config/env.config';
import '@/assets/css/google-places-autocomplete.css';

// Define TypeScript interfaces for Google Maps API types
declare global {
  namespace google.maps.places {
    interface AutocompletePrediction {
      description: string;
      place_id: string;
      structured_formatting?: {
        main_text: string;
        secondary_text: string;
      };
    }

    class AutocompleteService {
      getPlacePredictions(
        request: AutocompletionRequest,
        callback: (
          predictions: AutocompletePrediction[] | null,
          status: PlacesServiceStatus
        ) => void
      ): void;
    }

    class PlacesService {
      constructor(attrContainer: HTMLDivElement);
      getDetails(
        request: PlaceDetailsRequest,
        callback: (result: PlaceResult | null, status: PlacesServiceStatus) => void
      ): void;
    }

    interface PlaceDetailsRequest {
      placeId: string;
      fields: string[];
    }

    interface AutocompletionRequest {
      input: string;
      componentRestrictions?: {
        country: string | string[];
      };
    }

    enum PlacesServiceStatus {
      OK = "OK",
      ZERO_RESULTS = "ZERO_RESULTS",
      OVER_QUERY_LIMIT = "OVER_QUERY_LIMIT",
      REQUEST_DENIED = "REQUEST_DENIED",
      INVALID_REQUEST = "INVALID_REQUEST",
      UNKNOWN_ERROR = "UNKNOWN_ERROR",
      NOT_FOUND = "NOT_FOUND"
    }
  }
}

// Define TypeScript interfaces for props and result types
interface GooglePlacesAutocompleteProps {
  label: string;
  value?: string;
  required?: boolean;
  variant?: 'standard' | 'outlined' | 'filled';
  onChange: (place: PlaceResult) => void;
  onError?: (error: Error) => void;
  placeholder?: string;
  disabled?: boolean;
  types?: string[];
  strictBounds?: boolean;
  bounds?: google.maps.LatLngBounds | google.maps.LatLngBoundsLiteral;
  error?: boolean;
  helperText?: string;
  onCoordinatesChange?: (coordinates: { latitude: number; longitude: number }) => void;
}

// Custom PlaceResult interface to match what we're returning
interface PlaceResult {
  value?: string;
  placeId?: string;
  formatted_address?: string;
  geometry?: {
    location?: {
      lat(): number;
      lng(): number;
    }
  };
  coordinates?: {
    latitude: number;
    longitude: number;
  } | null;
}

const GooglePlacesAutocomplete = ({ 
  label, 
  value, 
  onChange, 
  placeholder, 
  error, 
  helperText,
  onCoordinatesChange 
}: GooglePlacesAutocompleteProps) => {
  const [inputValue, setInputValue] = useState(value || '')
  const [options, setOptions] = useState<google.maps.places.AutocompletePrediction[]>([])
  const [loading, setLoading] = useState(false)
  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null)
  const placesService = useRef<google.maps.places.PlacesService | null>(null)
  const mounted = useRef(true)
  const apiKey = import.meta.env.VITE_BC_GOOGLE_MAPS_API_KEY

  // Initialize Google Maps services when script is loaded
  useEffect(() => {
    if (!window.google || !window.google.maps || !window.google.maps.places) {
      // Load Google Maps script if not already loaded
      const script = document.createElement('script')
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
      script.async = true
      script.defer = true
      script.onload = () => {
        if (mounted.current) {
          autocompleteService.current = new google.maps.places.AutocompleteService()
          
          // Create a div for PlacesService (required)
          const placesDiv = document.createElement('div')
          placesDiv.style.display = 'none'
          document.body.appendChild(placesDiv)
          placesService.current = new google.maps.places.PlacesService(placesDiv)
        }
      }
      document.head.appendChild(script)
      
      return () => {
        mounted.current = false
        if (script.parentNode) {
          script.parentNode.removeChild(script)
        }
      }
    } else {
      autocompleteService.current = new google.maps.places.AutocompleteService()
      
      // Create a div for PlacesService (required)
      const placesDiv = document.createElement('div')
      placesDiv.style.display = 'none'
      document.body.appendChild(placesDiv)
      placesService.current = new google.maps.places.PlacesService(placesDiv)
      
      return () => {
        mounted.current = false
      }
    }
  }, [apiKey])

  // Handle fetching place details and coordinates
  const fetchPlaceDetails = async (placeId: string): Promise<PlaceResult> => {
    if (!placesService.current) {
      throw new Error('Places service not initialized')
    }

    return new Promise<PlaceResult>((resolve, reject) => {
      placesService.current?.getDetails(
        {
          placeId,
          fields: ['geometry', 'formatted_address', 'name']
        },
        (place, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && place) {
            resolve(place as PlaceResult)
          } else {
            reject(new Error(`Place details request failed: ${status}`))
          }
        }
      )
    })
  }

  // Handle input changes and fetch autocomplete predictions
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value
    setInputValue(newValue)
    
    if (!newValue) {
      setOptions([])
      
      // Call onChange with null/empty values when the input is cleared
      if (onChange) {
        onChange({
          value: '',
          coordinates: null
        } as PlaceResult)
      }
      return
    }
    
    if (autocompleteService.current) {
      setLoading(true)
      
      autocompleteService.current.getPlacePredictions(
        {
          input: newValue,
          componentRestrictions: { country: 'sv' } // El Salvador
        },
        (predictions, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
            setOptions(predictions)
          } else {
            setOptions([])
          }
          setLoading(false)
        }
      )
    }
  }

  // Handle option selection
  const handleOptionSelect = async (option: google.maps.places.AutocompletePrediction) => {
    try {
      setLoading(true)
      const place = await fetchPlaceDetails(option.place_id)
      
      if (place && place.geometry && place.geometry.location) {
        const coordinates = {
          latitude: place.geometry.location.lat(),
          longitude: place.geometry.location.lng()
        }
        
        // Update input value and notify parent components
        setInputValue(place.formatted_address || option.description)
        
        if (onChange) {
          onChange({
            value: place.formatted_address || option.description,
            placeId: option.place_id,
            geometry: place.geometry,
            coordinates
          } as PlaceResult)
        }
        
        // Notify about coordinate changes if callback provided
        if (onCoordinatesChange) {
          onCoordinatesChange(coordinates)
        }
      }
    } catch (error) {
      console.error('Error fetching place details:', error)
    } finally {
      setLoading(false)
      setOptions([])
    }
  }

  return (
    <FormControl fullWidth error={error}>
      <TextField
        label={label}
        value={inputValue}
        onChange={handleInputChange}
        placeholder={placeholder}
        disabled={!mounted.current}
        fullWidth
        error={error}
      />
      {helperText && <FormHelperText>{helperText}</FormHelperText>}
      
      {options.length > 0 && (
        <div className="autocomplete-dropdown">
          {options.map((option) => (
            <div 
              key={option.place_id} 
              className="autocomplete-item"
              onClick={() => handleOptionSelect(option)}
            >
              {option.description}
            </div>
          ))}
        </div>
      )}
    </FormControl>
  );
};

export default GooglePlacesAutocomplete;
 