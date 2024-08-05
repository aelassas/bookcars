import React, { useState } from 'react'
import { Dialog, DialogContent, Tab, Tabs } from '@mui/material'
import L from 'leaflet'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import env from '../config/env.config'
import { strings } from '../lang/home'
import * as SupplierService from '../services/SupplierService'
import * as CountryService from '../services/CountryService'
import * as LocationService from '../services/LocationService'
import Layout from '../components/Layout'
import SupplierCarrousel from '../components/SupplierCarrousel'
import TabPanel, { a11yProps } from '../components/TabPanel'
import LocationCarrousel from '../components/LocationCarrousel'
import SearchForm from '../components/SearchForm'
import Map from '../components/Map'
import Footer from '../components/Footer'

import '../assets/css/home.css'

const Home = () => {
  const [suppliers, setSuppliers] = useState<bookcarsTypes.User[]>([])
  const [countries, setCountries] = useState<bookcarsTypes.CountryInfo[]>([])
  const [pickupLocation, setPickupLocation] = useState('')
  const [dropOffLocation, setDropOffLocation] = useState('')
  const [sameLocation, setSameLocation] = useState(true)
  const [tabValue, setTabValue] = useState(0)
  const [openSearchFormDialog, setOpenSearchFormDialog] = useState(false)
  const [locations, setLocations] = useState<bookcarsTypes.Location[]>([])

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

  return (
    <Layout onLoad={onLoad} strict={false}>

      <div className="home">
        <div className="home-content">

          <div className="home-cover">{strings.COVER}</div>

          <div className="home-search">
            <SearchForm />
          </div>

        </div>

        <div className="suppliers">
          {suppliers.length > 0 && (
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
                        setOpenSearchFormDialog(true)
                      }}
                    />
                  </TabPanel>
                ))
              }
            </div>
          </div>
        )}

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
              setOpenSearchFormDialog(true)
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
        open={openSearchFormDialog}
        onClose={() => {
          setOpenSearchFormDialog(false)
        }}
      >
        <DialogContent className="search-dialog-content">
          <SearchForm
            ranges={bookcarsHelper.getAllRanges()}
            pickupLocation={pickupLocation}
            onCancel={() => {
              setOpenSearchFormDialog(false)
            }}
          />
        </DialogContent>
      </Dialog>

      <Footer />
    </Layout>
  )
}

export default Home
