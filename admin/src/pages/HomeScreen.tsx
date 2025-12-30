import React, { useMemo, useState, useEffect, useCallback } from 'react'
import {
  Avatar,
  Button,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Stack,
  Toolbar,
  TextField,
  Typography,
  AppBar,
  Box,
  Container,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@mui/material'
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import Layout from '@/components/Layout'
import * as BookingService from '@/services/BookingService'
import * as SupplierService from '@/services/SupplierService'
import * as CarService from '@/services/CarService'
import * as helper from '@/utils/helper'
import env from '@/config/env.config'

type MetricCard = { label: string, value: string }

const reminders = [
  { title: 'Confirm customer bookings and update rental status', time: 'Today 10:00 AM' },
  { title: 'Follow up with customers for outstanding payments', time: 'Today 1:00 PM' },
]

const carRangeOptions = [
  { label: 'Car', value: 'car' },
  { label: 'SUV', value: 'suv' },
  { label: 'Van', value: 'van' },
  { label: 'Scooter', value: 'scooter' },
  { label: 'Bus', value: 'bus' },
]

const activeStatuses: bookcarsTypes.BookingStatus[] = [
  bookcarsTypes.BookingStatus.Pending,
  bookcarsTypes.BookingStatus.Deposit,
  bookcarsTypes.BookingStatus.Paid,
  bookcarsTypes.BookingStatus.PaidInFull,
  bookcarsTypes.BookingStatus.Reserved,
]

const HomeScreen = () => {
  const [user, setUser] = useState<bookcarsTypes.User>()
  const [suppliers, setSuppliers] = useState<string[]>([])
  const [from, setFrom] = useState<Date | null>(null)
  const [to, setTo] = useState<Date | null>(null)
  const [carRange, setCarRange] = useState<string>('car')

  const [recentBookings, setRecentBookings] = useState<bookcarsTypes.Booking[]>([])
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [activeBookingsCount, setActiveBookingsCount] = useState(0)
  const [availableCarsCount, setAvailableCarsCount] = useState(0)
  const [earningsSeries, setEarningsSeries] = useState<number[]>([])
  const [earningsLabels, setEarningsLabels] = useState<string[]>([])

  const [availableCars, setAvailableCars] = useState<bookcarsTypes.Car[]>([])
  const [openAvailability, setOpenAvailability] = useState(false)
  const [loadingAvailability, setLoadingAvailability] = useState(false)
  const [loadingCards, setLoadingCards] = useState(false)

  const metrics: MetricCard[] = useMemo(() => ([
    { label: 'Total Revenue', value: helper.formatCurrency(totalRevenue, env.BASE_CURRENCY || 'USD') },
    { label: 'Rented Cars', value: `${activeBookingsCount} Units` },
    { label: 'Available Cars', value: `${availableCarsCount} Units` },
  ]), [totalRevenue, activeBookingsCount, availableCarsCount])

  const loadSuppliers = useCallback(async () => {
    const data = await SupplierService.getAllSuppliers()
    return bookcarsHelper.flattenSuppliers(data)
  }, [])

  const fetchBookings = useCallback(async (_suppliers: string[]) => {
    try {
      setLoadingCards(true)
      const filter: bookcarsTypes.Filter = {}
      if (from) filter.from = from
      if (to) filter.to = to

      const payload: bookcarsTypes.GetBookingsPayload = {
        suppliers: _suppliers,
        statuses: activeStatuses,
        filter,
      }

      const data = await BookingService.getBookings(payload, 1, 200)
      const result = data && data.length > 0 ? data[0].resultData : []

      const sorted = [...result].sort((a, b) => new Date(b.from).getTime() - new Date(a.from).getTime())
      setRecentBookings(sorted.slice(0, 4))

      const revenue = result.reduce((sum, b) => sum + (b.price || 0), 0)
      setTotalRevenue(revenue)

      const now = new Date().getTime()
      const active = result.filter((b) => {
        const fromDate = new Date(b.from).getTime()
        const toDate = new Date(b.to).getTime()
        return fromDate <= now && now <= toDate
      }).length
      setActiveBookingsCount(active)

      // earnings series over selected period (group by day)
      const byDay = new Map<string, number>()
      result.forEach((b) => {
        const day = new Date(b.from)
        const key = day.toISOString().slice(0, 10)
        byDay.set(key, (byDay.get(key) || 0) + (b.price || 0))
      })
      const entries = Array.from(byDay.entries()).sort((a, b) => a[0].localeCompare(b[0]))
      setEarningsLabels(entries.map((e) => e[0]))
      setEarningsSeries(entries.map((e) => e[1]))
    } catch (err) {
      helper.error(err)
    } finally {
      setLoadingCards(false)
    }
  }, [from, to])

  const fetchAvailableCars = useCallback(async () => {
    if (!from || !to) {
      helper.error(null, 'Please choose From and To dates.')
      return
    }
    try {
      setLoadingAvailability(true)
      const payload: bookcarsTypes.GetBookingsPayload = {
        suppliers,
        statuses: activeStatuses,
        filter: { from, to },
      }
      const bookingData = await BookingService.getBookings(payload, 1, 500)
      const bookings = bookingData && bookingData.length > 0 ? bookingData[0].resultData : []
      const bookedCarIds = new Set(bookings.map((b) => (typeof b.car === 'string' ? b.car : b.car._id)).filter(Boolean) as string[])

      const carsData = await CarService.getCars('', {
        suppliers,
        ranges: carRange ? [carRange] : undefined,
        availability: [bookcarsTypes.Availablity.Available],
        from,
        to,
      }, 1, 200)
      const carsPage = carsData && carsData.length > 0 ? carsData[0] : undefined
      const cars = carsPage?.resultData || []
      const totalCars = Number(carsPage?.pageInfo?.totalRecords ?? carsPage?.pageInfo?.totalRecord ?? cars.length ?? 0)
      const filtered = cars.filter((c) => !bookedCarIds.has(c._id || ''))
      setAvailableCars(filtered)
      setOpenAvailability(true)
      const remaining = Math.max(totalCars - bookings.length, filtered.length)
      setAvailableCarsCount(remaining)
    } catch (err) {
      helper.error(err)
    } finally {
      setLoadingAvailability(false)
    }
  }, [from, to, carRange, suppliers])

  const fetchCarsCount = useCallback(async (_suppliers: string[]) => {
    try {
      const data = await CarService.getCars('', { suppliers: _suppliers }, 1, 1)
      const total = Number(data?.[0]?.pageInfo?.totalRecords ?? data?.[0]?.pageInfo?.totalRecord ?? 0)
      setAvailableCarsCount(Math.max(total - activeBookingsCount, 0))
    } catch (err) {
      helper.error(err)
    }
  }, [activeBookingsCount])

  const onLoad = async (_user?: bookcarsTypes.User) => {
    setUser(_user)
    if (_user && _user.verified) {
      const supplierIds = helper.admin(_user)
        ? await loadSuppliers()
        : [_user._id || '']
      setSuppliers(supplierIds)
      await fetchBookings(supplierIds)
      await fetchCarsCount(supplierIds)
    }
  }

  const earningsTotal = useMemo(() => earningsSeries.reduce((a, b) => a + b, 0), [earningsSeries])

  return (
    <Layout strict onLoad={onLoad}>
      <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50' }}>
        <AppBar
          position="fixed"
          color="inherit"
          elevation={0}
          sx={{ height: 64, width: '100%', borderBottom: '1px solid', borderColor: 'divider' }}
        >
          <Toolbar sx={{ height: 64, px: 3 }}>
            <Typography variant="h6" fontWeight={600}>Dashboard</Typography>
            <Box sx={{ flexGrow: 1 }} />
            <Button variant="contained" size="small" sx={{ height: 36 }} onClick={() => suppliers.length && fetchBookings(suppliers)} disabled={loadingCards}>
              Refresh
            </Button>
          </Toolbar>
        </AppBar>

        <Box component="main" sx={{ pt: 10, pb: 4 }}>
          <Container maxWidth={false} disableGutters sx={{ maxWidth: 1200, mx: 'auto', px: 3, py: 3 }}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <Grid container spacing={3}>
                {metrics.map((metric) => (
                  <Grid item xs={12} md={4} key={metric.label}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 3,
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 2,
                        height: '100%',
                      }}
                    >
                      <Typography variant="body2" color="text.secondary">{metric.label}</Typography>
                      <Typography variant="h5" fontWeight={600} sx={{ mt: 1 }}>{metric.value}</Typography>
                    </Paper>
                  </Grid>
                ))}

                <Grid item xs={12}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 3,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 2,
                    }}
                  >
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                      <Box>
                        <Typography variant="h6" fontWeight={600}>Availability</Typography>
                        <Typography variant="body2" color="text.secondary">{new Date().toLocaleString()}</Typography>
                      </Box>
                    </Stack>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} sm={6} md={3}>
                        <DatePicker
                          label="From"
                          value={from}
                          onChange={(date) => setFrom(date)}
                          slotProps={{ textField: { size: 'small', fullWidth: true, sx: { height: 40 } } }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <DatePicker
                          label="To"
                          value={to}
                          onChange={(date) => setTo(date)}
                          slotProps={{ textField: { size: 'small', fullWidth: true, sx: { height: 40 } } }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Select
                          size="small"
                          fullWidth
                          value={carRange}
                          onChange={(e) => setCarRange(String(e.target.value))}
                          sx={{ height: 40 }}
                        >
                          {carRangeOptions.map((option) => (
                            <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                          ))}
                        </Select>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Button variant="contained" onClick={fetchAvailableCars} disabled={loadingAvailability} sx={{ minWidth: 160, height: 40 }}>
                          {loadingAvailability ? 'Loading...' : 'Check Availability'}
                        </Button>
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>

                <Grid item xs={12}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 3,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 2,
                    }}
                  >
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                      <Typography variant="h6" fontWeight={600}>Total Earnings</Typography>
                      <Chip label={`Total: ${helper.formatCurrency(earningsTotal, env.BASE_CURRENCY || 'USD')}`} size="small" />
                    </Stack>
                    <Box sx={{ height: 220 }}>
                      <svg width="100%" height="160">
                        {earningsSeries.length > 0 && (
                          <polyline
                            fill="none"
                            stroke="#6c63ff"
                            strokeWidth="3"
                            points={earningsSeries.map((value, idx) => {
                              const x = (idx / Math.max(earningsSeries.length - 1, 1)) * 100
                              const max = Math.max(...earningsSeries)
                              const y = 120 - (value / (max || 1)) * 100
                              return `${x},${y}`
                            }).join(' ')}
                          />
                        )}
                        {earningsSeries.length === 0 && <text x="10" y="50" fill="#9e9e9e">No data</text>}
                      </svg>
                      <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1 }}>
                        {earningsLabels.map((label) => (
                          <Chip key={label} label={label} size="small" variant="outlined" />
                        ))}
                      </Stack>
                    </Box>
                  </Paper>
                </Grid>

                <Grid item xs={12} md={8}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 3,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 2,
                    }}
                  >
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                      <Typography variant="h6" fontWeight={600}>Recent Bookings</Typography>
                    </Stack>
                    <Table size="small" sx={{ minWidth: 650 }}>
                      <TableHead>
                        <TableRow>
                          <TableCell width={60}>No</TableCell>
                          <TableCell>Car</TableCell>
                          <TableCell>Driver</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell align="right">Earnings</TableCell>
                          <TableCell align="right">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {recentBookings.map((booking, index) => {
                          const carName = typeof booking.car === 'string' ? booking.car : booking.car.name
                          const driver = typeof booking.driver === 'string' ? booking.driver : booking.driver?.fullName || '—'
                          const price = helper.formatCurrency(booking.price || 0, env.BASE_CURRENCY || 'USD')
                          return (
                            <TableRow key={booking._id || index} hover>
                              <TableCell>{index + 1}</TableCell>
                              <TableCell>{carName}</TableCell>
                              <TableCell>
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <Avatar src={typeof booking.driver !== 'string' ? booking.driver?.avatar : undefined} alt={driver} sx={{ width: 28, height: 28 }} />
                                  <Typography variant="body2">{driver}</Typography>
                                </Stack>
                              </TableCell>
                              <TableCell>
                                <Chip label={booking.status} size="small" color="info" sx={{ borderRadius: 999 }} />
                              </TableCell>
                              <TableCell align="right">{price}</TableCell>
                              <TableCell align="right">
                                <Button size="small" variant="contained">Details</Button>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </Paper>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 3,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 2,
                      height: '100%',
                    }}
                  >
                    <Typography variant="h6" fontWeight={600} gutterBottom>Reminders</Typography>
                    <List dense>
                      {reminders.map((reminder) => (
                        <React.Fragment key={reminder.title}>
                          <ListItem>
                            <ListItemText primary={reminder.title} secondary={reminder.time} />
                          </ListItem>
                          <Divider component="li" />
                        </React.Fragment>
                      ))}
                    </List>
                  </Paper>
                </Grid>
              </Grid>
            </LocalizationProvider>
          </Container>
        </Box>
      </Box>

      <Dialog open={openAvailability} onClose={() => setOpenAvailability(false)} fullWidth maxWidth="lg">
        <DialogTitle>Available Cars</DialogTitle>
        <DialogContent dividers>
          {loadingAvailability && <Typography>Loading...</Typography>}
          {!loadingAvailability && availableCars.length === 0 && <Typography>No cars available for the selected dates.</Typography>}
          <Grid container spacing={2}>
            {availableCars.map((car) => (
              <Grid item xs={12} md={6} key={car._id}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 2,
                  }}
                >
                  <Typography variant="h6">{car.name}</Typography>
                  <Typography variant="body2" color="text.secondary">{car.licensePlate}</Typography>
                  <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                    <Chip label={car.range} size="small" />
                    <Chip label={`${car.seats} seats`} size="small" />
                  </Stack>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </DialogContent>
      </Dialog>
    </Layout>
  )
}

export default HomeScreen

