import React from 'react'
import Slider from 'react-slick'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import env from '../config/env.config'

import 'slick-carousel/slick/slick.css'
import 'slick-carousel/slick/slick-theme.css'
import '../assets/css/supplier-carrousel.css'

interface SupplierCarrouselProps {
  suppliers: bookcarsTypes.User[]
}

const settings = {
  infinite: true,
  speed: 3 * 1000,
  slidesToShow: env.isMobile() ? 2 : 6,
  autoplay: true,
  autoplaySpeed: 3 * 1000,
  centerMode: true,
  arrows: false,
  dots: false,
  touchMove: false,
  centerPadding: '64px',
}

const SupplierCarrousel = ({ suppliers }: SupplierCarrouselProps) => (
  <Slider {...settings} className="supplier-carrousel">
    {
      suppliers.map((supplier) => (
        <div key={supplier._id}>
          <div key={supplier._id} className="supplier-container">
            <img src={bookcarsHelper.joinURL(env.CDN_USERS, supplier.avatar)} alt={supplier.fullName} title={supplier.fullName} />
          </div>
        </div>
      ))
    }
  </Slider>
)

export default SupplierCarrousel
