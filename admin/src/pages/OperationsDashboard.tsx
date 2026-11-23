import { Link } from 'react-router-dom'
import dashboardImage from '@/assets/img/rental-dashboard.jpg'
import React, { useEffect, useState } from 'react'
import {
  Alert,
  Button,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Typography,
  Chip,
  LinearProgress,
  Divider
} from '@mui/material'
import {
  DirectionsCar as CarIcon,
  PieChart as UtilIcon,
  AccountBalanceWallet as EscrowIcon,
  FactCheck as ComplianceIcon,
  Circle as PulseIcon,
  TrendingUp as TrendingUpIcon,
  Build as MaintenanceIcon,
  WarningAmber as WarningIcon,
  SmartToy as AIIcon,
  CheckCircle as CheckIcon
} from '@mui/icons-material'
import * as bookcarsTypes from ':bookcars-types'
import Layout from '@/components/Layout'
import * as OperationsDashboardService from '@/services/OperationsDashboardService'
import * as helper from '@/utils/helper'

const OperationsDashboard = () => {
  const [data, setData] = useState<bookcarsTypes.OperationsDashboard>()
  const [error, setError] = useState(false)

  useEffect(() => {
    OperationsDashboardService.get().then(setData).catch((reason) => {
      setError(true)
      helper.error(reason)
    })
  }, [])

  const totalVehicles = data?.totals.totalVehicles || 0
  const availableVehicles = data?.totals.availableVehicles || 0
  const deployedVehicles = Math.max(0, totalVehicles - availableVehicles)
  const utilPct = totalVehicles > 0 ? Math.round((deployedVehicles / totalVehicles) * 100) : 0
  const revenue = data?.totals.revenue || 0
  const pendingReviews = (data?.totals.pendingAiApprovals || 0) + (data?.totals.expiredDocuments || 0) + (data?.totals.expiringDocuments || 0)

  return (
    <Layout admin strict>
      <div className="maintenance-page operations-dashboard" style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 20px 48px' }}>
        {/* Page Header */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
            <span className="operations-eyebrow" style={{ color: 'var(--sr-emerald)', fontWeight: 800, fontSize: 11, letterSpacing: '0.1em' }}>
              SAFARRENT / OPERATIONS
            </span>
            <Chip
              label={data ? new Date(data.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Dashboard'}
              size="small"
              icon={<PulseIcon sx={{ fontSize: '10px !important', color: 'var(--sr-emerald)', animation: 'pulse 1.8s infinite' }} />}
              sx={{
                bgcolor: 'rgba(16, 185, 129, 0.1)',
                color: 'var(--sr-emerald)',
                fontWeight: 700,
                fontSize: 10,
                height: 20,
                border: '1px solid rgba(16, 185, 129, 0.25)'
              }}
            />
          </Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: 'var(--sr-text, #0F172A)', letterSpacing: '-0.02em', mb: 0.5 }}>
            Dashboard
          </Typography>
          <Typography color="text.secondary" sx={{ fontSize: 14 }}>
            Fleet utilization, booking revenue, maintenance and document reviews.
          </Typography>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 3 }}>Unable to load operations telemetry metrics.</Alert>}
        {!data && !error && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress sx={{ color: 'var(--sr-emerald)' }} />
          </Box>
        )}

        {data && (
          <>
            <section className="sr-operations-welcome">
              <div>
                <span className="sr-welcome-kicker">YOUR RENTAL BUSINESS, AT A GLANCE</span>
                <h2>Ready for the next journey.</h2>
                <p>Manage your fleet, prepare upcoming trips, and keep every rental moving.</p>
                <div className="sr-welcome-actions">
                  <Button component={Link} to="/create-booking" variant="contained">+ New reservation</Button>
                  <Button component={Link} to="/cars" variant="outlined">View vehicle fleet →</Button>
                </div>
              </div>
              <img src={dashboardImage} alt="SUV on a mountain road in Pakistan" />
            </section>
            {/* Top 4 Telemetry KPI Cards */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 2.5, mb: 3 }}>
              {/* Card 1: Active Trips */}
              <Card
                sx={{
                  borderRadius: '14px',
                  border: '1px solid var(--sr-border, #E2E8F0)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                  background: 'linear-gradient(135deg, rgba(5, 150, 105, 0.05) 0%, transparent 60%)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Active Trips
                    </Typography>
                    <Box sx={{ p: 1, borderRadius: '8px', bgcolor: 'rgba(5, 150, 105, 0.1)', color: 'var(--sr-emerald)', display: 'flex' }}>
                      <CarIcon fontSize="small" />
                    </Box>
                  </Box>
                  <Typography variant="h3" sx={{ fontWeight: 800, fontFamily: 'var(--sr-font-mono, monospace)', color: 'var(--sr-text, #0F172A)', mb: 1 }}>
                    {data.totals.activeBookings || 0}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip
                      label="On-Road Units"
                      size="small"
                      sx={{ bgcolor: 'rgba(5, 150, 105, 0.15)', color: 'var(--sr-emerald)', fontWeight: 700, fontSize: 11, height: 20 }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      Active customer rentals
                    </Typography>
                  </Box>
                </CardContent>
              </Card>

              {/* Card 2: Fleet Utilization % */}
              <Card
                sx={{
                  borderRadius: '14px',
                  border: '1px solid var(--sr-border, #E2E8F0)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                  background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.05) 0%, transparent 60%)',
                  position: 'relative'
                }}
              >
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Fleet Utilization
                    </Typography>
                    <Box sx={{ p: 1, borderRadius: '8px', bgcolor: 'rgba(14, 165, 233, 0.1)', color: '#0284C7', display: 'flex' }}>
                      <UtilIcon fontSize="small" />
                    </Box>
                  </Box>
                  <Typography variant="h3" sx={{ fontWeight: 800, fontFamily: 'var(--sr-font-mono, monospace)', color: 'var(--sr-text, #0F172A)', mb: 1 }}>
                    {utilPct}%
                  </Typography>
                  <Box sx={{ mb: 0.5 }}>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(100, utilPct)}
                      sx={{
                        height: 6,
                        borderRadius: 3,
                        bgcolor: 'rgba(0,0,0,0.06)',
                        '& .MuiLinearProgress-bar': { bgcolor: utilPct > 75 ? '#107487' : '#0284C7', borderRadius: 3 }
                      }}
                    />
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {deployedVehicles} of {totalVehicles} vehicles deployed
                  </Typography>
                </CardContent>
              </Card>

              {/* Card 3: Booking revenue */}
              <Card
                sx={{
                  borderRadius: '14px',
                  border: '1px solid var(--sr-border, #E2E8F0)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                  background: 'linear-gradient(135deg, rgba(217, 119, 6, 0.05) 0%, transparent 60%)',
                  position: 'relative'
                }}
              >
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Booking revenue
                    </Typography>
                    <Box sx={{ p: 1, borderRadius: '8px', bgcolor: 'rgba(217, 119, 6, 0.1)', color: 'var(--sr-accent-text)', display: 'flex' }}>
                      <EscrowIcon fontSize="small" />
                    </Box>
                  </Box>
                  <Typography variant="h3" sx={{ fontWeight: 800, fontFamily: 'var(--sr-font-mono, monospace)', color: 'var(--sr-text, #0F172A)', mb: 1 }}>
                    Rs {revenue.toLocaleString()}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip
                      label="PKR"
                      size="small"
                      sx={{ bgcolor: 'rgba(217, 119, 6, 0.15)', color: 'var(--sr-accent-text)', fontWeight: 700, fontSize: 11, height: 20 }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      Recorded booking revenue
                    </Typography>
                  </Box>
                </CardContent>
              </Card>

              {/* Card 4: Pending Compliance Reviews */}
              <Card
                sx={{
                  borderRadius: '14px',
                  border: '1px solid var(--sr-border, #E2E8F0)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                  background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.05) 0%, transparent 60%)',
                  position: 'relative'
                }}
              >
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Pending Reviews
                    </Typography>
                    <Box sx={{ p: 1, borderRadius: '8px', bgcolor: 'rgba(239, 68, 68, 0.1)', color: '#DC2626', display: 'flex' }}>
                      <ComplianceIcon fontSize="small" />
                    </Box>
                  </Box>
                  <Typography variant="h3" sx={{ fontWeight: 800, fontFamily: 'var(--sr-font-mono, monospace)', color: pendingReviews > 0 ? '#DC2626' : 'var(--sr-text, #0F172A)', mb: 1 }}>
                    {pendingReviews}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip
                      label={`${data.totals.pendingAiApprovals || 0} AI • ${(data.totals.expiredDocuments || 0) + (data.totals.expiringDocuments || 0)} Docs`}
                      size="small"
                      sx={{
                        bgcolor: pendingReviews > 0 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(5, 150, 105, 0.12)',
                        color: pendingReviews > 0 ? '#DC2626' : 'var(--sr-emerald)',
                        fontWeight: 700,
                        fontSize: 11,
                        height: 20
                      }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      Requires operator action
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Box>

            {/* Secondary Operational Quick-Metrics */}
            <Card sx={{ mb: 3, borderRadius: '12px', border: '1px solid var(--sr-border, #E2E8F0)' }}>
              <CardContent sx={{ p: 2 }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2, textAlign: 'center' }}>
                  <Box sx={{ p: 1 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>
                      Total Registered Fleet
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 800, fontFamily: 'var(--sr-font-mono, monospace)', mt: 0.5 }}>
                      {data.totals.totalVehicles}
                    </Typography>
                  </Box>
                  <Box sx={{ p: 1 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>
                      Available for Dispatch
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: 'var(--sr-emerald)', fontFamily: 'var(--sr-font-mono, monospace)', mt: 0.5 }}>
                      {data.totals.availableVehicles}
                    </Typography>
                  </Box>
                  <Box sx={{ p: 1 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>
                      Vehicles in Maintenance
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: 'var(--sr-accent-text)', fontFamily: 'var(--sr-font-mono, monospace)', mt: 0.5 }}>
                      {data.totals.maintenanceVehicles}
                    </Typography>
                  </Box>
                  <Box sx={{ p: 1 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>
                      Gross Recorded Revenue
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 800, fontFamily: 'var(--sr-font-mono, monospace)', mt: 0.5 }}>
                      PKR {revenue.toLocaleString()}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>

            {/* Two-Column Section: Status Matrix & AI Rental Pipeline */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2.5, mb: 3 }}>
              {/* Booking Status Matrix */}
              <Card sx={{ borderRadius: '12px', border: '1px solid var(--sr-border, #E2E8F0)' }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TrendingUpIcon fontSize="small" sx={{ color: 'var(--sr-emerald)' }} /> Booking Pipeline Statuses
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {data.bookingStatuses.length === 0 ? (
                      <Typography color="text.secondary">No bookings in pipeline.</Typography>
                    ) : (
                      data.bookingStatuses.map((row) => (
                        <Box key={row._id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.5, borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                          <Chip
                            label={String(row._id).toUpperCase()}
                            size="small"
                            sx={{
                              fontWeight: 700,
                              fontSize: 11,
                              fontFamily: 'var(--sr-font-mono, monospace)',
                              bgcolor: String(row._id).toLowerCase().includes('paid') ? 'rgba(5, 150, 105, 0.1)' : String(row._id).toLowerCase().includes('pending') ? 'rgba(217, 119, 6, 0.1)' : 'rgba(0,0,0,0.05)',
                              color: String(row._id).toLowerCase().includes('paid') ? 'var(--sr-emerald)' : String(row._id).toLowerCase().includes('pending') ? 'var(--sr-accent-text)' : 'var(--sr-text)'
                            }}
                          />
                          <Typography sx={{ fontWeight: 700, fontFamily: 'var(--sr-font-mono, monospace)' }}>
                            {row.count} {row.count === 1 ? 'trip' : 'trips'}
                          </Typography>
                        </Box>
                      ))
                    )}
                  </Box>
                </CardContent>
              </Card>

              {/* AI Intake Workflow */}
              <Card sx={{ borderRadius: '12px', border: '1px solid var(--sr-border, #E2E8F0)' }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AIIcon fontSize="small" sx={{ color: '#F59E0B' }} /> AI Rental Intake Pipeline
                  </Typography>
                  <Box sx={{ mb: 2, p: 1.5, borderRadius: '8px', bgcolor: 'rgba(245, 158, 11, 0.08)', display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'var(--sr-accent-text)' }}>
                      Approved AI Bookings
                    </Typography>
                    <Typography sx={{ fontWeight: 800, fontFamily: 'var(--sr-font-mono, monospace)', color: 'var(--sr-accent-text)' }}>
                      {data.totals.approvedAiBookings || 0}
                    </Typography>
                  </Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: 'text.secondary' }}>
                    Extracted Rental Categories:
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {data.rentalTypes.length === 0 ? (
                      <Typography color="text.secondary" variant="body2">No AI rental categories recorded yet.</Typography>
                    ) : (
                      data.rentalTypes.map((row) => (
                        <Box key={row._id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.5 }}>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {row._id || 'Standard Rental'}
                          </Typography>
                          <Typography sx={{ fontWeight: 700, fontFamily: 'var(--sr-font-mono, monospace)' }}>
                            {row.count}
                          </Typography>
                        </Box>
                      ))
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Box>

            {/* Bottom Row: Upcoming Maintenance & Document Expiry */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2.5 }}>
              {/* Upcoming Maintenance */}
              <Card sx={{ borderRadius: '12px', border: '1px solid var(--sr-border, #E2E8F0)' }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <MaintenanceIcon fontSize="small" sx={{ color: '#0284C7' }} /> Upcoming Fleet Maintenance
                  </Typography>
                  {data.maintenanceRows.length === 0 ? (
                    <Typography color="text.secondary" variant="body2">No active vehicle maintenance scheduled.</Typography>
                  ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      {data.maintenanceRows.map((row) => (
                        <Box key={String(row._id)} sx={{ p: 1.5, borderRadius: '8px', bgcolor: 'rgba(0,0,0,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                              {String((row.vehicle as { name?: string })?.name || 'Vehicle')}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Expected: {new Date(String(row.expectedCompletionDate)).toLocaleDateString()}
                            </Typography>
                          </Box>
                          <Chip
                            label={String(row.status)}
                            size="small"
                            sx={{ fontWeight: 700, fontSize: 10, height: 20 }}
                          />
                        </Box>
                      ))}
                    </Box>
                  )}
                </CardContent>
              </Card>

              {/* Document Expiry Warnings */}
              <Card sx={{ borderRadius: '12px', border: '1px solid var(--sr-border, #E2E8F0)' }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <WarningIcon fontSize="small" sx={{ color: '#DC2626' }} /> Document Expiry Watchlist
                  </Typography>
                  {data.documentRows.length === 0 ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'var(--sr-emerald)' }}>
                      <CheckIcon fontSize="small" />
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>All smart cards, token taxes, and fitness certificates are valid.</Typography>
                    </Box>
                  ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      {data.documentRows.map((row) => (
                        <Box key={String(row._id)} sx={{ p: 1.5, borderRadius: '8px', bgcolor: 'rgba(239, 68, 68, 0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: '#B91C1C' }}>
                              {String(row.type).toUpperCase().replace('_', ' ')}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Expiry: {new Date(String(row.expiryDate)).toLocaleDateString()}
                            </Typography>
                          </Box>
                          <Chip
                            label="Action Required"
                            size="small"
                            sx={{ bgcolor: '#DC2626', color: '#FFFFFF', fontWeight: 700, fontSize: 10, height: 20 }}
                          />
                        </Box>
                      ))}
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Box>
          </>
        )}
      </div>
    </Layout>
  )
}

export default OperationsDashboard
