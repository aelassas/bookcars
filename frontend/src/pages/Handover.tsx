import React, { useEffect, useState } from 'react'
import { Alert, Card, CardContent, Typography } from '@mui/material'
import Layout from '@/components/Layout'
import * as HandoverService from '@/services/HandoverService'
import * as helper from '@/utils/helper'

const Handover = () => {
  const bookingId = new URLSearchParams(window.location.search).get('booking') || ''
  const [handover, setHandover] = useState<any>(null)

  useEffect(() => {
    if (!bookingId) {
      return
    }
    HandoverService.getByBooking(bookingId).then(setHandover).catch(helper.error)
  }, [bookingId])

  return (
    <Layout strict>
      <Card sx={{ maxWidth: 700, mx: 'auto', mt: 4 }}><CardContent>
        <Typography variant="h4">Digital handover</Typography>
        {!bookingId && <Alert severity="warning">Open handover from a booking.</Alert>}
        {bookingId && !handover && <Alert severity="info">No handover checklist is available yet.</Alert>}
        {handover && (
          <>
            <Alert severity={handover.status === 'completed' ? 'success' : 'info'} sx={{ my: 2 }}>Status: {handover.status}</Alert>
            {handover.damageNotes && <Typography>Damage notes: {handover.damageNotes}</Typography>}
            {handover.odometerAtPickup !== undefined && <Typography>Pickup odometer: {handover.odometerAtPickup}</Typography>}
            {handover.fuelLevelAtPickup !== undefined && <Typography>Pickup fuel: {handover.fuelLevelAtPickup}%</Typography>}
            {handover.fuelLevelLabel && <Typography>Pickup fuel: {handover.fuelLevelLabel}</Typography>}
            {typeof handover.spareTirePresent === 'boolean' && <Typography>Spare tire: {handover.spareTirePresent ? 'Present' : 'Missing'}</Typography>}
          </>
        )}
      </CardContent></Card>
    </Layout>
  )
}

export default Handover
