import React, { useState } from 'react'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import env from '@/config/env.config'
import Slick from '@/components/Slick'

import '@/assets/css/supplier-carrousel.css'

interface SupplierCarrouselProps {
  suppliers: bookcarsTypes.User[]
}

const settings = {
  infinite: false,
  speed: 500,
  slidesToShow: env.isMobile ? 2 : 4,
  autoplay: false,
  autoplaySpeed: 3 * 1000,
  centerMode: false,
  arrows: false,
  dots: false,
  touchMove: true,
  centerPadding: '0px',
  pauseOnHover: false,
}

const SupplierCarrousel = ({ suppliers }: SupplierCarrouselProps) => {
  const [unavailableImages, setUnavailableImages] = useState<Set<string>>(() => new Set())

  return (
    <Slick {...settings} className="supplier-carrousel" responsive={[
      { breakpoint: 960, settings: { slidesToShow: Math.min(2, suppliers.length || 1) } },
      { breakpoint: 600, settings: { slidesToShow: 1 } },
    ]}>
      {
        suppliers.map((supplier) => {
          const supplierId = String(supplier._id || supplier.email || supplier.fullName)
          return (
          <div key={supplierId}>
            <div className="supplier-container">
              {supplier.avatar && !unavailableImages.has(supplierId)
                ? <img src={bookcarsHelper.joinURL(env.CDN_USERS, supplier.avatar)} alt={supplier.fullName} title={supplier.fullName} loading="lazy" onError={() => setUnavailableImages((current) => new Set(current).add(supplierId))} />
                : <span className="supplier-image-fallback" aria-hidden="true">{supplier.fullName.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}</span>}
            </div>
            <p className="supplier-name" title={supplier.fullName}>{supplier.fullName}</p>
          </div>
          )
        })
      }
    </Slick>
  )
}

export default SupplierCarrousel
