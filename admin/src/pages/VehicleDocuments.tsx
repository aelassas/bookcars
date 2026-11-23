import React, { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography
} from '@mui/material'
import {
  FolderShared as DocIcon,
  VerifiedUser as VerifiedIcon,
  WarningAmber as WarningIcon,
  DirectionsCar as CarIcon
} from '@mui/icons-material'
import * as bookcarsTypes from ':bookcars-types'
import Layout from '@/components/Layout'
import * as CarService from '@/services/CarService'
import * as VehicleDocumentService from '@/services/VehicleDocumentService'
import * as helper from '@/utils/helper'
import { parseKarachiDate } from '@/utils/timezone'

const labels: Record<bookcarsTypes.VehicleDocumentType, string> = {
  registration: 'Registration / Smart Card',
  insurance: 'Insurance Policy',
  token_tax: 'Token Tax Certificate',
  fitness_certificate: 'Fitness Certificate',
  driver_license: 'Driver License',
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
    if (!vehicleId) {
return
}
    try {
      const [car, documents] = await Promise.all([CarService.getCar(vehicleId), VehicleDocumentService.getByVehicle(vehicleId)])
      setVehicle(car)
      setRows(documents)
    } catch (error) {
      helper.error(error)
    }
  }, [vehicleId])

  useEffect(() => {
 load() 
}, [load])

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
      <div className="maintenance-page" style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 20px 48px' }}>
        {/* Header */}
        <Box sx={{ mb: 3 }}>
          <span className="operations-eyebrow" style={{ color: 'var(--sr-emerald)', fontWeight: 800, fontSize: 11, letterSpacing: '0.1em' }}>
            SAFARRENT • VEHICLE COMPLIANCE VAULT
          </span>
          <Typography variant="h4" sx={{ fontWeight: 800, color: 'var(--sr-text, #0F172A)', letterSpacing: '-0.02em', mt: 0.5, mb: 0.5 }}>
            Smart Card & Tax Vault
          </Typography>
          {vehicle ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 1 }}>
              <Chip
                icon={<CarIcon fontSize="small" />}
                label={vehicle.name}
                sx={{ fontWeight: 700, bgcolor: 'rgba(5, 150, 105, 0.1)', color: 'var(--sr-emerald)' }}
              />
              {vehicle.licensePlate && (
                <Chip
                  label={vehicle.licensePlate}
                  variant="outlined"
                  sx={{ fontWeight: 800, fontFamily: 'var(--sr-font-mono, monospace)', letterSpacing: '0.06em' }}
                />
              )}
            </Box>
          ) : (
            <Typography color="text.secondary">Upload and audit vehicle registration, token tax, and fitness documents.</Typography>
          )}
        </Box>

        {!vehicleId && <Alert severity="warning" sx={{ mb: 3 }}>Select a vehicle from the Vehicle Fleet list to manage its documents.</Alert>}

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '420px 1fr' }, gap: 3 }}>
          {/* Left Column: Form */}
          <Card sx={{ borderRadius: '14px', border: '1px solid var(--sr-border, #E2E8F0)', height: 'fit-content' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <DocIcon fontSize="small" sx={{ color: 'var(--sr-emerald)' }} /> Record Document
              </Typography>
              <form onSubmit={submit} className="maintenance-form" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Document type</InputLabel>
                  <Select value={type} label="Document type" onChange={(event) => setType(event.target.value as bookcarsTypes.VehicleDocumentType)}>
                    {Object.entries(labels).map(([value, label]) => <MenuItem value={value} key={value}>{label}</MenuItem>)}
                  </Select>
                </FormControl>
                <TextField
                  fullWidth
                  size="small"
                  type="date"
                  label="Expiry date"
                  InputLabelProps={{ shrink: true }}
                  value={expiryDate}
                  onChange={(event) => setExpiryDate(event.target.value)}
                />
                <FormControl fullWidth size="small">
                  <InputLabel>Verification status</InputLabel>
                  <Select value={status} label="Verification status" onChange={(event) => setStatus(event.target.value as bookcarsTypes.VehicleDocumentStatus)}>
                    <MenuItem value="pending">Pending Audit</MenuItem>
                    <MenuItem value="verified">Verified Official</MenuItem>
                    <MenuItem value="expired">Expired / Renewal Due</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  fullWidth
                  size="small"
                  label="Notes / Excise Verification ID"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                />
                <Button
                  type="submit"
                  variant="contained"
                  className="btn-primary"
                  disabled={!vehicleId}
                  sx={{
                    bgcolor: '#107487',
                    '&:hover': { bgcolor: '#047857' },
                    py: 1,
                    fontWeight: 700,
                    textTransform: 'none',
                    borderRadius: '8px'
                  }}
                >
                  Save Document
                </Button>
              </form>
              {message && <Alert severity="info" sx={{ mt: 2 }}>{message}</Alert>}
            </CardContent>
          </Card>

          {/* Right Column: Expiry Tracking Cards */}
          <Card sx={{ borderRadius: '14px', border: '1px solid var(--sr-border, #E2E8F0)' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <VerifiedIcon fontSize="small" sx={{ color: 'var(--sr-emerald)' }} /> Document Expiry Tracking
                </Typography>
                <Chip
                  label={`${rows.length} Registered`}
                  size="small"
                  sx={{ fontFamily: 'var(--sr-font-mono, monospace)', fontWeight: 700 }}
                />
              </Box>

              {rows.length === 0 ? (
                <Box sx={{ p: 4, textAlign: 'center', bgcolor: 'rgba(0,0,0,0.02)', borderRadius: '10px' }}>
                  <Typography color="text.secondary">No compliance documents recorded for this vehicle.</Typography>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {rows.map((row) => {
                    const expiry = new Date(row.expiryDate)
                    const days = Math.ceil((expiry.getTime() - Date.now()) / 86400000)
                    const isExpired = days < 0
                    const isExpiringSoon = days >= 0 && days <= 30
                    const countdownLabel = isExpired ? 'Expired 🛑' : isExpiringSoon ? `${days}d remaining ⚠️` : `${days}d valid ✓`
                    const countdownColor = isExpired ? '#DC2626' : isExpiringSoon ? '#D97706' : '#059669'
                    const countdownBg = isExpired ? 'rgba(220, 38, 38, 0.1)' : isExpiringSoon ? 'rgba(217, 119, 6, 0.1)' : 'rgba(5, 150, 105, 0.1)'
                    const countdownBorder = isExpired ? 'rgba(220, 38, 38, 0.3)' : isExpiringSoon ? 'rgba(217, 119, 6, 0.3)' : 'rgba(5, 150, 105, 0.3)'

                    return (
                      <Box
                        key={row._id}
                        sx={{
                          p: 2,
                          borderRadius: '10px',
                          border: '1px solid var(--sr-border, #E2E8F0)',
                          bgcolor: 'var(--sr-surface-raised, #F8FAFC)',
                          display: 'flex',
                          flexDirection: { xs: 'column', sm: 'row' },
                          justifyContent: 'space-between',
                          alignItems: { xs: 'flex-start', sm: 'center' },
                          gap: 1.5
                        }}
                      >
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'var(--sr-text, #0F172A)' }}>
                            {labels[row.type]}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.2 }}>
                            Expiry Date: <span style={{ fontFamily: 'var(--sr-font-mono, monospace)', fontWeight: 600 }}>{expiry.toLocaleDateString()}</span>
                          </Typography>
                          {row.notes && (
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontStyle: 'italic', display: 'block', mt: 0.2 }}>
                              Note: {row.notes}
                            </Typography>
                          )}
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, alignSelf: { xs: 'flex-end', sm: 'center' } }}>
                          {/* Verification Chip */}
                          <Chip
                            label={String(row.status).toUpperCase()}
                            size="small"
                            sx={{
                              fontSize: 10,
                              fontWeight: 700,
                              letterSpacing: '0.04em',
                              height: 22,
                              bgcolor: row.status === 'verified' ? 'rgba(5, 150, 105, 0.1)' : 'rgba(0,0,0,0.06)',
                              color: row.status === 'verified' ? 'var(--sr-emerald)' : 'text.secondary'
                            }}
                          />

                          {/* Countdown Chip */}
                          <Chip
                            label={countdownLabel}
                            size="small"
                            sx={{
                              fontWeight: 700,
                              fontSize: 11,
                              fontFamily: 'var(--sr-font-mono, monospace)',
                              bgcolor: countdownBg,
                              color: countdownColor,
                              border: `1px solid ${countdownBorder}`,
                              height: 24,
                              borderRadius: '6px'
                            }}
                          />
                        </Box>
                      </Box>
                    )
                  })}
                </Box>
              )}
            </CardContent>
          </Card>
        </Box>
      </div>
    </Layout>
  )
}

export default VehicleDocuments
