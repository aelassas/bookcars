/**
 * Utility functions for handling location data and coordinates
 */

import { Location } from '@/models/Location';
import * as bookcarsHelper from ':bookcars-helper'
import * as UserService from '@/services/UserService'

/**
 * Calculate distance between two coordinates using Haversine formula
 * 
 * @param lat1 - Latitude of first coordinate
 * @param lon1 - Longitude of first coordinate
 * @param lat2 - Latitude of second coordinate
 * @param lon2 - Longitude of second coordinate
 * @returns Distance in kilometers
 */
export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  return bookcarsHelper.distance(lat1, lon1, lat2, lon2, 'K')
}

/**
 * Format distance value for display
 * 
 * @param distance - Distance value in kilometers
 * @returns Formatted distance string with unit
 */
export const formatDistance = (distance: number): string => {
  return bookcarsHelper.formatDistance(distance, UserService.getLanguage())
}

/**
 * Format address parts into a readable string
 * 
 * @param address - Address object with components
 * @returns Formatted address string
 */
export const formatAddress = (address: any): string => {
  if (!address) return ''
  
  const parts = []
  
  // Add specific address components as needed
  if (address.street_number) parts.push(address.street_number)
  if (address.route) parts.push(address.route)
  if (address.locality) parts.push(address.locality)
  if (address.administrative_area_level_1) parts.push(address.administrative_area_level_1)
  if (address.postal_code) parts.push(address.postal_code)
  if (address.country) parts.push(address.country)
  
  return parts.join(', ')
}

/**
 * Extract address components from Google Places result
 * 
 * @param place - Google Places result
 * @returns Object with address components
 */
export const extractAddressComponents = (place: any): Record<string, string> => {
  if (!place || !place.address_components) return {}
  
  const addressComponents: Record<string, string> = {}
  
  place.address_components.forEach((component: any) => {
    const type = component.types[0]
    if (type) {
      addressComponents[type] = component.long_name
    }
  })
  
  return addressComponents
}

/**
 * Convert degrees to radians
 */
const deg2rad = (deg: number): number => {
  return deg * (Math.PI / 180);
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

/**
 * Calculate distance from search coordinates to car locations
 * 
 * @param searchCoordinates - Coordinates used in the search
 * @param car - Car object with location coordinates
 * @returns Distance in kilometers to the nearest car location
 */
export const getCarDistance = (
  searchCoordinates: { latitude: number, longitude: number },
  car: any
): number | null => {
  if (!searchCoordinates || !car) return null
  
  // If car has a pre-calculated distance from the API, use that
  if (car.distance) {
    return car.distance
  }
  
  // If car has location coordinates, calculate the minimum distance to any location
  if (car.locationCoordinates && car.locationCoordinates.length > 0) {
    // Calculate distance to each location and return the minimum
    const distances = car.locationCoordinates.map((location: any) => 
      calculateDistance(
        searchCoordinates.latitude,
        searchCoordinates.longitude,
        location.latitude,
        location.longitude
      )
    )
    
    return Math.min(...distances)
  }
  
  // If no coordinates, can't calculate distance
  return null
} 
