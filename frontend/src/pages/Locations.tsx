import React from 'react'
import Layout from '../components/Layout'
import Map from '../components/Map'
import Footer from '../components/Footer'

import '../assets/css/locations.css'

const Locations = () => {
  const onLoad = () => {
  }

  return (
    <Layout onLoad={onLoad} strict={false}>
      <div className="locations">
        <Map className="map" initialZoom={4.5} />
      </div>
      <Footer />
    </Layout>
  )
}

export default Locations
