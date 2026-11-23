import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Button
} from '@mui/material'
import {
  LocationOn as LocationIcon,
  DirectionsCar as CarIcon,
  AccessTime as TimeIcon,
  Terrain as MountainIcon,
  Business as CityIcon,
  Search as SearchIcon
} from '@mui/icons-material'
import L from 'leaflet'
import env from '@/config/env.config'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import * as LocationService from '@/services/LocationService'
import Layout from '@/components/Layout'
import Map from '@/components/Map'
import SearchForm from '@/components/SearchForm'
import Footer from '@/components/Footer'

import '@/assets/css/locations.css'

interface FeaturedHub {
  id: string
  name: string
  city: string
  tag: string
  fleetCount: string
  address: string
  hours: string
  icon: 'mountain' | 'city'
}

const FEATURED_HUBS: FeaturedHub[] = [
  {
    id: 'isb-blue-area',
    name: 'Blue Area Central Hub',
    city: 'Islamabad',
    tag: 'Northern Gateway',
    fleetCount: '28+ Vehicles',
    address: 'Jinnah Avenue, Blue Area, Islamabad',
    hours: '24/7 Escrow Dispatch',
    icon: 'city'
  },
  {
    id: 'lhr-gulberg',
    name: 'Gulberg Executive Hub',
    city: 'Lahore',
    tag: 'Executive & Chauffeur',
    fleetCount: '35+ Vehicles',
    address: 'Main Boulevard, Gulberg III, Lahore',
    hours: '24/7 Escrow Dispatch',
    icon: 'city'
  },
  {
    id: 'swl-high-street',
    name: 'High Street Hub',
    city: 'Sahiwal',
    tag: 'Central Punjab',
    fleetCount: '18+ Vehicles',
    address: 'High Street, Near Stadium, Sahiwal',
    hours: '08:00 AM – 11:00 PM',
    icon: 'city'
  },
  {
    id: 'murree-express',
    name: 'Expressway & Hills Hub',
    city: 'Murree',
    tag: '4x4 Hill Route Approved',
    fleetCount: '15+ SUVs',
    address: 'Lower Topa / Murree Expressway Junction',
    hours: '24/7 Outstation & Delivery',
    icon: 'mountain'
  }
]

const Locations = () => {
  const navigate = useNavigate()
  const [locations, setLocations] = useState<bookcarsTypes.Location[]>([])
  const [pickupLocation, setPickupLocation] = useState('')
  const [openSearchFormDialog, setOpenSearchFormDialog] = useState(false)

  const onLoad = async () => {
    const _locations = await LocationService.getLocationsWithPosition()
    setLocations(_locations)
  }

  const handleBrowseHub = (hub: FeaturedHub) => {
    const matched = locations.find((l) => (l.name || '').toLowerCase().includes(hub.city.toLowerCase()))
    if (matched && matched._id) {
      setPickupLocation(matched._id)
      setOpenSearchFormDialog(true)
    } else {
      navigate('/search')
    }
  }

  return (
    <Layout onLoad={onLoad} strict={false}>
      <Box sx={{ maxWidth: 1400, mx: 'auto', px: { xs: 2, sm: 3 }, py: 4 }}>
        {/* Page Header */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <LocationIcon sx={{ color: 'var(--sr-emerald)', fontSize: 18 }} />
            <Typography sx={{ color: 'var(--sr-emerald)', fontWeight: 800, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              SafarRent • Strategic Mobility Corridors
            </Typography>
          </Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: 'var(--sr-text, #0B1120)', letterSpacing: '-0.02em', mb: 1 }}>
            Pickup Hubs & Vehicle Dispatch Points
          </Typography>
          <Typography color="text.secondary" sx={{ fontSize: 14 }}>
            Explore verified handover points across Islamabad, Lahore, Sahiwal, and Murree. Select any hub on the interactive map or browse available fleet below.
          </Typography>
        </Box>

        {/* Split-View: Map + Hub Cards */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 380px' }, gap: 3, mb: 4 }}>
          {/* Interactive Map Pane */}
          <Box
            sx={{
              height: { xs: 360, lg: 540 },
              borderRadius: '20px',
              overflow: 'hidden',
              border: '1px solid var(--sr-border, #E2E8F0)',
              boxShadow: '0 8px 24px rgba(11, 17, 32, 0.05)',
              position: 'relative'
            }}
          >
            <Map
              position={new L.LatLng(env.MAP_LATITUDE, env.MAP_LONGITUDE)}
              initialZoom={env.MAP_ZOOM}
              locations={locations}
              onSelelectPickUpLocation={async (locationId) => {
                setPickupLocation(locationId)
                setOpenSearchFormDialog(true)
              }}
            />
          </Box>

          {/* Quick Hub Quick-Select List */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: { lg: 540 }, overflowY: 'auto' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'var(--sr-text, #0B1120)', letterSpacing: '-0.01em' }}>
              Active Mobility Corridors
            </Typography>
            {FEATURED_HUBS.map((hub) => (
              <Card
                key={hub.id}
                sx={{
                  borderRadius: '14px',
                  border: '1px solid var(--sr-border, #E2E8F0)',
                  bgcolor: 'var(--sr-surface, #FFFFFF)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                  transition: 'transform 0.2s ease, border-color 0.2s ease',
                  '&:hover': {
                    borderColor: '#059669',
                    transform: 'translateY(-2px)'
                  }
                }}
              >
                <CardContent sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'var(--sr-text, #0B1120)' }}>
                        {hub.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {hub.address}
                      </Typography>
                    </Box>
                    <Chip
                      label={hub.tag}
                      size="small"
                      sx={{
                        fontSize: 9,
                        fontWeight: 700,
                        bgcolor: hub.icon === 'mountain' ? 'rgba(217, 119, 6, 0.1)' : 'rgba(5, 150, 105, 0.1)',
                        color: hub.icon === 'mountain' ? 'var(--sr-accent-text)' : 'var(--sr-emerald)',
                        height: 20
                      }}
                    />
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1.5, pt: 1, borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip
                        icon={<CarIcon sx={{ fontSize: '12px !important' }} />}
                        label={hub.fleetCount}
                        size="small"
                        sx={{ fontSize: 10, fontWeight: 700, fontFamily: 'var(--sr-font-mono, monospace)', height: 20 }}
                      />
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
                        {hub.hours}
                      </Typography>
                    </Box>
                    <Button
                      size="small"
                      variant="text"
                      endIcon={<SearchIcon sx={{ fontSize: '14px !important' }} />}
                      onClick={() => handleBrowseHub(hub)}
                      sx={{ color: 'var(--sr-emerald)', fontWeight: 700, fontSize: 11, textTransform: 'none', p: 0.5 }}
                    >
                      Browse Cars
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        </Box>
      </Box>

      {/* Search Form Modal for Hub selection */}
      <Dialog
        fullWidth={env.isMobile}
        maxWidth={false}
        open={openSearchFormDialog}
        onClose={() => setOpenSearchFormDialog(false)}
      >
        <DialogContent className="search-dialog-content">
          <SearchForm
            ranges={bookcarsHelper.getAllRanges()}
            pickupLocation={pickupLocation}
            onCancel={() => setOpenSearchFormDialog(false)}
          />
        </DialogContent>
      </Dialog>

      <Footer />
    </Layout>
  )
}

export default Locations
