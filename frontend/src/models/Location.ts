/**
 * Represents a location with coordinates
 */
export interface Location {
  _id: string;
  name: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
} 
