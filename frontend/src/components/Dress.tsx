import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Card,
  CardContent,
  CardMedia,
  Typography,
  Button,
  Chip,
  Box
} from '@mui/material'
import { Dress as DressType } from ':bookcars-types'
import * as helper from '../common/helper'
import { strings } from '../lang/dresses'
import env from '../config/env.config'

interface DressProps {
  dress: DressType
  hideSupplier?: boolean
  hidePrice?: boolean
  from?: Date
  to?: Date
  locationId?: string
}

const Dress: React.FC<DressProps> = ({
  dress,
  hideSupplier,
  hidePrice,
  from,
  to,
  locationId
}) => {
  const navigate = useNavigate()

  const handleRent = () => {
    if (from && to && locationId) {
      navigate(`/checkout?dr=${dress._id}&from=${from.getTime()}&to=${to.getTime()}&loc=${locationId}`)
    }
  }

  const handleView = () => {
    navigate(`/dress/${dress._id}`)
  }

  return (
    <Card className="dress-card">
      <CardMedia
        component="img"
        height="200"
        image={dress.image ? helper.joinURL(env.CDN_DRESSES, dress.image) : '/placeholder.jpg'}
        alt={dress.name}
      />
      <CardContent>
        <Typography variant="h5" component="div">
          {dress.name}
        </Typography>

        {!hideSupplier && dress.supplier && (
          <Typography variant="body2" color="text.secondary">
            {strings.SUPPLIER}: {typeof dress.supplier === 'object' ? dress.supplier.fullName : ''}
          </Typography>
        )}

        {dress.rentals !== undefined && dress.rentals > 0 && (
          <Typography variant="body2" color="text.secondary">
            {strings.RENTALS_COUNT || 'Rentals'}: {dress.rentals}
          </Typography>
        )}

        <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip
            label={helper.getDressTypeLabel(dress.type)}
            color="primary"
            size="small"
          />
          <Chip
            label={helper.getDressSizeLabel(dress.size)}
            color="secondary"
            size="small"
          />
          <Chip
            label={helper.getDressStyleLabel(dress.style)}
            variant="outlined"
            size="small"
          />
          <Chip
            label={dress.color}
            variant="outlined"
            size="small"
          />
        </Box>

        {!hidePrice && (
          <Typography variant="h6" color="text.primary" sx={{ mt: 2 }}>
            ${dress.price} / {strings.DAY}
          </Typography>
        )}

        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
          <Button
            variant="outlined"
            onClick={handleView}
          >
            {strings.VIEW_DETAILS}
          </Button>

          {from && to && locationId && dress.available && (
            <Button
              variant="contained"
              color="primary"
              onClick={handleRent}
            >
              {strings.RENT_NOW}
            </Button>
          )}
        </Box>
      </CardContent>
    </Card>
  )
}

export default Dress
