import React, { useCallback, useEffect, useState } from 'react'
import { Box, Dialog, DialogContent, DialogTitle, IconButton } from '@mui/material'
import { Close as CloseIcon } from '@mui/icons-material'
import * as bookcarsTypes from ':bookcars-types'
import env from '@/config/env.config'
import Map from '@/components/Map'

import '@/assets/css/map-dialog.css'

interface MapDialogProps {
  pickupLocation?: bookcarsTypes.Location
  openMapDialog: boolean
  onClose: () => void
}

const MapDialog = ({
  pickupLocation,
  openMapDialog: openMapDialogProp,
  onClose,
}: MapDialogProps) => {
  const [openMapDialog, setOpenMapDialog] = useState(openMapDialogProp)

  useEffect(() => {
    setOpenMapDialog(openMapDialogProp)
  }, [openMapDialogProp])

  const close = useCallback(() => {
    setOpenMapDialog(false)
    if (onClose) {
      onClose()
    }
  }, [onClose])

  return (
    <Dialog
      fullWidth={env.isMobile}
      maxWidth={false}
      open={openMapDialog}
      onClose={() => {
        close()
      }}
      sx={{
        '& .MuiDialog-container': {
          '& .MuiPaper-root': {
            width: '95%',
            height: '95%',
          },
          '& .MuiDialogTitle-root': {
            padding: 0,
            backgroundColor: '#1a1a1a',
          },
          '& .MuiDialogContent-root': {
            padding: 0,
          }
        },
      }}
    >
      <DialogTitle>
        <Box display="flex" justifyContent="flex-end">
          <Box>
            <IconButton
              className="close-btn"
              onClick={() => {
                close()
              }}
            >
              <CloseIcon className="close-icon" />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>
      <DialogContent className="map-dialog-content">
        {pickupLocation && (
          <Map
            position={[pickupLocation.latitude || 36.191113, pickupLocation.longitude || 44.009167]}
            initialZoom={pickupLocation.latitude && pickupLocation.longitude ? 10 : 2.5}
            locations={[pickupLocation]}
            parkingSpots={pickupLocation.parkingSpots}
            className="map"
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

export default MapDialog
