/**
 * Utility functions for handling location data and coordinates
 */

import { Location } from '@/models/Location';

/**
 * Calculate distance between two coordinates in kilometers
 */
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
};

/**
 * Convert degrees to radians
 */
const deg2rad = (deg: number): number => {
  return deg * (Math.PI / 180);
};

/**
 * Format address components from Google Places API
 */
export const formatAddress = (place: google.maps.places.PlaceResult): string => {
  if (place.formatted_address) {
    return place.formatted_address;
  }

  // If formatted_address not available, build from components
  if (place.address_components) {
    const components: string[] = [];
    
    // Extract street number and route
    const streetNumber = place.address_components.find((component: google.maps.AddressComponent) => 
      component.types.includes('street_number')
    )?.long_name;
    
    const route = place.address_components.find((component: google.maps.AddressComponent) => 
      component.types.includes('route')
    )?.long_name;
    
    if (streetNumber && route) {
      components.push(`${streetNumber} ${route}`);
    } else if (route) {
      components.push(route);
    }
    
    // Add locality (city)
    const locality = place.address_components.find((component: google.maps.AddressComponent) => 
      component.types.includes('locality')
    )?.long_name;
    
    if (locality) {
      components.push(locality);
    }
    
    // Add country
    const country = place.address_components.find((component: google.maps.AddressComponent) => 
      component.types.includes('country')
    )?.long_name;
    
    if (country) {
      components.push(country);
    }
    
    return components.join(', ');
  }
  
  return place.name || '';
};

/**
 * Extract location data from Google Places result
 */
export const extractLocationFromPlace = (place: google.maps.places.PlaceResult): Location => {
  if (!place.geometry || !place.geometry.location) {
    throw new Error('Invalid place data: missing geometry or location');
  }

  return {
    _id: place.place_id || '',
    name: place.name || formatAddress(place),
    coordinates: {
      latitude: place.geometry.location.lat(),
      longitude: place.geometry.location.lng()
    }
  };
};

/**
 * Get a formatted address from coordinates using Google Geocoder
 */
export const getAddressFromCoordinates = async (
  latitude: number, 
  longitude: number
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const geocoder = new google.maps.Geocoder();
    const latlng = { lat: latitude, lng: longitude };
    
    geocoder.geocode({ location: latlng }, (results: google.maps.GeocoderResult[], status: google.maps.GeocoderStatus) => {
      if (status === google.maps.GeocoderStatus.OK && results && results.length > 0) {
        resolve(results[0].formatted_address);
      } else {
        reject(new Error(`Geocoder failed: ${status}`));
      }
    });
  });
}; 
