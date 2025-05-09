import React, { useCallback, useEffect, useState } from 'react'
import { Box, Dialog, DialogContent, DialogTitle, IconButton } from '@mui/material'
import { Close as CloseIcon } from '@mui/icons-material'
import * as bookcarsTypes from ':bookcars-types'
import env from '@/config/env.config'
import Map from '@/components/Map'

import '@/assets/css/map-dialog.css'

interface MapDialogProps {
  location?: bookcarsTypes.Location | { latitude: number, longitude: number }
  open?: boolean
  zoom?: number
  radius?: number
  onClose: () => void
}

const MapDialog = ({
  location,
  open: openProp = false,
  zoom = 10,
  radius,
  onClose,
}: MapDialogProps) => {
  const [openMapDialog, setOpenMapDialog] = useState(openProp)

  useEffect(() => {
    setOpenMapDialog(openProp)
  }, [openProp])

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
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
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
        {location && (
          <Map
            location={location}
            zoom={zoom}
            radius={radius}
            className="map"
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

export default MapDialog
