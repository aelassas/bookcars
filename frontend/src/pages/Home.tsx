import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  Alert,
  CircularProgress,
  TextField,
  // Checkbox,
  Dialog,
  DialogContent,
  // FormControlLabel,
  Tab,
  Tabs,
  Chip,
  Box,
  Typography
} from '@mui/material'
import {
  RoomService,
  VisibilityOff,
  DirectionsCar,
  Speed,
  Navigation,
  AttachMoney,
  Public,
  FlashOn,
  CheckBox,
  AutoAwesome as AutoAwesomeIcon,
  Search as SearchIcon,
  VerifiedUser as ShieldIcon,
  AccountBalanceWallet as WalletIcon,
  CameraAlt as CameraIcon,
  Terrain as TerrainIcon,
  ArrowForward as ArrowForwardIcon,
} from '@mui/icons-material'
import L from 'leaflet'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import env from '@/config/env.config'
import { strings as carsStrings } from '@/lang/cars'
import { strings } from '@/lang/home'
import * as SupplierService from '@/services/SupplierService'
import * as CountryService from '@/services/CountryService'
import * as LocationService from '@/services/LocationService'
import Layout from '@/components/Layout'
import SupplierCarrousel from '@/components/SupplierCarrousel'
import TabPanel, { a11yProps } from '@/components/TabPanel'
import LocationCarrousel from '@/components/LocationCarrousel'
import SearchForm from '@/components/SearchForm'
import * as BookingService from '@/services/BookingService'
import Map from '@/components/Map'
import Footer from '@/components/Footer'
import FaqList from '@/components/FaqList'

import bookingGuideImage from '@/assets/img/safarrent_hero.jpg'
import '@/assets/css/home.css'

const Home = () => {
  const carRangePhotos = {
    mini: 'https://images.unsplash.com/photo-1564760290219-0160f95e611b?auto=format&fit=crop&w=1200&q=85',
    midi: 'https://images.unsplash.com/photo-1653596898542-016afc02039b?auto=format&fit=crop&w=1200&q=85',
    maxi: 'https://images.unsplash.com/photo-1637751333815-bf48b6d0b395?auto=format&fit=crop&w=1200&q=85',
  }
  const navigate = useNavigate()

  const [suppliers, setSuppliers] = useState<bookcarsTypes.User[]>([])
  const [countries, setCountries] = useState<bookcarsTypes.CountryInfo[]>([])
  const [pickupLocation, setPickupLocation] = useState('')
  const [dropOffLocation, setDropOffLocation] = useState('')
  const [sameLocation, setSameLocation] = useState(true)
  const [tabValue, setTabValue] = useState(0)
  const [openLocationSearchFormDialog, setOpenLocationSearchFormDialog] = useState(false)
  const [locations, setLocations] = useState<bookcarsTypes.Location[]>([])
  const [ranges, setRanges] = useState([bookcarsTypes.CarRange.Mini, bookcarsTypes.CarRange.Midi])
  const [openRangeSearchFormDialog, setOpenRangeSearchFormDialog] = useState(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const [searchDockTab, setSearchDockTab] = useState<'precision' | 'ai'>('precision')
  const aiPresets = [
    '3-day Murree family SUV from Islamabad',
    '4-day Hunza 4x4 from Rawalpindi with driver',
    'Lahore to Sahiwal executive sedan for 2 days',
    'Karachi airport to Clifton weekend self-drive'
  ]
  const [tripRequest, setTripRequest] = useState('')
  const [tripDraft, setTripDraft] = useState<BookingService.TripDraftResult | null>(null)
  const [tripParsing, setTripParsing] = useState(false)
  const [tripError, setTripError] = useState('')

  const parseTrip = async (customPrompt?: string) => {
    const promptToUse = customPrompt || tripRequest
    if (!promptToUse.trim()) {
return
}
    setTripParsing(true)
    setTripError('')
    setTripDraft(null)
    try {
      setTripDraft(await BookingService.parseTripDraft(promptToUse))
    } catch {
      setTripError('Trip assistant is unavailable right now. You can still use the regular search form.')
    } finally {
      setTripParsing(false)
    }
  }

  useEffect(() => {
    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updateMotionPreference = () => setPrefersReducedMotion(motionPreference.matches)

    updateMotionPreference()
    motionPreference.addEventListener('change', updateMotionPreference)

    return () => motionPreference.removeEventListener('change', updateMotionPreference)
  }, [])
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
  }

  const onLoad = async () => {
    if (!env.HIDE_SUPPLIERS) {
      let _suppliers = await SupplierService.getAllSuppliers()
      _suppliers = _suppliers.filter((supplier) => supplier.avatar && !/no-image/i.test(supplier.avatar))
      bookcarsHelper.shuffle(_suppliers)
      setSuppliers(_suppliers)
    }

    const _countries = await CountryService.getCountriesWithLocations('', true, env.MIN_LOCATIONS)
    setCountries(_countries)
    const _locations = await LocationService.getLocationsWithPosition()
    setLocations(_locations)
  }

  // The platform is nationwide; the actual pickup choices below come from live locations.
  const cityLabel = 'PAKISTAN · NATIONWIDE CAR RENTALS'

  return (
    <Layout onLoad={onLoad} strict={false}>

      <div className="home">
        <div className="home-content">

          <div className="video-background" aria-hidden="true">
            <video
              autoPlay={!prefersReducedMotion}
              muted
              loop
              playsInline
              preload="auto"
              poster="/safarrent-hero-poster-4k.jpg"
              tabIndex={-1}
              aria-hidden="true"
              onLoadedMetadata={(event) => {
                event.currentTarget.playbackRate = 0.82
                if (!prefersReducedMotion) {
event.currentTarget.play().catch(() => {})
}
              }}
            >
              {/* 4K road video by Oskar Gross, Pexels asset 37528377; free under the Pexels License. */}
              <source src="/safarrent-hero-4k.mp4" type="video/mp4" />
              <source src="/cover.mp4" type="video/mp4" />
            </video>
          </div>

          <div className="home-title"><span className="home-location-mark">⌖</span> {cityLabel}</div>
          <div className="home-cover">{strings.COVER}</div>
          <div className="home-subtitle">{strings.SUBTITLE}</div>

          <div className="home-assurances" aria-label="Booking features">
            <span><CheckBox /> Availability checked for your dates</span>
            <span><CheckBox /> Pickup and return locations</span>
            <span><CheckBox /> Final price shown before booking</span>
          </div>

        </div>

        {/* Floating Dual-Mode Search Dock */}
        <div className="search">
          <div className="home-search-dock-container">
            <div className="search-dock-tabs" role="group" aria-label="Search mode">
              <button
                type="button"
                className={`search-dock-tab ${searchDockTab === 'precision' ? 'active' : ''}`}
                aria-pressed={searchDockTab === 'precision'}
                onClick={() => setSearchDockTab('precision')}
              >
                <SearchIcon sx={{ fontSize: 18 }} />
                <span>Precision Search</span>
              </button>
              <button
                type="button"
                className={`search-dock-tab ${searchDockTab === 'ai' ? 'active' : ''}`}
                aria-pressed={searchDockTab === 'ai'}
                onClick={() => setSearchDockTab('ai')}
              >
                <AutoAwesomeIcon sx={{ fontSize: 18, color: searchDockTab === 'ai' ? '#10B981' : '#F59E0B' }} />
                <span>AI Trip Planner</span>
              </button>
            </div>

            <div className="home-search">
              {searchDockTab === 'precision' ? (
                <SearchForm />
              ) : (
                <div className="ai-planner-panel">
                  <div className="ai-planner-copy">
                    <h3>Describe your Pakistan journey</h3>
                    <p>Tell us where you are traveling, duration, and if you prefer self-drive or a chauffeur. Our on-premises AI extracts parameters and flags mountain terrain advisories.</p>
                  </div>

                  {/* Clickable Preset Chips */}
                  <div className="ai-preset-chips" aria-label="Suggested trips">
                    {aiPresets.map((preset) => (
                      <Chip
                        key={preset}
                        label={preset}
                        size="small"
                        clickable
                        onClick={() => {
                          setTripRequest(preset)
                          parseTrip(preset)
                        }}
                        className="ai-preset-chip"
                      />
                    ))}
                  </div>

                  <div className="home-trip-assistant-form">
                    <TextField
                      fullWidth
                      multiline
                      minRows={2}
                      maxRows={4}
                      value={tripRequest}
                      onChange={(event) => setTripRequest(event.target.value.slice(0, 2000))}
                      placeholder="e.g., 3-day Murree family SUV from Islamabad with chauffeur"
                      inputProps={{ 'aria-label': 'Describe your rental trip', maxLength: 2000 }}
                    />
                    <Button
                      className="btn-primary"
                      variant="contained"
                      disabled={!tripRequest.trim() || tripParsing}
                      onClick={() => parseTrip()}
                      sx={{ bgcolor: '#107487', '&:hover': { bgcolor: '#047857' }, textTransform: 'none', fontWeight: 700 }}
                    >
                      {tripParsing ? <CircularProgress size={20} color="inherit" /> : 'Parse Trip Details'}
                    </Button>
                  </div>

                  {tripError && <Alert severity="warning" sx={{ mt: 2 }}>{tripError}</Alert>}

                  {tripDraft && (
                    <div className="home-trip-draft" aria-live="polite">
                      <div className="draft-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <strong>Trip Candidate Extracted</strong>
                        <Chip
                          size="small"
                          label={tripDraft.degraded ? 'Rules Fallback' : 'Local Ollama SLM'}
                          sx={{ bgcolor: tripDraft.degraded ? '#FEF3C7' : '#ECFDF5', color: tripDraft.degraded ? '#B45309' : '#047857', fontWeight: 700 }}
                        />
                      </div>
                      <p><strong>Route:</strong> {tripDraft.extractedData.pickupLocation || 'Unspecified'} → {tripDraft.extractedData.dropoffLocation || 'Unspecified'}</p>
                      <p><strong>Dates:</strong> {tripDraft.extractedData.startDate || 'Select on search'} to {tripDraft.extractedData.endDate || 'Select on search'} · <strong>Mode:</strong> {tripDraft.extractedData.rentalType || 'Self-Drive / Chauffeur'}</p>
                      {tripDraft.terrainAdvisory && (
                        <Alert severity="warning" sx={{ my: 1.5, border: '1px solid #F59E0B', fontWeight: 600 }}>
                          ⚠️ {tripDraft.terrainAdvisory}
                        </Alert>
                      )}
                      <Button
                        variant="contained"
                        fullWidth
                        sx={{ mt: 1.5, bgcolor: '#107487', '&:hover': { bgcolor: '#047857' }, textTransform: 'none', fontWeight: 700 }}
                        onClick={() => {
                          const matchedLoc = locations.find((l) => (l.name || '').toLowerCase().includes((tripDraft.extractedData.pickupLocation || '').toLowerCase()))
                          const pickupId = matchedLoc?._id || (locations[0]?._id)
                          // Prefer the dates the parser extracted; fall back to a 3-day window from tomorrow.
                          const parsedFrom = tripDraft.extractedData.startDate ? new Date(`${tripDraft.extractedData.startDate}T10:00:00`) : null
                          const parsedTo = tripDraft.extractedData.endDate ? new Date(`${tripDraft.extractedData.endDate}T10:00:00`) : null
                          const now = new Date()
                          const fromDate = parsedFrom || new Date(now.setDate(now.getDate() + 1))
                          const toDate = parsedTo || new Date(now.setDate(now.getDate() + 4))
                          navigate('/search', {
                            state: {
                              pickupLocationId: pickupId,
                              dropOffLocationId: pickupId,
                              from: fromDate,
                              to: toDate,
                              pickupPlace: tripDraft.extractedData.pickupLocation || '',
                            }
                          })
                        }}
                      >
                        Explore Vehicles for This Trip
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Honest demo-ready booking steps */}
        <section className="home-escrow-strip" aria-labelledby="booking-guide-title">
          <img className="booking-guide-image" src={bookingGuideImage} alt="An SUV on a mountain road" loading="lazy" />
          <h2 id="booking-guide-title">How to rent with SafarRent</h2>
          <div className="escrow-card">
            <div className="escrow-icon-wrap">
              <ShieldIcon sx={{ fontSize: 28, color: 'var(--sr-emerald)' }} />
              <span className="escrow-num">1</span>
            </div>
            <div className="escrow-text">
              <h4>Complete your profile</h4>
              <p>Add your CNIC details. Self-drive bookings also require a driving licence and verified KYC status.</p>
            </div>
          </div>

          <div className="escrow-card">
            <div className="escrow-icon-wrap">
              <WalletIcon sx={{ fontSize: 28, color: 'var(--sr-emerald)' }} />
              <span className="escrow-num">2</span>
            </div>
            <div className="escrow-text">
              <h4>Review your checkout</h4>
              <p>Choose a payment option in the FYP demo. Demo confirmations are simulated; no money is transferred or held.</p>
            </div>
          </div>

          <div className="escrow-card">
            <div className="escrow-icon-wrap">
              <CameraIcon sx={{ fontSize: 28, color: 'var(--sr-emerald)' }} />
              <span className="escrow-num">3</span>
            </div>
            <div className="escrow-text">
              <h4>Record the handover</h4>
              <p>The demo checklist can record fuel level, odometer, spare tyre, and exterior notes.</p>
            </div>
          </div>
        </section>

        {/* 3-Column Corridor Showcase Cards */}
        <section className="home-corridor-showcase" aria-labelledby="corridors-title">
          <div className="corridor-header">
            <span className="corridor-eyebrow">POPULAR TRAVEL CORRIDORS</span>
            <h2 id="corridors-title">Engineered for Pakistan&apos;s Highways & Hills</h2>
            <p>These are example routes. Search for your dates to see vehicles currently listed at available pickup locations.</p>
          </div>

          <div className="corridor-grid">
            {/* Corridor 1: Islamabad -> Murree */}
            <div className="corridor-card">
              <div className="corridor-badge hill-route">
                <TerrainIcon sx={{ fontSize: 16 }} />
                <span>Mountain route example</span>
              </div>
              <h3>Islamabad → Murree & Galiyat</h3>
              <p className="corridor-route">Islamabad Hub / Airport → Murree Expressway (64 km)</p>
              <p className="corridor-desc">Check current vehicle details and confirm route suitability with the supplier before booking.</p>
              <div className="corridor-meta">
                <span className="corridor-fleet">Availability and prices depend on your dates and pickup point.</span>
              </div>
              <Button
                variant="outlined"
                fullWidth
                endIcon={<ArrowForwardIcon />}
                className="corridor-btn"
                onClick={() => {
                  const isb = locations.find((l) => (l.name || '').toLowerCase().includes('islamabad') || (l.name || '').toLowerCase().includes('isb')) || locations[0]
                  if (isb) {
                    const now = new Date()
                    const fromDate = new Date(now.setDate(now.getDate() + 1))
                    const toDate = new Date(now.setDate(now.getDate() + 4))
                    navigate('/search', {
                      state: {
                        pickupLocationId: isb._id,
                        dropOffLocationId: isb._id,
                        from: fromDate,
                        to: toDate,
                        pickupPlace: 'Murree',
                      }
                    })
                  }
                }}
              >
                Browse Hill-Route Fleet
              </Button>
            </div>

            {/* Corridor 2: Lahore Executive */}
            <div className="corridor-card">
              <div className="corridor-badge executive">
                <span>Executive Chauffeur</span>
              </div>
              <h3>Lahore Executive & Motorway</h3>
              <p className="corridor-route">Allama Iqbal Int&apos;l / Gulberg → M-2 / M-3 Motorway</p>
              <p className="corridor-desc">Explore current listings for city and motorway trips; confirm chauffeur details with the supplier.</p>
              <div className="corridor-meta">
                <span className="corridor-fleet">Availability and prices depend on your dates and pickup point.</span>
              </div>
              <Button
                variant="outlined"
                fullWidth
                endIcon={<ArrowForwardIcon />}
                className="corridor-btn"
                onClick={() => {
                  const lhe = locations.find((l) => (l.name || '').toLowerCase().includes('lahore') || (l.name || '').toLowerCase().includes('lhe')) || locations[0]
                  if (lhe) {
                    const now = new Date()
                    const fromDate = new Date(now.setDate(now.getDate() + 1))
                    const toDate = new Date(now.setDate(now.getDate() + 3))
                    navigate('/search', {
                      state: {
                        pickupLocationId: lhe._id,
                        dropOffLocationId: lhe._id,
                        from: fromDate,
                        to: toDate,
                        pickupPlace: 'Lahore',
                      }
                    })
                  }
                }}
              >
                Browse Executive Fleet
              </Button>
            </div>

            {/* Corridor 3: Sahiwal City Hub */}
            <div className="corridor-card">
              <div className="corridor-badge city-hub">
                <span>City & Local Transit</span>
              </div>
              <h3>Sahiwal City & South Punjab</h3>
              <p className="corridor-route">Sahiwal Center → Faisalabad • Multan • Pakpattan</p>
              <p className="corridor-desc">Search current local listings for city errands, visits, and regional travel.</p>
              <div className="corridor-meta">
                <span className="corridor-fleet">Availability and prices depend on your dates and pickup point.</span>
              </div>
              <Button
                variant="outlined"
                fullWidth
                endIcon={<ArrowForwardIcon />}
                className="corridor-btn"
                onClick={() => {
                  const shw = locations.find((l) => (l.name || '').toLowerCase().includes('sahiwal')) || locations[0]
                  if (shw) {
                    const now = new Date()
                    const fromDate = new Date(now.setDate(now.getDate() + 1))
                    const toDate = new Date(now.setDate(now.getDate() + 3))
                    navigate('/search', {
                      state: {
                        pickupLocationId: shw._id,
                        dropOffLocationId: shw._id,
                        from: fromDate,
                        to: toDate,
                        pickupPlace: 'Sahiwal',
                      }
                    })
                  }
                }}
              >
                Browse Sahiwal Fleet
              </Button>
            </div>
          </div>
        </section>

        <div className="why">

          {/* <h1>{strings.WHY_TITLE}</h1> */}

          <div className="why-boxes">

            <div className="why-box">
              <div className="why-icon-wrapper">
                <RoomService className="why-icon" />
              </div>
              <div className="why-text-wrapper">
                <span className="why-title">{strings.WHY_SERVICE_TITLE}</span>
                <span className="why-text">{strings.WHY_SERVICE}</span>
              </div>
            </div>

            <div className="why-box">
              <div className="why-icon-wrapper">
                <VisibilityOff className="why-icon" />
              </div>
              <div className="why-text-wrapper">
                <span className="why-title">{strings.WHY_CHARGES_TITLE}</span>
                <span className="why-text">{strings.WHY_CHARGES}</span>
              </div>
            </div>

            <div className="why-box">
              <div className="why-icon-wrapper">
                <DirectionsCar className="why-icon" />
              </div>
              <div className="why-text-wrapper">
                <span className="why-title">{strings.WHY_FLEET_TITLE}</span>
                <span className="why-text">{strings.WHY_FLEET}</span>
              </div>
            </div>

            <div className="why-box">
              <div className="why-icon-wrapper">
                <Speed className="why-icon" />
              </div>
              <div className="why-text-wrapper">
                <span className="why-title">{strings.WHY_MILEAGE_TITLE}</span>
                <span className="why-text">{strings.WHY_MILEAGE}</span>
                <span className="why-text">{strings.WHY_MILEAGE_ASTERISK}</span>
              </div>
            </div>

          </div>
        </div>

        <div className="services">

          <h1>{strings.SERVICES_TITLE}</h1>

          <div className="services-boxes">

            <div className="services-box">
              <div className="services-icon-wrapper">
                <DirectionsCar className="services-icon" />
              </div>
              <div className="services-text-wrapper">
                <span className="services-title">{strings.SERVICES_FLEET_TITLE}</span>
                <span className="services-text">{strings.SERVICES_FLEET}</span>
              </div>
            </div>

            <div className="services-box">
              <div className="services-icon-wrapper">
                <Navigation className="services-icon" />
              </div>
              <div className="services-text-wrapper">
                <span className="services-title">{strings.SERVICES_FLEXIBLE_TITLE}</span>
                <span className="services-text">{strings.SERVICES_FLEXIBLE}</span>
              </div>
            </div>

            <div className="services-box">
              <div className="services-icon-wrapper">
                <AttachMoney className="services-icon" />
              </div>
              <div className="services-text-wrapper">
                <span className="services-title">{strings.SERVICES_PRICES_TITLE}</span>
                <span className="services-text">{strings.SERVICES_PRICES}</span>
              </div>
            </div>

            <div className="services-box">
              <div className="services-icon-wrapper">
                <Public className="services-icon" />
              </div>
              <div className="services-text-wrapper">
                <span className="services-title">{strings.SERVICES_BOOKING_ONLINE_TITLE}</span>
                <span className="services-text">{strings.SERVICES_BOOKING_ONLINE}</span>
              </div>
            </div>

            <div className="services-box">
              <div className="services-icon-wrapper">
                <FlashOn className="services-icon" />
              </div>
              <div className="services-text-wrapper">
                <span className="services-title">{strings.SERVICE_INSTANT_BOOKING_TITLE}</span>
                <span className="services-text">{strings.SERVICE_INSTANT_BOOKING}</span>
              </div>
            </div>

            <div className="services-box">
              <div className="services-icon-wrapper">
                <RoomService className="services-icon" />
              </div>
              <div className="services-text-wrapper">
                <span className="services-title">{strings.SERVICES_SUPPORT_TITLE}</span>
                <span className="services-text">{strings.SERVICES_SUPPORT}</span>
              </div>
            </div>

          </div>
        </div>

        <div className="home-suppliers" style={suppliers.length < 4 ? { margin: 0 } : undefined}>
          {suppliers.length > 3 && (
            <>
              <h1>{strings.SUPPLIERS_TITLE}</h1>
              <SupplierCarrousel suppliers={suppliers} />
            </>
          )}
        </div>

        {countries.length > 0 && (
          <div className="destinations">
            <h1>{strings.DESTINATIONS_TITLE}</h1>
            <div className="tabs">
              <Tabs
                value={tabValue}
                onChange={handleTabChange}
                aria-label="destinations"
                TabIndicatorProps={{ sx: { display: env.isMobile ? 'none' : null } }}
                sx={{
                  '& .MuiTabs-flexContainer': {
                    flexWrap: 'wrap',
                  },
                }}
              >
                {
                  countries.map((country, index) => (
                    <Tab key={country._id} label={country.name?.toUpperCase()} {...a11yProps(index)} />
                  ))
                }
              </Tabs>

              {
                countries.map((country, index) => (
                  <TabPanel key={country._id} value={tabValue} index={index}>
                    <LocationCarrousel
                      locations={country.locations!}
                      onSelect={(location) => {
                        setPickupLocation(location._id)
                        setOpenLocationSearchFormDialog(true)
                      }}
                    />
                  </TabPanel>
                ))
              }
            </div>
          </div>
        )}

        <div className="car-size">
          <h1>{strings.CAR_SIZE_TITLE}</h1>
          <p>{strings.CAR_SIZE_TEXT}</p>
          <div className="boxes">
            <div className="box">
              <div className="box-img">
                <img alt="Red compact hatchback, Unsplash photo" loading="lazy" decoding="async" src={carRangePhotos.mini} onError={(event) => {
 event.currentTarget.closest('.box-img')?.classList.add('is-image-unavailable'); event.currentTarget.remove() 
}} />
              </div>
              <div className="box-content">
                {/* <FormControlLabel
                  control={(
                    <Checkbox
                      defaultChecked
                      onChange={(e) => {
                        const _ranges = bookcarsHelper.cloneArray(ranges) || []
                        if (e.target.checked) {
                          _ranges.push(bookcarsTypes.CarRange.Mini)
                        } else {
                          _ranges.splice(_ranges.findIndex((r) => r === bookcarsTypes.CarRange.Mini), 1)
                        }
                        setRanges(_ranges)
                      }}
                    />
                  )}
                  label={strings.MINI}
                /> */}
                <span>{carsStrings.CAR_RANGE_MINI}</span>
              </div>
              <div className="car-size-action">
                <Button
                  variant="contained"
                  className="btn-primary btn-car-size"
                  aria-label="Search for a car"
                  onClick={() => {
                    setRanges([bookcarsTypes.CarRange.Mini])
                    setOpenRangeSearchFormDialog(true)
                  }}
                >
                  {strings.SEARCH_FOR_CAR}
                </Button>
              </div>
            </div>
            <div className="box">
              <div className="box-img">
                <img alt="Black sedan, Unsplash photo" loading="lazy" decoding="async" src={carRangePhotos.midi} onError={(event) => {
 event.currentTarget.closest('.box-img')?.classList.add('is-image-unavailable'); event.currentTarget.remove() 
}} />
              </div>
              <div className="box-content">
                {/* <FormControlLabel
                  control={(
                    <Checkbox
                      defaultChecked
                      onChange={(e) => {
                        const _ranges = bookcarsHelper.cloneArray(ranges) || []
                        if (e.target.checked) {
                          _ranges.push(bookcarsTypes.CarRange.Midi)
                        } else {
                          _ranges.splice(_ranges.findIndex((r) => r === bookcarsTypes.CarRange.Midi), 1)
                        }
                        setRanges(_ranges)
                      }}
                    />
                  )}
                  label={strings.MIDI}
                /> */}
                <span>{carsStrings.CAR_RANGE_MIDI}</span>
              </div>
              <div className="car-size-action">
                <Button
                  variant="contained"
                  className="btn-primary btn-car-size"
                  aria-label="Search for a car"
                  onClick={() => {
                    setRanges([bookcarsTypes.CarRange.Midi])
                    setOpenRangeSearchFormDialog(true)
                  }}
                >
                  {strings.SEARCH_FOR_CAR}
                </Button>
              </div>
            </div>
            <div className="box">
              <div className="box-img">
                <img alt="White SUV, Unsplash photo" loading="lazy" decoding="async" src={carRangePhotos.maxi} onError={(event) => {
 event.currentTarget.closest('.box-img')?.classList.add('is-image-unavailable'); event.currentTarget.remove() 
}} />
              </div>
              <div className="box-content">
                {/* <FormControlLabel
                  control={(
                    <Checkbox
                      onChange={(e) => {
                        const _ranges = bookcarsHelper.cloneArray(ranges) || []
                        if (e.target.checked) {
                          _ranges.push(bookcarsTypes.CarRange.Maxi)
                        } else {
                          _ranges.splice(_ranges.findIndex((r) => r === bookcarsTypes.CarRange.Maxi), 1)
                        }
                        setRanges(_ranges)
                      }}
                    />
                  )}
                  label={strings.MAXI}
                /> */}
                <span>{carsStrings.CAR_RANGE_MAXI}</span>
              </div>
              <div className="car-size-action">
                <Button
                  variant="contained"
                  className="btn-primary btn-car-size"
                  aria-label="Search for a car"
                  onClick={() => {
                    setRanges([bookcarsTypes.CarRange.Maxi])
                    setOpenRangeSearchFormDialog(true)
                  }}
                >
                  {strings.SEARCH_FOR_CAR}
                </Button>
              </div>
            </div>
          </div>
          {/* <Button
            variant="contained"
            className="btn-primary btn-home"
            disabled={ranges.length === 0}
            onClick={() => {
              setOpenRangeSearchFormDialog(true)
            }}
          >
            {strings.SEARCH_FOR_CAR}
          </Button> */}
        </div>
        <div className="faq">
          <FaqList />
        </div>

        <div className="home-map">
          <Map
            title={strings.MAP_TITLE}
            position={new L.LatLng(env.MAP_LATITUDE, env.MAP_LONGITUDE)}
            initialZoom={env.MAP_ZOOM}
            locations={locations}
            onSelelectPickUpLocation={async (locationId) => {
              setPickupLocation(locationId)
              if (sameLocation) {
                setDropOffLocation(locationId)
              } else {
                setSameLocation(dropOffLocation === locationId)
              }
              setOpenLocationSearchFormDialog(true)
            }}
          // onSelelectDropOffLocation={async (locationId) => {
          //   setDropOffLocation(locationId)
          //   setSameLocation(pickupLocation === locationId)
          //   helper.info(strings.MAP_DROP_OFF_SELECTED)
          // }}
          />
        </div>

        <div className="customer-care">
          <div className="customer-care-wrapper">
            <div className="customer-care-text">
              <h1>{strings.CUSTOMER_CARE_TITLE}</h1>
              <h2>{strings.CUSTOMER_CARE_SUBTITLE}</h2>
              <div className="customer-care-content">{strings.CUSTOMER_CARE_TEXT}</div>
              <div className="customer-care-boxes">
                <div className="customer-care-box">
                  <CheckBox className="customer-care-icon" />
                  <span>{strings.CUSTOMER_CARE_ASSISTANCE}</span>
                </div>
                <div className="customer-care-box">
                  <CheckBox className="customer-care-icon" />
                  <span>{strings.CUSTOMER_CARE_MODIFICATION}</span>
                </div>
                <div className="customer-care-box">
                  <CheckBox className="customer-care-icon" />
                  <span>{strings.CUSTOMER_CARE_GUIDANCE}</span>
                </div>
                <div className="customer-care-box">
                  <CheckBox className="customer-care-icon" />
                  <span>{strings.CUSTOMER_CARE_SUPPORT}</span>
                </div>
              </div>
              <Button
                variant="contained"
                className="btn-primary btn-home"
                onClick={() => navigate('/contact')}
              >
                {strings.CONTACT_US}
              </Button>
            </div>

            <div className="customer-care-img">
              <img src={carRangePhotos.midi} alt="Black sedan on a city street, Unsplash photo" loading="lazy" decoding="async" onError={(event) => {
 event.currentTarget.remove() 
}} />
            </div>
          </div>
        </div>
      </div>

      <Dialog
        // fullWidth={env.isMobile}
        maxWidth={false}
        open={openLocationSearchFormDialog}
        onClose={() => {
          setOpenLocationSearchFormDialog(false)
        }}
      >
        <DialogContent className="search-dialog-content">
          <SearchForm
            ranges={bookcarsHelper.getAllRanges()}
            pickupLocation={pickupLocation}
          // onCancel={() => {
          //   setOpenLocationSearchFormDialog(false)
          // }}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        // fullWidth={env.isMobile}
        maxWidth={false}
        open={openRangeSearchFormDialog}
        onClose={() => {
          setOpenRangeSearchFormDialog(false)
        }}
      >
        <DialogContent className="search-dialog-content">
          <SearchForm
            ranges={ranges}
          // onCancel={() => {
          //   setOpenRangeSearchFormDialog(false)
          // }}
          />
        </DialogContent>
      </Dialog>

      <Footer />
    </Layout>
  )
}

export default Home
