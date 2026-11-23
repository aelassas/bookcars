import React, { useCallback, useEffect, useState } from 'react'
import { Alert, Button, Card, CardContent, FormControl, InputLabel, MenuItem, Select, TextField, Typography } from '@mui/material'
import * as bookcarsTypes from ':bookcars-types'
import Layout from '@/components/Layout'
import * as CarService from '@/services/CarService'
import * as VehicleDocumentService from '@/services/VehicleDocumentService'
import * as helper from '@/utils/helper'
import { parseKarachiDate } from '@/utils/timezone'

const labels: Record<bookcarsTypes.VehicleDocumentType, string> = {
  registration: 'Registration',
  insurance: 'Insurance',
  token_tax: 'Token tax',
  fitness_certificate: 'Fitness certificate',
  driver_license: 'Driver license',
}

const VehicleDocuments = () => {
  const vehicleId = new URLSearchParams(window.location.search).get('cr')
  const [vehicle, setVehicle] = useState<bookcarsTypes.Car>()
  const [rows, setRows] = useState<bookcarsTypes.VehicleDocument[]>([])
  const [type, setType] = useState<bookcarsTypes.VehicleDocumentType>('registration')
  const [expiryDate, setExpiryDate] = useState('')
  const [status, setStatus] = useState<bookcarsTypes.VehicleDocumentStatus>('pending')
  const [notes, setNotes] = useState('')
  const [message, setMessage] = useState('')

  const load = useCallback(async () => {
    if (!vehicleId) return
    try {
      const [car, documents] = await Promise.all([CarService.getCar(vehicleId), VehicleDocumentService.getByVehicle(vehicleId)])
      setVehicle(car)
      setRows(documents)
    } catch (error) {
      helper.error(error)
    }
  }, [vehicleId])

  useEffect(() => { load() }, [load])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!vehicleId || !expiryDate) {
      setMessage('Vehicle and expiry date are required.')
      return
    }
    try {
      await VehicleDocumentService.upsert({ vehicle: vehicleId, type, status, expiryDate: parseKarachiDate(expiryDate), notes })
      setMessage('Vehicle document saved.')
      await load()
    } catch (error) {
      helper.error(error)
    }
  }

  return (
    <Layout admin strict>
      <div className="maintenance-page">
        <Typography variant="h4">Vehicle documents</Typography>
        {vehicle && <Typography color="text.secondary">{vehicle.name} {vehicle.licensePlate ? `(${vehicle.licensePlate})` : ''}</Typography>}
        {!vehicleId && <Alert severity="warning">Open vehicle documents from a vehicle detail page.</Alert>}
        <Card><CardContent>
          <form onSubmit={submit} className="maintenance-form">
            <FormControl fullWidth><InputLabel>Document type</InputLabel><Select value={type} label="Document type" onChange={(event) => setType(event.target.value as bookcarsTypes.VehicleDocumentType)}>
              {Object.entries(labels).map(([value, label]) => <MenuItem value={value} key={value}>{label}</MenuItem>)}
            </Select></FormControl>
            <TextField fullWidth type="date" label="Expiry date" InputLabelProps={{ shrink: true }} value={expiryDate} onChange={(event) => setExpiryDate(event.target.value)} />
            <FormControl fullWidth><InputLabel>Verification status</InputLabel><Select value={status} label="Verification status" onChange={(event) => setStatus(event.target.value as bookcarsTypes.VehicleDocumentStatus)}>
              <MenuItem value="pending">Pending</MenuItem><MenuItem value="verified">Verified</MenuItem><MenuItem value="expired">Expired</MenuItem>
            </Select></FormControl>
            <TextField fullWidth label="Notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
            <Button type="submit" variant="contained" className="btn-primary" disabled={!vehicleId}>Save document</Button>
          </form>
        </CardContent></Card>
        {message && <Alert severity="info">{message}</Alert>}
        <Card><CardContent>
          <Typography variant="h6">Expiry tracking</Typography>
          {rows.length === 0 && <Typography color="text.secondary">No vehicle documents recorded.</Typography>}
          {rows.map((row) => {
            const expiry = new Date(row.expiryDate)
            const days = Math.ceil((expiry.getTime() - Date.now()) / 86400000)
            const severity = days < 0 ? 'error' : days <= 30 ? 'warning' : 'success'
            return <Alert severity={severity} key={row._id} sx={{ mb: 1 }}><strong>{labels[row.type]}</strong> — {expiry.toLocaleDateString()} ({days < 0 ? 'Expired' : `${days} days remaining`})</Alert>
          })}
        </CardContent></Card>
      </div>
    </Layout>
  )
}

export default VehicleDocuments
