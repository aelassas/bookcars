import React from 'react'
import { strings } from '@/lang/view-on-map-button'

import ViewOnMap from '@/assets/img/view-on-map.png'

import '@/assets/css/view-on-map-button.css'

interface ViewOnMapButtonProps {
  onClick: (e?: React.MouseEvent<HTMLButtonElement>) => void
}

const ViewOnMapButton = ({ onClick }: ViewOnMapButtonProps) => (
  <button
    type="button"
    onClick={onClick}
    className="view-on-map"
  >
    <img alt="View On Map" src={ViewOnMap} />
    <span>{strings.VIEW_ON_MAP}</span>
  </button>
)

export default ViewOnMapButton
