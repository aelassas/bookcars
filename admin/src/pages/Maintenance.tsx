import React, { useCallback, useEffect, useState } from 'react'
import { Alert, Button, Card, CardContent, FormControl, InputLabel, MenuItem, Select, TextField, Typography } from '@mui/material'
import * as bookcarsTypes from ':bookcars-types'
import Layout from '@/components/Layout'
import * as CarService from '@/services/CarService'
import * as MaintenanceService from '@/services/MaintenanceService'
import * as helper from '@/utils/helper'
import { parseKarachiDate } from '@/utils/timezone'

import '@/assets/css/maintenance.css'

const Maintenance = () => {
  const [vehicle, setVehicle] = useState<bookcarsTypes.Car>()
  const [rows, setRows] = useState<bookcarsTypes.Maintenance[]>([])
  const [type, setType] = useState<bookcarsTypes.MaintenanceType>('general_inspection')
  const [status, setStatus] = useState<bookcarsTypes.MaintenanceStatus>('reported')
  const [startDate, setStartDate] = useState('')
  const [expectedCompletionDate, setExpectedCompletionDate] = useState('')
  const [description, setDescription] = useState('')
  const [cost, setCost] = useState('')
  const [message, setMessage] = useState('')

  const vehicleId = new URLSearchParams(window.location.search).get('cr')

  const load = useCallback(async () => {
    if (!vehicleId) {
      return
    }
    try {
      const [car, maintenance] = await Promise.all([CarService.getCar(vehicleId), MaintenanceService.getByVehicle(vehicleId)])
      setVehicle(car)
      setRows(maintenance)
    } catch (error) {
      helper.error(error)
    }
  }, [vehicleId])

  useEffect(() => {
    load()
  }, [load])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!vehicleId || !startDate || !expectedCompletionDate) {
      setMessage('Vehicle and maintenance dates are required.')
      return
    }
    try {
      await MaintenanceService.create({
        vehicle: vehicleId,
        type,
        status,
        startDate: parseKarachiDate(startDate),
        expectedCompletionDate: parseKarachiDate(expectedCompletionDate),
        description,
        cost: cost ? Number(cost) : undefined,
      })
      setMessage('Maintenance record created.')
      setDescription('')
      setCost('')
      await load()
    } catch (error) {
      helper.error(error)
    }
  }

  return (
    <Layout admin strict>
      <div className="maintenance-page">
        <Typography variant="h4">Maintenance management</Typography>
        {vehicle && <Typography color="text.secondary">{vehicle.name} {vehicle.licensePlate ? `(${vehicle.licensePlate})` : ''}</Typography>}
        {!vehicleId && <Alert severity="warning">Open maintenance from a vehicle detail page.</Alert>}
        <Card>
          <CardContent>
            <form onSubmit={submit} className="maintenance-form">
              <FormControl fullWidth>
                <InputLabel>Maintenance type</InputLabel>
                <Select value={type} label="Maintenance type" onChange={(event) => setType(event.target.value as bookcarsTypes.MaintenanceType)}>
                  <MenuItem value="oil_change">Oil change</MenuItem>
                  <MenuItem value="tire_service">Tire service</MenuItem>
                  <MenuItem value="engine_service">Engine service</MenuItem>
                  <MenuItem value="registration_renewal">Registration renewal</MenuItem>
                  <MenuItem value="insurance_renewal">Insurance renewal</MenuItem>
                  <MenuItem value="fitness_renewal">Fitness renewal</MenuItem>
                  <MenuItem value="accident_repair">Accident repair</MenuItem>
                  <MenuItem value="general_inspection">General inspection</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select value={status} label="Status" onChange={(event) => setStatus(event.target.value as bookcarsTypes.MaintenanceStatus)}>
                  <MenuItem value="reported">Reported</MenuItem>
                  <MenuItem value="scheduled">Scheduled</MenuItem>
                  <MenuItem value="in_progress">In progress</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="cancelled">Cancelled</MenuItem>
                </Select>
              </FormControl>
              <TextField fullWidth type="date" label="Start date" InputLabelProps={{ shrink: true }} value={startDate} onChange={(event) => setStartDate(event.target.value)} />
              <TextField fullWidth type="date" label="Expected completion" InputLabelProps={{ shrink: true }} value={expectedCompletionDate} onChange={(event) => setExpectedCompletionDate(event.target.value)} />
              <TextField fullWidth label="Description" value={description} onChange={(event) => setDescription(event.target.value)} />
              <TextField fullWidth type="number" label="Cost (PKR)" value={cost} onChange={(event) => setCost(event.target.value)} inputProps={{ min: 0 }} />
              <Button type="submit" variant="contained" className="btn-primary" disabled={!vehicleId}>Create maintenance record</Button>
            </form>
          </CardContent>
        </Card>
        {message && <Alert severity="info">{message}</Alert>}
        <Card>
          <CardContent>
            <Typography variant="h6">Vehicle maintenance history</Typography>
            {rows.length === 0 && <Typography color="text.secondary">No maintenance records.</Typography>}
            {rows.map((row) => (
              <div className="maintenance-row" key={row._id}>
                <strong>{row.type.replace(/_/g, ' ')}</strong>
                <span>{row.status}</span>
                <span>{new Date(row.startDate).toLocaleDateString()} - {new Date(row.expectedCompletionDate).toLocaleDateString()}</span>
                {row.cost !== undefined && <span>PKR {row.cost.toLocaleString()}</span>}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}

export default Maintenance
