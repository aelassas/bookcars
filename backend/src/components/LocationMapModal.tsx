import React, { useState, useEffect, useRef } from 'react'
import { Dialog, DialogTitle, DialogContent, DialogActions, Box, IconButton, Button, Typography, Alert } from '@mui/material'
import { Close as CloseIcon, PinDrop as PinDropIcon, Info as InfoIcon } from '@mui/icons-material'
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
        if (status === 'OK' && results && results[0]) {
          setCurrentPlaceName(results[0].formatted_address)
        }
      })
    }
  }

  // Initialize the map once the modal is opened
  useEffect(() => {
    if (open) {
      console.log('Modal opened, initializing map with coordinates:', initialCoordinates)
      setCurrentPlaceName(placeName)
      
      // Wait for the modal to be fully rendered before initializing the map
      const timer = setTimeout(() => {
        if (!mapInitialized) {
          if (mapRef.current) {
            console.log('Initializing new map instance')
            initializeMap()
          }
        } else if (mapRef.current && mapInstance.current) {
          console.log('Map already initialized, resizing and recentering')
          resizeMap()
          centerMap(initialCoordinates)
        }
      }, 500) // Delay to ensure DOM is ready

      return () => clearTimeout(timer)
    }
  }, [open, mapInitialized, initialCoordinates, placeName])

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

    console.log('Initializing map with coordinates:', initialCoordinates)

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
      
      console.log('Map initialized successfully')
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
      maxWidth="md"
      fullWidth
      PaperProps={{
        style: { 
          height: '80vh',
          display: 'flex',
          flexDirection: 'column'
        }
      }}
      className="location-map-modal"
      TransitionProps={{
        onEntered: () => {
          // When transition is complete, initialize map if not already
          if (!mapInitialized && mapRef.current) {
            console.log('Modal transition complete, initializing map')
            initializeMap()
          } else if (mapInitialized && mapInstance.current) {
            // Resize map when modal transition is complete
            console.log('Modal transition complete, resizing map')
            resizeMap()
          }
        },
        onExited: () => {
          // Clean up when modal fully closes
          console.log('Modal fully closed, cleaning up map')
          cleanupMap()
        }
      }}
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">
            <PinDropIcon style={{ marginRight: 8, verticalAlign: 'middle' }} />
            {strings.CONFIRM}
          </Typography>
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
        <Typography variant="subtitle1" style={{ marginTop: 8 }}>
          {currentPlaceName}
        </Typography>
      </DialogTitle>
      <DialogContent dividers style={{ padding: 0, flexGrow: 1, position: 'relative' }}>
        <Box 
          ref={mapRef} 
          className="map-container"
          style={{ width: '100%', height: '100%', minHeight: '300px' }}
        />
        {showHint && (
          <Box className="location-hint-popin">
            <InfoIcon style={{ marginRight: 8 }} />
            <span>{strings.LOCATIONS_HINT}</span>
            <IconButton size="small" onClick={() => setShowHint(false)} style={{ marginLeft: 'auto', color: 'white' }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} color="primary">
          {strings.CANCEL}
        </Button>
        <Button onClick={handleConfirm} color="primary" variant="contained">
          {strings.CONFIRM}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default LocationMapModal 
