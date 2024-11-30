import React, { useState } from 'react'
import { Button, Checkbox, Dialog, DialogContent, FormControlLabel, Tab, Tabs } from '@mui/material'
import L from 'leaflet'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import env from '@/config/env.config'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/home'
import * as UserService from '@/services/UserService'
import * as SupplierService from '@/services/SupplierService'
import * as CountryService from '@/services/CountryService'
import * as LocationService from '@/services/LocationService'
import Layout from '@/components/Layout'
import SupplierCarrousel from '@/components/SupplierCarrousel'
import TabPanel, { a11yProps } from '@/components/TabPanel'
import LocationCarrousel from '@/components/LocationCarrousel'
import SearchForm from '@/components/SearchForm'
import Map from '@/components/Map'
import Footer from '@/components/Footer'

import Mini from '@/assets/img/mini.png'
import Midi from '@/assets/img/midi.png'
import Maxi from '@/assets/img/maxi.png'

import '@/assets/css/home.css'

const Home = () => {
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

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
  }

  const onLoad = async () => {
    let _suppliers = await SupplierService.getAllSuppliers()
    _suppliers = _suppliers.filter((supplier) => supplier.avatar && !/no-image/i.test(supplier.avatar))
    bookcarsHelper.shuffle(_suppliers)
    setSuppliers(_suppliers)
    const _countries = await CountryService.getCountriesWithLocations('', true, env.MIN_LOCATIONS)
    setCountries(_countries)
    const _locations = await LocationService.getLocationsWithPosition()
    setLocations(_locations)
  }

  const language = UserService.getLanguage()

  return (
    <Layout onLoad={onLoad} strict={false}>

      <div className="home">
        <div className="home-content">

          <div className="home-cover">{strings.COVER}</div>

          <div className="home-search">
            <SearchForm />
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
                TabIndicatorProps={{ sx: { display: env.isMobile() ? 'none' : null } }}
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
              <img alt="Mini" src={Mini} />
              <div className="box-content">
                <FormControlLabel
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
                />
                <ul>
                  <li>
                    <span className="price">{bookcarsHelper.formatPrice(2.5, commonStrings.CURRENCY, language)}</span>
                    <span className="unit"> · phr</span>
                  </li>
                  <li>
                    <span className="price">{bookcarsHelper.formatPrice(40, commonStrings.CURRENCY, language)}</span>
                    <span className="unit"> · pday</span>
                  </li>
                </ul>
              </div>
            </div>
            <div className="box">
              <img alt="Midi" src={Midi} />
              <div className="box-content">
                <FormControlLabel
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
                />
                <ul>
                  <li>
                    <span className="price">{bookcarsHelper.formatPrice(3.5, commonStrings.CURRENCY, language)}</span>
                    <span className="unit"> · phr</span>
                  </li>
                  <li>
                    <span className="price">{bookcarsHelper.formatPrice(50, commonStrings.CURRENCY, language)}</span>
                    <span className="unit"> · pday</span>
                  </li>
                </ul>
              </div>
            </div>
            <div className="box">
              <img alt="Maxi" src={Maxi} />
              <div className="box-content">
                <FormControlLabel
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
                />
                <ul>
                  <li>
                    <span className="price">{bookcarsHelper.formatPrice(4.5, commonStrings.CURRENCY, language)}</span>
                    <span className="unit"> · phr</span>
                  </li>
                  <li>
                    <span className="price">{bookcarsHelper.formatPrice(70, commonStrings.CURRENCY, language)}</span>
                    <span className="unit"> · pday</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <Button
            variant="contained"
            className="btn-primary btn-home"
            disabled={ranges.length === 0}
            onClick={() => {
              setOpenRangeSearchFormDialog(true)
            }}
          >
            {strings.SEARCH_FOR_CAR}
          </Button>
        </div>

        <div className="home-map">
          <Map
            title={strings.MAP_TITLE}
            position={new L.LatLng(34.0268755, 1.6528399999999976)}
            initialZoom={5}
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
      </div>

      <Dialog
        fullWidth={env.isMobile()}
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
            onCancel={() => {
              setOpenLocationSearchFormDialog(false)
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        fullWidth={env.isMobile()}
        maxWidth={false}
        open={openRangeSearchFormDialog}
        onClose={() => {
          setOpenRangeSearchFormDialog(false)
        }}
      >
        <DialogContent className="search-dialog-content">
          <SearchForm
            ranges={ranges}
            onCancel={() => {
              setOpenRangeSearchFormDialog(false)
            }}
          />
        </DialogContent>
      </Dialog>

      <Footer />
    </Layout>
  )
}

export default Home
