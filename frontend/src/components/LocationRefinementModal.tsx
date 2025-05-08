import React, { useEffect, useState, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  CircularProgress,
  Box,
} from '@mui/material';
import { strings as commonStrings } from '@/lang/common';
import env from '@/config/env.config';

interface LocationCoordinates {
  latitude: number;
  longitude: number;
  address: string;
  placeId: string;
}

interface LocationRefinementModalProps {
  open: boolean;
  onClose: () => void;
  initialLocation: LocationCoordinates | null;
  onConfirm: (location: LocationCoordinates) => void;
}

const LocationRefinementModal: React.FC<LocationRefinementModalProps> = ({
  open,
  onClose,
  initialLocation,
  onConfirm,
}) => {
  const [location, setLocation] = useState<LocationCoordinates | null>(initialLocation);
  const [loading, setLoading] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  
  // Get the API key directly from import.meta.env
  const apiKey = import.meta.env.VITE_BC_GOOGLE_MAPS_API_KEY;

  // Initialize the map when the component mounts and the dialog is open
  useEffect(() => {
    if (open && initialLocation && mapRef.current && !googleMapRef.current) {
      setLoading(true);
      
      // Load Google Maps script if it hasn't been loaded yet
      if (!window.google) {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
        script.async = true;
        script.defer = true;
        script.onload = initializeMap;
        
        document.head.appendChild(script);
        
        return () => {
          document.head.removeChild(script);
        };
      } else {
        initializeMap();
      }
    }
  }, [open, initialLocation, apiKey]);

  // Reinitialize map when location changes
  useEffect(() => {
    if (googleMapRef.current && markerRef.current && location) {
      const latLng = new google.maps.LatLng(location.latitude, location.longitude);
      googleMapRef.current.setCenter(latLng);
      markerRef.current.setPosition(latLng);
    }
  }, [location]);

  const initializeMap = () => {
    if (!mapRef.current || !initialLocation) return;
    
    try {
      const latLng = new google.maps.LatLng(initialLocation.latitude, initialLocation.longitude);
      
      // Create map
      const mapOptions: google.maps.MapOptions = {
        center: latLng,
        zoom: 15,
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: true,
      };
      
      const map = new google.maps.Map(mapRef.current, mapOptions);
      googleMapRef.current = map;
      
      // Create draggable marker
      const marker = new google.maps.Marker({
        position: latLng,
        map,
        draggable: true,
        animation: google.maps.Animation.DROP,
        title: initialLocation.address,
      });
      markerRef.current = marker;
      
      // Get new address when marker is dragged
      google.maps.event.addListener(marker, 'dragend', async () => {
        const newPosition = marker.getPosition();
        if (newPosition) {
          setLoading(true);
          try {
            const geocoder = new google.maps.Geocoder();
            
            // Use Promise to handle the geocode callback
            const geocodeResult = await new Promise<google.maps.GeocoderResult[]>((resolve, reject) => {
              geocoder.geocode({ location: newPosition }, (results, status) => {
                if (status === google.maps.GeocoderStatus.OK && results && results.length > 0) {
                  resolve(results);
                } else {
                  reject(new Error(`Geocoder failed: ${status}`));
                }
              });
            });
            
            if (geocodeResult && geocodeResult.length > 0) {
              const newLocation: LocationCoordinates = {
                latitude: newPosition.lat(),
                longitude: newPosition.lng(),
                address: geocodeResult[0].formatted_address,
                placeId: geocodeResult[0].place_id || initialLocation.placeId,
              };
              
              setLocation(newLocation);
            } else {
              setError('No address found for this location');
            }
          } catch (err) {
            setError('Error getting address information');
            console.error('Geocoder error:', err);
          } finally {
            setLoading(false);
          }
        }
      });
      
      setMapLoaded(true);
      setLoading(false);
    } catch (err) {
      setError('Error initializing map');
      console.error('Map initialization error:', err);
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (location) {
      onConfirm(location);
      onClose();
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      fullWidth
      maxWidth="md"
    >
      <DialogTitle>{commonStrings.REFINE_LOCATION || 'Refine Location'}</DialogTitle>
      <DialogContent>
        {error && (
          <Typography color="error" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}
        
        <Box sx={{ position: 'relative', height: 400, mb: 2 }}>
          <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
          {loading && (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(255, 255, 255, 0.7)',
              }}
            >
              <CircularProgress />
            </Box>
          )}
        </Box>
        
        <TextField
          label={commonStrings.ADDRESS || 'Address'}
          value={location?.address || ''}
          fullWidth
          margin="normal"
          disabled={loading}
          onChange={(e) => {
            if (location) {
              setLocation({ ...location, address: e.target.value });
            }
          }}
        />
        
        <Box display="flex" mt={1}>
          <TextField
            label={commonStrings.LATITUDE || 'Latitude'}
            value={location?.latitude || ''}
            margin="normal"
            disabled
            sx={{ mr: 1, flex: 1 }}
          />
          <TextField
            label={commonStrings.LONGITUDE || 'Longitude'}
            value={location?.longitude || ''}
            margin="normal"
            disabled
            sx={{ flex: 1 }}
          />
        </Box>
        
        <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
          {commonStrings.DRAG_MARKER_INSTRUCTIONS || 'Drag the marker to refine the location'}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          {commonStrings.CANCEL || 'Cancel'}
        </Button>
        <Button 
          onClick={handleConfirm} 
          color="primary" 
          variant="contained"
          disabled={!location || loading}
        >
          {commonStrings.CONFIRM || 'Confirm'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LocationRefinementModal; 
