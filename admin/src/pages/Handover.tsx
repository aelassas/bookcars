import React, { useState } from 'react'
import { Alert, Button, Card, CardContent, MenuItem, Select, TextField, Typography } from '@mui/material'
import Layout from '@/components/Layout'
import * as HandoverService from '@/services/HandoverService'
import * as helper from '@/utils/helper'

const Handover = () => {
  const bookingId = new URLSearchParams(window.location.search).get('booking') || ''
  const [status, setStatus] = useState('scheduled')
  const [odometer, setOdometer] = useState('')
  const [fuel, setFuel] = useState('')
  const [damageNotes, setDamageNotes] = useState('')
  const [odometerReturn, setOdometerReturn] = useState('')
  const [fuelReturn, setFuelReturn] = useState('')
  const [customerSignature, setCustomerSignature] = useState('')
  const [supplierSignature, setSupplierSignature] = useState('')
  const [photos, setPhotos] = useState<string[]>([])
  const [message, setMessage] = useState('')

  const submit = async () => {
    if (!bookingId) {
      setMessage('Open handover from a booking.')
      return
    }
    try {
      let uploadedPhotos = photos
      const input = document.querySelector<HTMLInputElement>('#handover-photos')
      if (input?.files?.length) {
        const result = await HandoverService.uploadPhotos(Array.from(input.files))
        uploadedPhotos = [...uploadedPhotos, ...result.photos]
      }
      await HandoverService.upsert({
        booking: bookingId,
        status: status as 'scheduled' | 'in_progress' | 'completed' | 'cancelled',
        odometerAtPickup: odometer ? Number(odometer) : undefined,
        fuelLevelAtPickup: fuel ? Number(fuel) : undefined,
        checklistAtPickup: { exterior: true, interior: true, documents: true, keys: true },
        odometerAtReturn: odometerReturn ? Number(odometerReturn) : undefined,
        fuelLevelAtReturn: fuelReturn ? Number(fuelReturn) : undefined,
        checklistAtReturn: { exterior: true, interior: true, keys: true, fuel: true },
        pickupPhotos: uploadedPhotos,
        returnPhotos: uploadedPhotos,
        customerSignature,
        supplierSignature,
        damageNotes,
      })
      setMessage('Digital handover checklist saved.')
    } catch (error) {
      helper.error(error)
    }
  }

  return (
    <Layout admin strict>
      <Typography variant="h4">Digital handover</Typography>
      {!bookingId && <Alert severity="warning">Open digital handover from a booking detail page.</Alert>}
      <Card sx={{ mt: 2 }}><CardContent>
        <Select fullWidth value={status} onChange={(event) => setStatus(event.target.value)}>
          <MenuItem value="scheduled">Scheduled</MenuItem>
          <MenuItem value="in_progress">In progress</MenuItem>
          <MenuItem value="completed">Completed</MenuItem>
          <MenuItem value="cancelled">Cancelled</MenuItem>
        </Select>
        <TextField fullWidth sx={{ mt: 2 }} type="number" label="Pickup odometer" value={odometer} onChange={(event) => setOdometer(event.target.value)} />
        <TextField fullWidth sx={{ mt: 2 }} type="number" label="Pickup fuel (%)" value={fuel} onChange={(event) => setFuel(event.target.value)} />
        <TextField fullWidth sx={{ mt: 2 }} type="number" label="Return odometer" value={odometerReturn} onChange={(event) => setOdometerReturn(event.target.value)} />
        <TextField fullWidth sx={{ mt: 2 }} type="number" label="Return fuel (%)" value={fuelReturn} onChange={(event) => setFuelReturn(event.target.value)} />
        <TextField fullWidth sx={{ mt: 2 }} label="Customer signature" value={customerSignature} onChange={(event) => setCustomerSignature(event.target.value)} />
        <TextField fullWidth sx={{ mt: 2 }} label="Supplier signature" value={supplierSignature} onChange={(event) => setSupplierSignature(event.target.value)} />
        <TextField id="handover-photos" fullWidth sx={{ mt: 2 }} type="file" label="Handover photos" InputLabelProps={{ shrink: true }} inputProps={{ accept: 'image/jpeg,image/png,image/webp', multiple: true }} />
        <TextField fullWidth multiline minRows={3} sx={{ mt: 2 }} label="Damage notes" value={damageNotes} onChange={(event) => setDamageNotes(event.target.value)} />
        <Button sx={{ mt: 2 }} variant="contained" className="btn-primary" onClick={submit}>Save handover</Button>
        {message && <Alert sx={{ mt: 2 }} severity="info">{message}</Alert>}
      </CardContent></Card>
    </Layout>
  )
}

export default Handover
