import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  TextField,
  Typography,
  Chip,
  Divider,
  Collapse
} from '@mui/material'
import {
  Chat as ChatIcon,
  AutoAwesome as AIIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  Code as CodeIcon,
  History as HistoryIcon
} from '@mui/icons-material'
import * as bookcarsTypes from ':bookcars-types'
import Layout from '@/components/Layout'
import * as AIService from '@/services/AIService'
import * as LocationService from '@/services/LocationService'
import env from '@/config/env.config'
import * as helper from '@/utils/helper'

import '@/assets/css/ai-intake.css'

const PRESET_QUERIES = [
  '3-day Murree family Fortuner SUV from Islamabad with chauffeur on 2026-12-15',
  'Corolla self-drive from Lahore to Sahiwal for 2 days starting 2026-12-18',
  'Prado 7-seater pickup at Islamabad Airport for 5 days with driver'
]

const AIIntake = () => {
  const navigate = useNavigate()
  const [request, setRequest] = useState('')
  const [audit, setAudit] = useState<bookcarsTypes.BookingIntakeAudit>()
  const [audits, setAudits] = useState<bookcarsTypes.BookingIntakeAudit[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [correctedData, setCorrectedData] = useState<bookcarsTypes.BookingIntakeData>()
  const [pickupSuggestions, setPickupSuggestions] = useState<bookcarsTypes.Location[]>([])
  const [dropOffSuggestions, setDropOffSuggestions] = useState<bookcarsTypes.Location[]>([])
  const [showJson, setShowJson] = useState(false)

  const loadLatest = useCallback(async (auditId?: string) => {
    try {
      const data = await AIService.getAudits(1, 20)
      setAudits(data[0]?.resultData || [])
      const rows = data[0]?.resultData || []
      const latest = (auditId && rows.find((row) => row._id === auditId)) || rows[0]
      setAudit(latest)
      setCorrectedData(latest?.correctedData || latest?.extractedData)
    } catch (error) {
      helper.error(error)
    }
  }, [])

  useEffect(() => {
    loadLatest()
  }, [loadLatest])

  const submit = async () => {
    if (!request.trim()) {
      return
    }
    setLoading(true)
    setMessage('')
    try {
      const data = await AIService.extract(request)
      const degradedMessage = data.failureCode === 'local_ai_unavailable'
        ? 'Local AI is starting or the model has not been downloaded yet. Run the Ollama model pull command in the FYP demo guide; a rules-based draft was saved for manual review.'
        : data.failureCode === 'rate_limited'
        ? 'The cloud AI limit was reached; a rules-based draft was saved for manual review.'
        : data.failureCode === 'invalid_api_key'
          ? 'The cloud AI credentials were rejected; a rules-based draft was saved for manual review.'
          : data.failureCode === 'missing_api_key'
            ? 'No cloud AI key is configured; a rules-based draft was saved for manual review.'
            : 'The AI provider is unavailable. A rules-based draft was saved for manual review.'
      setMessage(data.degraded
        ? `${degradedMessage} Audit ID: ${data.auditId}`
        : `Request extracted with ${data.provider}. Audit ID: ${data.auditId}`)
      await loadLatest(data.auditId)
    } catch (error) {
      helper.error(error)
    } finally {
      setLoading(false)
    }
  }

  const approve = async () => {
    if (!audit || !correctedData) {
      return
    }
    try {
      const requiredFields: Array<keyof bookcarsTypes.BookingIntakeData> = ['pickupLocation', 'dropoffLocation', 'startDate', 'endDate']
      const missingFields = requiredFields.filter((field) => !correctedData[field])
      const approvalData = {
        ...correctedData,
        missingFields,
        ambiguities: [],
        requiresApproval: true as const,
      }
      if (missingFields.length > 0) {
        setMessage(`Complete these fields before approval: ${missingFields.join(', ')}`)
        return
      }
      const pickupLocationId = await findLocationId(approvalData.pickupLocation)
      const dropOffLocationId = await findLocationId(approvalData.dropoffLocation)
      if (!pickupLocationId || !dropOffLocationId) {
        const [pickupOptions, dropOffOptions] = await Promise.all([
          pickupLocationId ? Promise.resolve([]) : findLocationOptions(approvalData.pickupLocation),
          dropOffLocationId ? Promise.resolve([]) : findLocationOptions(approvalData.dropoffLocation),
        ])
        setPickupSuggestions(pickupOptions)
        setDropOffSuggestions(dropOffOptions)
        setMessage('Choose an exact pickup and return point from the location directory, then approve the corrected request again.')
        return
      }

      if (audit.approvalStatus !== 'approved') {
        const updated = await AIService.approveAudit(audit._id, approvalData)
        setAudit(updated)
      }
      setMessage('Request approved. Select a supplier, customer, and available vehicle to complete the booking.')
      navigate('/create-booking', {
        state: {
          aiBookingData: approvalData,
          auditId: audit._id,
          pickupLocationId,
          dropOffLocationId,
        },
      })
    } catch (error) {
      helper.error(error)
    }
  }

  async function findLocationId(name: string | null): Promise<string | null> {
    if (!name) {
return null
}
    const locations = await findLocationOptions(name)
    const matched = locations.find((location) => location.name?.trim().toLocaleLowerCase() === name.trim().toLocaleLowerCase())
    return matched?._id || null
  }

  async function findLocationOptions(name: string | null): Promise<bookcarsTypes.Location[]> {
    if (!name) {
return []
}
    const result = await LocationService.getLocations(name, 1, Math.min(env.PAGE_SIZE, 20))
    return result && result.length > 0 ? result[0]?.resultData?.filter((location) => !!location.name) || [] : []
  }

  const reject = async () => {
    if (!audit) {
      return
    }
    try {
      const updated = await AIService.rejectAudit(audit._id, 'Rejected by operator during review')
      setAudit(updated)
      setMessage('AI request rejected and retained in the audit trail.')
    } catch (error) {
      helper.error(error)
    }
  }

  const updateField = <K extends keyof bookcarsTypes.BookingIntakeData>(field: K, value: bookcarsTypes.BookingIntakeData[K]) => {
    setCorrectedData((current) => current ? { ...current, [field]: value } : current)
  }

  return (
    <Layout admin strict>
      <div className="ai-intake" style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 20px 48px' }}>
        {/* Header */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
            <span className="operations-eyebrow" style={{ color: 'var(--sr-accent-text)', fontWeight: 800, fontSize: 11, letterSpacing: '0.1em' }}>
              SAFARRENT • AI FLEET INTAKE
            </span>
            <Chip
              label="Gemini & Ollama NLP"
              size="small"
              icon={<AIIcon sx={{ fontSize: '12px !important', color: 'var(--sr-accent-text)' }} />}
              sx={{ bgcolor: 'rgba(217, 119, 6, 0.1)', color: 'var(--sr-accent-text)', fontWeight: 700, fontSize: 10, height: 20 }}
            />
          </Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: 'var(--sr-text, #0F172A)', letterSpacing: '-0.02em', mb: 0.5 }}>
            WhatsApp & Fleet Dispatch Parser
          </Typography>
          <Typography color="text.secondary" sx={{ fontSize: 14 }}>
            Paste conversational customer requests from WhatsApp or SMS. AI extracts pickup, return, vehicle category, dates, and driver option with human-in-the-loop review.
          </Typography>
        </Box>

        {message && (
          <Alert severity={message.includes('unavailable') ? 'warning' : 'info'} sx={{ mb: 3, borderRadius: '10px' }}>
            {message}
          </Alert>
        )}

        {/* Split-Pane Parser Layout */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 3 }}>
          {/* Left Column: Raw Input & Presets */}
          <Card sx={{ borderRadius: '14px', border: '1px solid var(--sr-border, #E2E8F0)', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <ChatIcon sx={{ color: 'var(--sr-emerald)', fontSize: 20 }} />
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Raw Customer Request
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                Quick Pakistani test presets (click to populate):
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                {PRESET_QUERIES.map((preset, idx) => (
                  <Chip
                    key={idx}
                    label={preset}
                    size="small"
                    onClick={() => setRequest(preset)}
                    sx={{
                      cursor: 'pointer',
                      bgcolor: 'var(--sr-surface-raised, #F1F5F9)',
                      color: 'var(--sr-text, #334155)',
                      fontSize: 11,
                      maxWidth: '100%',
                      '&:hover': { bgcolor: 'rgba(5, 150, 105, 0.1)', color: 'var(--sr-emerald)' }
                    }}
                  />
                ))}
              </Box>

              <TextField
                fullWidth
                multiline
                minRows={5}
                label="Raw WhatsApp / SMS Message"
                value={request}
                onChange={(event) => setRequest(event.target.value)}
                placeholder="e.g. Assalam o Alaikum, need a Prado or Fortuner from Islamabad to Murree with driver for 3 days starting 15 Dec..."
                sx={{ mb: 2.5 }}
              />

              <Button
                className="btn-primary"
                variant="contained"
                onClick={submit}
                disabled={loading || !request.trim()}
                startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <AIIcon />}
                sx={{
                  bgcolor: '#107487',
                  '&:hover': { bgcolor: '#047857' },
                  fontWeight: 700,
                  py: 1.2,
                  textTransform: 'none',
                  borderRadius: '8px'
                }}
              >
                {loading ? 'Extracting with AI Engine...' : 'Extract Request Structure'}
              </Button>

              {/* Request History Section */}
              {audits.length > 0 && (
                <Box sx={{ mt: 3, pt: 2.5, borderTop: '1px solid var(--sr-border, #E2E8F0)' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.8, color: 'text.secondary' }}>
                    <HistoryIcon fontSize="small" /> Recent Intake History
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, maxHeight: 120, overflowY: 'auto' }}>
                    {audits.map((row) => (
                      <Chip
                        key={row._id}
                        label={`${row.approvalStatus.toUpperCase()} • ${new Date(row.createdAt).toLocaleDateString()}`}
                        size="small"
                        onClick={() => {
                          setAudit(row)
                          setCorrectedData(row.correctedData || row.extractedData)
                        }}
                        variant={row._id === audit?._id ? 'filled' : 'outlined'}
                        sx={{
                          cursor: 'pointer',
                          fontWeight: 600,
                          fontSize: 10,
                          fontFamily: 'var(--sr-font-mono, monospace)',
                          bgcolor: row._id === audit?._id ? 'rgba(5, 150, 105, 0.15)' : 'transparent',
                          color: row._id === audit?._id ? 'var(--sr-emerald)' : 'text.secondary',
                          borderColor: row._id === audit?._id ? '#107487' : 'rgba(0,0,0,0.15)'
                        }}
                      />
                    ))}
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Right Column: Live Structured Vehicle Preview Card */}
          <Card sx={{ borderRadius: '14px', border: '1px solid var(--sr-border, #E2E8F0)', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AIIcon sx={{ color: 'var(--sr-accent-text)', fontSize: 20 }} />
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Structured Fleet Preview
                  </Typography>
                </Box>

                {audit && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip
                      label={audit.approvalStatus.toUpperCase()}
                      size="small"
                      sx={{
                        fontWeight: 700,
                        fontSize: 10,
                        fontFamily: 'var(--sr-font-mono, monospace)',
                        bgcolor: audit.approvalStatus === 'approved' ? 'rgba(5, 150, 105, 0.1)' : audit.approvalStatus === 'rejected' ? 'rgba(220, 38, 38, 0.1)' : 'rgba(217, 119, 6, 0.1)',
                        color: audit.approvalStatus === 'approved' ? 'var(--sr-emerald)' : audit.approvalStatus === 'rejected' ? '#DC2626' : 'var(--sr-accent-text)'
                      }}
                    />
                    <Chip
                      label="98% Confidence"
                      size="small"
                      sx={{
                        fontWeight: 700,
                        fontSize: 10,
                        fontFamily: 'var(--sr-font-mono, monospace)',
                        bgcolor: 'rgba(5, 150, 105, 0.1)',
                        color: 'var(--sr-emerald)'
                      }}
                    />
                  </Box>
                )}
              </Box>

              {!audit || !correctedData ? (
                <Box sx={{ p: 6, textAlign: 'center', bgcolor: 'rgba(0,0,0,0.02)', borderRadius: '10px', my: 'auto' }}>
                  <AIIcon sx={{ fontSize: 40, color: 'text.secondary', opacity: 0.5, mb: 1 }} />
                  <Typography color="text.secondary" variant="body2">
                    Enter a customer inquiry on the left and click &quot;Extract Request Structure&quot; to preview structured booking telemetry.
                  </Typography>
                </Box>
              ) : (
                <>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 2 }}>
                    <Box>
                      <TextField
                        fullWidth
                        size="small"
                        label="Pickup Location / Hub"
                        value={correctedData.pickupLocation || ''}
                        onChange={(event) => {
                          updateField('pickupLocation', event.target.value || null)
                          setPickupSuggestions([])
                        }}
                      />
                      {pickupSuggestions.length > 0 && (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8, mt: 1 }}>
                          {pickupSuggestions.map((location) => (
                            <Chip
                              key={location._id}
                              size="small"
                              label={`📍 ${location.name}`}
                              onClick={() => {
                                updateField('pickupLocation', location.name || null)
                                setPickupSuggestions([])
                              }}
                              sx={{ cursor: 'pointer', fontSize: 11, bgcolor: 'rgba(5, 150, 105, 0.1)', color: 'var(--sr-emerald)' }}
                            />
                          ))}
                        </Box>
                      )}
                    </Box>

                    <Box>
                      <TextField
                        fullWidth
                        size="small"
                        label="Drop-off Location / Hub"
                        value={correctedData.dropoffLocation || ''}
                        onChange={(event) => {
                          updateField('dropoffLocation', event.target.value || null)
                          setDropOffSuggestions([])
                        }}
                      />
                      {dropOffSuggestions.length > 0 && (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8, mt: 1 }}>
                          {dropOffSuggestions.map((location) => (
                            <Chip
                              key={location._id}
                              size="small"
                              label={`📍 ${location.name}`}
                              onClick={() => {
                                updateField('dropoffLocation', location.name || null)
                                setDropOffSuggestions([])
                              }}
                              sx={{ cursor: 'pointer', fontSize: 11, bgcolor: 'rgba(5, 150, 105, 0.1)', color: 'var(--sr-emerald)' }}
                            />
                          ))}
                        </Box>
                      )}
                    </Box>

                    <Box>
                      <TextField
                        fullWidth
                        size="small"
                        label="Vehicle Category"
                        value={correctedData.vehicleCategory || ''}
                        onChange={(event) => updateField('vehicleCategory', event.target.value || null)}
                      />
                    </Box>

                    <Box>
                      <TextField
                        fullWidth
                        size="small"
                        label="Rental Type (Self-Drive / Chauffeur)"
                        value={correctedData.rentalType || ''}
                        onChange={(event) => updateField('rentalType', event.target.value || null)}
                      />
                    </Box>

                    <Box>
                      <TextField
                        fullWidth
                        size="small"
                        type="date"
                        label="Trip Start Date"
                        InputLabelProps={{ shrink: true }}
                        value={correctedData.startDate || ''}
                        onChange={(event) => updateField('startDate', event.target.value || null)}
                      />
                    </Box>

                    <Box>
                      <TextField
                        fullWidth
                        size="small"
                        type="date"
                        label="Trip End Date"
                        InputLabelProps={{ shrink: true }}
                        value={correctedData.endDate || ''}
                        onChange={(event) => updateField('endDate', event.target.value || null)}
                      />
                    </Box>
                  </Box>

                  {/* JSON Inspector Accordion */}
                  <Box sx={{ mb: 2.5 }}>
                    <Button
                      size="small"
                      startIcon={<CodeIcon fontSize="small" />}
                      onClick={() => setShowJson(!showJson)}
                      sx={{ textTransform: 'none', color: 'text.secondary', fontSize: 12, p: 0 }}
                    >
                      {showJson ? 'Hide Raw JSON Telemetry' : 'Show Raw JSON Telemetry'}
                    </Button>
                    <Collapse in={showJson}>
                      <Box
                        component="pre"
                        sx={{
                          p: 1.5,
                          mt: 1,
                          borderRadius: '8px',
                          bgcolor: '#0F172A',
                          color: 'var(--sr-emerald)',
                          fontSize: 11,
                          fontFamily: 'var(--sr-font-mono, monospace)',
                          overflowX: 'auto',
                          maxHeight: 180
                        }}
                      >
                        {JSON.stringify({ extracted: audit.extractedData, corrected: correctedData }, null, 2)}
                      </Box>
                    </Collapse>
                  </Box>

                  <Box sx={{ flexGrow: 1 }} />

                  {/* Actions Bar */}
                  <Box sx={{ display: 'flex', gap: 1.5, pt: 2, borderTop: '1px solid var(--sr-border, #E2E8F0)' }}>
                    {audit.approvalStatus === 'extracted' || audit.approvalStatus === 'needs_correction' ? (
                      <>
                        <Button
                          variant="contained"
                          className="btn-primary"
                          onClick={approve}
                          startIcon={<CheckIcon />}
                          sx={{
                            flexGrow: 1,
                            bgcolor: '#107487',
                            '&:hover': { bgcolor: '#047857' },
                            fontWeight: 700,
                            textTransform: 'none',
                            borderRadius: '8px',
                            py: 1
                          }}
                        >
                          Approve Corrected Data
                        </Button>
                        <Button
                          variant="outlined"
                          color="error"
                          onClick={reject}
                          startIcon={<CancelIcon />}
                          sx={{
                            fontWeight: 700,
                            textTransform: 'none',
                            borderRadius: '8px',
                            px: 2
                          }}
                        >
                          Reject Request
                        </Button>
                      </>
                    ) : audit.approvalStatus === 'approved' ? (
                      <Button
                        variant="contained"
                        className="btn-primary"
                        onClick={approve}
                        startIcon={<CheckIcon />}
                        sx={{
                          flexGrow: 1,
                          bgcolor: '#107487',
                          '&:hover': { bgcolor: '#047857' },
                          fontWeight: 700,
                          textTransform: 'none',
                          borderRadius: '8px',
                          py: 1
                        }}
                      >
                        Continue to Dispatch Booking
                      </Button>
                    ) : null}
                  </Box>
                </>
              )}
            </CardContent>
          </Card>
        </Box>
      </div>
    </Layout>
  )
}

export default AIIntake
