import React, { useState, useEffect, useRef } from 'react'
import { Dialog, DialogTitle, DialogContent, DialogActions, Box, IconButton, Button, Typography } from '@mui/material'
import { Close as CloseIcon, Info as InfoIcon } from '@mui/icons-material'
import { strings } from '@/lang/common'

interface LocationMapModalProps {
  open: boolean
  onClose: () => void
  placeName: string
  initialCoordinates: { lat: number, lng: number }
  onConfirm: (coordinates: { lat: number, lng: number }) => void
  onPlaceNameUpdate?: (name: string) => void
}

const LocationMapModal = ({
  open,
  onClose,
  placeName,
  initialCoordinates,
  onConfirm,
  onPlaceNameUpdate
}: LocationMapModalProps) => {
  const [selectedCoordinates, setSelectedCoordinates] = useState<{ lat: number, lng: number }>(initialCoordinates)
  const [currentPlaceName, setCurrentPlaceName] = useState(placeName)
  const [showHint, setShowHint] = useState(true)
  const mapRef = useRef<HTMLDivElement>(null)
  const markerRef = useRef<google.maps.Marker | null>(null)
  const mapInstance = useRef<google.maps.Map | null>(null)
  const geocoderRef = useRef<google.maps.Geocoder | null>(null)
  const [mapInitialized, setMapInitialized] = useState(false)
  const resizeObserverRef = useRef<ResizeObserver | null>(null)

  // Get the API key directly from import.meta.env
  const apiKey = import.meta.env.VITE_BC_GOOGLE_MAPS_API_KEY;

  // Reset map instance when modal closes
  useEffect(() => {
    if (!open && mapInitialized) {
      cleanupMap()
    }
    if (open) {
      setShowHint(true)
    }
  }, [open])

  // Watch for changes to currentPlaceName and notify parent component
  useEffect(() => {
    if (onPlaceNameUpdate && currentPlaceName !== placeName) {
      onPlaceNameUpdate(currentPlaceName)
    }
  }, [currentPlaceName, placeName, onPlaceNameUpdate])

  // Helper function to clean up map resources
  const cleanupMap = () => {
    if (markerRef.current) {
      markerRef.current.setMap(null)
      markerRef.current = null
    }
    
    if (resizeObserverRef.current) {
      resizeObserverRef.current.disconnect()
      resizeObserverRef.current = null
    }
    
    mapInstance.current = null
    setMapInitialized(false)
  }

  // Helper function to resize the map
  const resizeMap = () => {
    if (mapInstance.current && window.google && window.google.maps) {
      try {
        window.google.maps.event.trigger(mapInstance.current, 'resize')
      } catch (error) {
        console.error('Error triggering resize event:', error)
      }
    }
  }

  // Helper function to center the map on coordinates
  const centerMap = (coordinates: { lat: number, lng: number }) => {
    if (mapInstance.current) {
      mapInstance.current.setCenter(coordinates)
      if (markerRef.current) {
        markerRef.current.setPosition(coordinates)
      }
      setSelectedCoordinates(coordinates)
      updatePlaceNameFromCoordinates(coordinates)
    }
  }

  // Function to update place name based on coordinates using reverse geocoding
  const updatePlaceNameFromCoordinates = (coordinates: { lat: number, lng: number }) => {
    if (geocoderRef.current) {
      geocoderRef.current.geocode({ location: coordinates }, (results, status) => {
        if (status === google.maps.GeocoderStatus.OK && results && results[0]) {
          setCurrentPlaceName(results[0].formatted_address)
        }
      })
    }
  }

  // Initialize the map once the modal is opened
  useEffect(() => {
    if (open) {
      setCurrentPlaceName(placeName)
      
      // Ensure Google Maps script is loaded
      if (!window.google) {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
        script.async = true;
        script.defer = true;
        script.onload = () => {
          // Wait for the modal to be fully rendered before initializing the map
          setTimeout(() => {
            if (mapRef.current) {
              initializeMap();
            }
          }, 300);
        };
        document.head.appendChild(script);
        
        return () => {
          document.head.removeChild(script);
        };
      } else {
        // If Google Maps is already loaded, initialize map after a short delay
        setTimeout(() => {
          if (!mapInitialized) {
            if (mapRef.current) {
              initializeMap()
            }
          } else if (mapRef.current && mapInstance.current) {
            resizeMap()
            centerMap(initialCoordinates)
          }
        }, 300)
      }
    }
  }, [open, mapInitialized, initialCoordinates, placeName, apiKey])

  // Set up resize observer to handle container resizing
  useEffect(() => {
    if (mapRef.current && mapInstance.current && !resizeObserverRef.current) {
      resizeObserverRef.current = new ResizeObserver(() => {
        resizeMap()
      })
      
      resizeObserverRef.current.observe(mapRef.current)
    }

    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect()
        resizeObserverRef.current = null
      }
    }
  }, [mapInitialized])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      // Clean up marker and map instances
      cleanupMap()
      geocoderRef.current = null
    }
  }, [])

  const initializeMap = () => {
    if (!mapRef.current) {
      console.error('Map container reference not available')
      return
    }
    
    const google = window.google
    if (!google || !google.maps) {
      console.error('Google Maps API not available')
      return
    }

    try {
      // Clean up any existing map instance
      cleanupMap()
      
      // Initialize geocoder
      geocoderRef.current = new google.maps.Geocoder()
      
      // Create the map with simplified controls
      mapInstance.current = new google.maps.Map(mapRef.current, {
        center: initialCoordinates,
        zoom: 17,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControl: true,
        rotateControl: false,
        scaleControl: false,
        mapTypeId: google.maps.MapTypeId.ROADMAP
      })

      // Create a draggable marker
      markerRef.current = new google.maps.Marker({
        position: initialCoordinates,
        map: mapInstance.current,
        draggable: true,
        title: placeName,
        animation: google.maps.Animation?.DROP || undefined
      })

      // Update coordinates and address when marker is dragged
      if (markerRef.current) {
        google.maps.event.addListener(markerRef.current, 'dragend', () => {
          if (markerRef.current) {
            const position = markerRef.current.getPosition()
            if (position) {
              const newCoords = {
                lat: position.lat(),
                lng: position.lng()
              }
              setSelectedCoordinates(newCoords)
              updatePlaceNameFromCoordinates(newCoords)
            }
          }
        })
      }

      // Allow clicking on the map to move the marker
      if (mapInstance.current) {
        google.maps.event.addListener(mapInstance.current, 'click', (event: any) => {
          if (markerRef.current && event.latLng) {
            markerRef.current.setPosition(event.latLng)
            const newCoords = {
              lat: event.latLng.lat(),
              lng: event.latLng.lng()
            }
            setSelectedCoordinates(newCoords)
            updatePlaceNameFromCoordinates(newCoords)
          }
        })

        // Force a resize to ensure the map is rendered properly
        setTimeout(() => {
          resizeMap()
          // Ensure map is centered
          centerMap(initialCoordinates)
        }, 200)
      }

      // Set initial coordinates
      setSelectedCoordinates(initialCoordinates)
      setMapInitialized(true)
    } catch (error) {
      console.error('Error initializing map:', error)
    }
  }

  const handleConfirm = () => {
    // Pass the current coordinates to the parent component
    onConfirm(selectedCoordinates)
    onClose()
  }

  const handleClose = () => {
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="md"
      className="location-map-modal"
    >
      <DialogTitle sx={{ padding: '16px 24px', fontWeight: 500 }}>
        {strings.REFINE_LOCATION || 'Refine Location'}
        <IconButton
          aria-label="close"
          onClick={handleClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ position: 'relative', padding: 0, height: 'auto' }}>
        {showHint && (
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center',
              bgcolor: '#ff9800', 
              color: '#fff',
              padding: '8px 16px',
              position: 'relative',
              zIndex: 1
            }}
          >
            <InfoIcon sx={{ marginRight: 1 }} />
            <Typography>
              {strings.DRAG_MARKER_INSTRUCTIONS}
            </Typography>
            <IconButton 
              size="small" 
              onClick={() => setShowHint(false)}
              sx={{ color: '#fff', position: 'absolute', right: 8 }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        )}
        
        {/* Map container */}
        <Box 
          ref={mapRef} 
          sx={{ width: '100%', height: 400 }}
        />
        
        {/* Place name display at the bottom of map */}
        <Box 
          sx={{ 
            position: 'absolute', 
            bottom: 20, 
            left: '50%', 
            transform: 'translateX(-50%)',
            bgcolor: 'rgba(255, 255, 255, 0.9)',
            padding: '8px 16px',
            borderRadius: '4px',
            maxWidth: '80%',
            textAlign: 'center'
          }}
        >
          {currentPlaceName}
        </Box>
      </DialogContent>

      <DialogActions sx={{ justifyContent: 'space-between', padding: '16px 24px' }}>
        <Button 
          onClick={handleClose} 
          sx={{ color: '#666' }}
        >
          CANCEL
        </Button>
        <Button 
          onClick={handleConfirm} 
          variant="contained" 
          sx={{ bgcolor: '#000', '&:hover': { bgcolor: '#333' } }}
        >
          CONFIRM
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default LocationMapModal 
