import React, { useEffect, useRef, useState } from 'react';
import { TextField, FormControl, FormHelperText } from '@mui/material';
import env from '@/config/env.config';

// Define TypeScript interfaces for props and Google Places API objects
interface GooglePlacesAutocompleteProps {
  label: string;
  value?: string;
  required?: boolean;
  variant?: 'standard' | 'outlined' | 'filled';
  onChange: (place: google.maps.places.PlaceResult | null) => void;
  onError?: (error: Error) => void;
  placeholder?: string;
  disabled?: boolean;
  types?: string[];
  strictBounds?: boolean;
  bounds?: google.maps.LatLngBounds | google.maps.LatLngBoundsLiteral;
  error?: boolean;
  helperText?: string;
}

declare global {
  interface Window {
    initGooglePlacesAutocomplete?: () => void;
    google: any;
  }
}

const GooglePlacesAutocomplete: React.FC<GooglePlacesAutocompleteProps> = ({
  label,
  value = '',
  required = false,
  variant = 'outlined',
  onChange,
  onError,
  placeholder = '',
  disabled = false,
  types = [],
  strictBounds = false,
  bounds,
  error = false,
  helperText = '',
}) => {
  const [inputValue, setInputValue] = useState(value);
  const [initialized, setInitialized] = useState(false);
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get the API key directly from import.meta.env
  const apiKey = import.meta.env.VITE_BC_GOOGLE_MAPS_API_KEY;

  // Initialize the Google Maps script
  useEffect(() => {
    if (!window.google) {
      const script = document.createElement('script');
      // Use the API key from import.meta.env
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGooglePlacesAutocomplete`;
      script.async = true;
      script.defer = true;
      
      window.initGooglePlacesAutocomplete = () => {
        setInitialized(true);
      };
      
      document.head.appendChild(script);
      
      return () => {
        document.head.removeChild(script);
        // Safely delete the property only if it exists
        if (window.initGooglePlacesAutocomplete) {
          window.initGooglePlacesAutocomplete = undefined;
        }
      };
    } else {
      setInitialized(true);
    }
  }, [apiKey]);

  // Initialize Autocomplete once Google Maps is loaded
  useEffect(() => {
    if (initialized && inputRef.current) {
      try {
        const options: google.maps.places.AutocompleteOptions = {
          fields: ['address_components', 'formatted_address', 'geometry', 'name', 'place_id'],
          strictBounds,
          types,
          componentRestrictions: { country: 'sv' }, // Restrict results to El Salvador (sv is country code)
        };
        
        if (bounds) {
          options.bounds = bounds;
        }
        
        const autocompleteInstance = new google.maps.places.Autocomplete(
          inputRef.current,
          options
        );
        
        // Add place_changed event listener
        autocompleteInstance.addListener('place_changed', () => {
          const place = autocompleteInstance.getPlace();
          
          if (!place.geometry) {
            // User entered the name of a place that was not suggested
            if (onError) {
              onError(new Error('No details available for the selected place'));
            }
            return;
          }
          
          setInputValue(place.formatted_address || '');
          onChange(place);
        });
        
        setAutocomplete(autocompleteInstance);
      } catch (err) {
        console.error('Error initializing Google Places Autocomplete:', err);
        if (onError) {
          onError(err instanceof Error ? err : new Error('Failed to initialize Google Places Autocomplete'));
        }
      }
    }
    
    return () => {
      if (autocomplete) {
        google.maps.event.clearInstanceListeners(autocomplete);
      }
    };
  }, [initialized, bounds, strictBounds, types, onChange, onError]);

  // Update input value when value prop changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    if (e.target.value === '') {
      onChange(null);
    }
  };

  return (
    <FormControl fullWidth error={error}>
      <TextField
        label={label}
        value={inputValue}
        onChange={handleInputChange}
        inputRef={inputRef}
        required={required}
        variant={variant}
        placeholder={placeholder}
        disabled={disabled || !initialized}
        fullWidth
        error={error}
      />
      {helperText && <FormHelperText>{helperText}</FormHelperText>}
    </FormControl>
  );
};

export default GooglePlacesAutocomplete;
