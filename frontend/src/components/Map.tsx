import React, { Dispatch, ReactNode, SetStateAction, useEffect, useRef, useState, useMemo } from 'react'
import { MapContainer, Marker, Popup, TileLayer, useMapEvents, Circle } from 'react-leaflet'
import L, { LatLngExpression } from 'leaflet'
import icon from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'
import * as bookcarsTypes from ':bookcars-types'
// import * as UserService from '@/services/UserService'
import { strings } from '@/lang/map'
import * as LocationService from '@/services/LocationService'
import * as helper from '@/common/helper'
import env from '@/config/env.config'
import { useNavigate } from 'react-router-dom'

import 'leaflet-boundary-canvas'
import 'leaflet/dist/leaflet.css'
import '@/assets/css/map.css'

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow
})

L.Marker.prototype.options.icon = DefaultIcon

interface Marker {
  name: string,
  position: L.LatLng
}

const markers: Marker[] = [
  // { name: 'Athens (ATH)', position: new L.LatLng(37.983810, 23.727539) },
]
const zoomMarkers: Marker[] = [
  // { name: 'Athens Airport (ATH)', position: new L.LatLng(37.937225, 23.945238) },
  // { name: 'Athens Port Piraeus (ATH)', position: new L.LatLng(37.9495811, 23.6121006) },
]

interface ZoomTrackerProps {
  setZoom: Dispatch<SetStateAction<number>>
}

const ZoomTracker = ({ setZoom }: ZoomTrackerProps) => {
  const mapEvents = useMapEvents({
    zoom() {
      setZoom(mapEvents.getZoom())
    }
  })

  return null
}

interface ZoomControlledLayerProps {
  zoom: number
  minZoom: number
  children: ReactNode
}

const ZoomControlledLayer = ({ zoom, minZoom, children }: ZoomControlledLayerProps) => {
  if (zoom >= minZoom) {
    return (
      <>
        {children}
      </>
    )
  }
  return null
}

interface MapProps {
  title?: string
  position?: LatLngExpression
  location?: { latitude: number, longitude: number } | bookcarsTypes.Location
  initialZoom?: number
  zoom?: number
  locations?: bookcarsTypes.Location[]
  parkingSpots?: bookcarsTypes.ParkingSpot[]
  className?: string
  children?: ReactNode
  radius?: number
  onSelelectPickUpLocation?: (locationId: string) => void
  cars?: bookcarsTypes.Car[]
  onMapClick?: () => void
  onMarkerClick?: (carId: string) => void
  selectedCarId?: string | null
  from?: Date
  to?: Date
  pickupLocationId?: string
  dropOffLocationId?: string
}

const Map = ({
  title,
  position,
  location,
  initialZoom,
  zoom: mapZoom,
  locations,
  parkingSpots,
  className,
  children,
  radius,
  onSelelectPickUpLocation,
  cars,
  onMapClick,
  onMarkerClick,
  selectedCarId,
  from,
  to,
  pickupLocationId,
  dropOffLocationId,
}: MapProps) => {
  const _initialZoom = initialZoom || mapZoom || 5.5
  const [zoom, setZoom] = useState(_initialZoom)
  const map = useRef<L.Map>(null)
  const navigate = useNavigate()
  
  // Use location prop to determine position if provided
  const mapPosition = useMemo(() => {
    if (location) {
      if ('latitude' in location && 'longitude' in location && location.latitude && location.longitude) {
        return new L.LatLng(location.latitude, location.longitude);
      }
    }
    
    return position || new L.LatLng(31.792305849269, -7.080168000000015);
  }, [location, position]);

  useEffect(() => {
    if (map.current) {
      map.current.attributionControl.setPrefix('')
      map.current.invalidateSize()
    }
  }, [map])

  useEffect(() => {
    if (map.current && onMapClick) {
      map.current.on('click', () => {
        onMapClick()
      })

      return () => {
        if (map.current) {
          map.current.off('click')
        }
      }
    }
  }, [map, onMapClick])

  //
  // Tile server
  //

  const tileURL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
  // const tileURL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
  // const language = UserService.getLanguage()
  // if (language === 'fr') {
  //   tileURL = 'https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png'
  // }

  const getLocationMarkers = (): Marker[] => (
    (locations
      && locations
        .filter((l) => l.latitude && l.longitude)
        .map((l) => ({ name: l.name!, position: new L.LatLng(l.latitude!, l.longitude!) }))
    ) || []
  )

  const getMarkers = (__markers: Marker[]) =>
    __markers.map((marker) => (
      <Marker key={marker.name} position={marker.position}>
        <Popup className="marker">
          <div className="name">{marker.name}</div>
          <div className="action">
            {!!onSelelectPickUpLocation && (
              <button
                type="button"
                className="action-btn"
                onClick={async () => {
                  try {
                    if (onSelelectPickUpLocation) {
                      const { status, data } = await LocationService.getLocationId(marker.name, 'en')

                      if (status === 200) {
                        onSelelectPickUpLocation(data)
                      } else {
                        helper.error()
                      }
                    }
                  } catch (err) {
                    helper.error(err)
                  }
                }}
              >
                {strings.SELECT_PICK_UP_LOCATION}
              </button>
            )}
          </div>
        </Popup>
      </Marker>
    ))

  const getParkingSpots = () =>
    parkingSpots && parkingSpots.map((parkingSpot) => (
      <Marker key={parkingSpot._id} position={[Number(parkingSpot.latitude), Number(parkingSpot.longitude)]}>
        <Popup className="marker">
          <div className="name">{parkingSpot.name}</div>
        </Popup>
      </Marker>
    ))
    
  // New function to render car markers
  const getCarMarkers = () => {
    if (!cars || cars.length === 0) {
      console.log('No cars data available for markers');
      return null;
    }
    
    console.log('Car data for markers:', cars);
    
    // Get center position from location prop
    const centerPosition = location && 'latitude' in location && location.latitude && location.longitude 
      ? [location.latitude, location.longitude]
      : mapPosition;
      
    console.log('Center position for car markers:', centerPosition);
    
    // Function to distribute cars around center point
    const distributeAroundPoint = (center: number[], index: number, total: number) => {
      // Skip distribution if only 1 car
      if (total <= 1) return center;
      
      // Create a grid pattern for markers instead of a circle
      // This provides better visibility for square markers
      const gridSize = Math.ceil(Math.sqrt(total));
      const cellSize = 0.0003; // smaller spacing between markers
      
      const row = Math.floor(index / gridSize);
      const col = index % gridSize;
      
      // Center the grid around the center point
      const offsetX = (gridSize - 1) * cellSize / 2;
      const offsetY = (gridSize - 1) * cellSize / 2;
      
      return [
        center[0] + (col * cellSize - offsetX),
        center[1] + (row * cellSize - offsetY)
      ];
    };
    
    return cars.map((car, index) => {
      // Distribute cars in a circle around the center location
      const carPosition = distributeAroundPoint(
        centerPosition as [number, number], 
        index, 
        cars.length
      );
      
      // Get car image URL and log it for debugging
      const imageUrl = car.image ? `${env.CDN_CARS}/${car.image}` : ''
      console.log(`Car ${car._id || 'unknown'} image URL:`, imageUrl)
      
      // Check if there's an actual image to display
      const hasImage = !!imageUrl && imageUrl !== ''
      
      // Create HTML for marker content
      let markerHtml = ''
      if (hasImage) {
        console.log(`Using image for car ${car._id || 'unknown'}`);
        markerHtml = `<div class="car-marker-content">
                        <img src="${imageUrl}" alt="${car.name || 'Car'}" onerror="this.onerror=null; this.src='data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2250%22%20height%3D%2250%22%20viewBox%3D%220%200%2050%2050%22%3E%3Cpath%20fill%3D%22%233f51b5%22%20d%3D%22M25%201.25c-13.07%200-23.75%2010.68-23.75%2023.75S11.93%2048.75%2025%2048.75%2048.75%2038.07%2048.75%2025%2038.07%201.25%2025%201.25zm-10%2030h-5v-5h5v5zm0-10h-5v-5h5v5zm0-10h-5v-5h5v5zm10%2020h-5v-5h5v5zm0-10h-5v-5h5v5zm0-10h-5v-5h5v5zm10%2020h-5v-5h5v5zm0-10h-5v-5h5v5zm0-10h-5v-5h5v5z%22%2F%3E%3C%2Fsvg%3E';" />
                      </div>`
      } else {
        console.log(`No image found for car ${car._id || 'unknown'}. Using fallback.`);
        // Fallback for no image - show a car icon or initials
        const carInitial = (car.name && car.name.length > 0) ? car.name[0].toUpperCase() : 'C';
        markerHtml = `<div class="car-marker-content no-image">
                        <div class="car-marker-fallback">${carInitial}</div>
                      </div>`
      }
      
      console.log(`Creating marker for car ${car._id || 'unknown'} at position:`, carPosition);
      
      // Create a custom marker with the car image
      return (
        <Marker 
          key={car._id} 
          position={carPosition as [number, number]}
          icon={L.divIcon({
            className: 'car-marker',
            html: markerHtml,
            iconSize: [60, 50],
            iconAnchor: [30, 58]
          })}
          eventHandlers={{
            click: () => {
              if (onMarkerClick && car._id) {
                onMarkerClick(car._id)
              }
            }
          }}
        >
          <Popup 
            className="car-popup"
            {...(selectedCarId === car._id ? { autoPan: true } : {})}
          >
            <div className="car-popup-content">
              {hasImage && (
                <div className="car-popup-image">
                  <img src={imageUrl} alt={car.name || 'Car'} />
                </div>
              )}
              <div className="car-name">{car.name || 'Car'}</div>
              
              {/* Car info similar to CarList.tsx */}
              <div className="car-info">
                {car.type && (
                  <div className="car-info-item">
                    <span className="icon">⛽</span>
                    <span>{helper.getCarTypeShort(car.type)}</span>
                  </div>
                )}
                {car.gearbox && (
                  <div className="car-info-item">
                    <span className="icon">⚙️</span>
                    <span>{helper.getGearboxTypeShort(car.gearbox)}</span>
                  </div>
                )}
                {car.seats > 0 && (
                  <div className="car-info-item">
                    <span className="icon">👤</span>
                    <span>{car.seats}</span>
                  </div>
                )}
                {car.doors > 0 && (
                  <div className="car-info-item">
                    <span className="icon">🚪</span>
                    <span>{car.doors}</span>
                  </div>
                )}
                {car.aircon && (
                  <div className="car-info-item">
                    <span className="icon">❄️</span>
                  </div>
                )}
              </div>
              
              {/* Price section */}
              <div className="car-price-section">
                <div className="price-column">
                  <div className="price-label">Price for {car.days || 3} days</div>
                  <div className="car-price-total">${car.price || 147}</div>
                </div>
                <div className="price-column">
                  <div className="price-label">Price per day</div>
                  <div className="car-price-day">${car.dailyPrice || 49}</div>
                </div>
              </div>

              {/* Add Choose This Car button */}
              <button 
                className="choose-car-btn"
                onClick={() => {
                  // Handle car selection
                  if (car._id) {
                    // Use the props passed from the parent component if available
                    // or fallback to defaults
                    
                    // Get pickup location ID from props or from the location object
                    let _pickupLocationId = pickupLocationId;
                    if (!_pickupLocationId && location && 'latitude' in location && '_id' in location) {
                      _pickupLocationId = location._id;
                    }
                    
                    // If still no pickup location ID, use placeholder
                    if (!_pickupLocationId) {
                      _pickupLocationId = '000000000000000000000000';
                    }
                    
                    // Get drop-off location ID or default to pickup location
                    const _dropOffLocationId = dropOffLocationId || _pickupLocationId;
                    
                    // Get dates from props or use defaults
                    const now = new Date();
                    const _from = from || car.from || now;
                    const _to = to || car.to || new Date(now.getTime() + (3 * 24 * 60 * 60 * 1000)); // 3 days later
                    
                    // Ensure dates are properly serialized for router state
                    console.log('Choose car - Parameters before navigate:', {
                      carId: car._id,
                      pickupLocationId: _pickupLocationId,
                      dropOffLocationId: _dropOffLocationId,
                      from: _from,
                      to: _to
                    });

                    // Navigate with complete state data
                    navigate('/checkout', {
                      state: {
                        carId: car._id,
                        pickupLocationId: _pickupLocationId,
                        dropOffLocationId: _dropOffLocationId,
                        // Convert dates to ISO strings to avoid serialization issues
                        from: _from instanceof Date ? _from.toISOString() : _from,
                        to: _to instanceof Date ? _to.toISOString() : _to,
                        // Add coordinates for location-based search
                        pickupCoordinates: location && 'latitude' in location && location.latitude ? {
                          latitude: location.latitude,
                          longitude: location.longitude,
                          address: 'latitude' in location && '_id' in location && location.name ? location.name : 'Selected Location'
                        } : null
                      }
                    });
                  }
                }}
              >
                CHOOSE THIS CAR
              </button>
            </div>
          </Popup>
        </Marker>
      )
    })
  }

  useEffect(() => {
    // Add car count indicator when cars are loaded
    if (map.current && cars && cars.length > 0) {
      // Create a custom control for car count
      const CarCountControl = L.Control.extend({
        onAdd: function() {
          const div = L.DomUtil.create('div', 'car-count-indicator')
          div.innerHTML = `<span>${cars.length} ${cars.length === 1 ? 'car' : 'cars'} found</span>`;
          return div
        }
      })
      
      // Add the control to the map
      const carCountControl = new CarCountControl({ position: 'topright' });
      map.current.addControl(carCountControl);
      
      // Clean up when component unmounts or cars change
      return () => {
        if (map.current) {
          map.current.removeControl(carCountControl)
        }
      }
    }
  }, [cars, map.current])

  // Add an effect to handle selected car popup
  useEffect(() => {
    if (map.current && selectedCarId && cars) {
      // Refresh map to ensure popups update
      setTimeout(() => {
        map.current?.invalidateSize()
      }, 100)
    }
  }, [map, selectedCarId, cars])

  return (
    <>
      {title && <h1 className="title">{title}</h1>}
      <MapContainer
        center={mapPosition}
        zoom={_initialZoom}
        className={`${className ? `${className} ` : ''}map`}
        ref={map}
      >
        <TileLayer
          // attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url={tileURL}
        />
        <ZoomTracker setZoom={setZoom} />
        
        {/* Display radius circle if radius is provided */}
        {location && 'latitude' in location && location.latitude && location.longitude && radius && (
          <Circle 
            center={[location.latitude, location.longitude]} 
            radius={radius * 1000} 
            pathOptions={{ 
              fillColor: '#3f51b5',
              fillOpacity: 0.1,
              color: '#3f51b5',
              weight: 1
            }} 
          />
        )}
        
        <ZoomControlledLayer zoom={zoom} minZoom={7.5}>
          {
            getMarkers(zoomMarkers)
          }
        </ZoomControlledLayer>
        <ZoomControlledLayer zoom={zoom} minZoom={5.5}>
          {
            getMarkers(markers)
          }
        </ZoomControlledLayer>
        <ZoomControlledLayer zoom={zoom} minZoom={_initialZoom}>
          {
            getMarkers(getLocationMarkers())
          }
          {
            getParkingSpots()
          }
          {
            getCarMarkers()
          }
        </ZoomControlledLayer>
        {children}
      </MapContainer>
    </>
  )
}

export default Map
