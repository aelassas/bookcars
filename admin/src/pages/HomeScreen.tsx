import React, { useMemo, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { DatePicker } from '@/components/ui/date-picker'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Clock } from 'lucide-react'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import Layout from '@/components/Layout'
import * as BookingService from '@/services/BookingService'
import * as SupplierService from '@/services/SupplierService'
import * as CarService from '@/services/CarService'
import * as helper from '@/utils/helper'
import env from '@/config/env.config'
import { format } from 'date-fns'

const activeStatuses: bookcarsTypes.BookingStatus[] = [
  bookcarsTypes.BookingStatus.Pending,
  bookcarsTypes.BookingStatus.Deposit,
  bookcarsTypes.BookingStatus.Paid,
  bookcarsTypes.BookingStatus.PaidInFull,
  bookcarsTypes.BookingStatus.Reserved,
]

const HomeScreen = () => {
  const [suppliers, setSuppliers] = useState<string[]>([])
  const [from, setFrom] = useState<Date | null>(null)
  const [to, setTo] = useState<Date | null>(null)
  const [carRange, setCarRange] = useState<string>('all')

  const [recentBookings, setRecentBookings] = useState<bookcarsTypes.Booking[]>([])
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [activeBookingsCount, setActiveBookingsCount] = useState(0)
  const [availableCarsCount, setAvailableCarsCount] = useState(0)
  const [earningsSeries, setEarningsSeries] = useState<number[]>([])
  const [earningsLabels, setEarningsLabels] = useState<string[]>([])
  const [revenueTimeRange, setRevenueTimeRange] = useState<'7d' | '30d' | '12m'>('30d')

  const [loadingAvailability, setLoadingAvailability] = useState(false)
  const [loadingCards, setLoadingCards] = useState(false)

  // Calculate trend percentages (mock data for now)
  const revenueTrend = 12.5
  const rentedTrend = 8.2
  const availableTrend = 5.7

  const loadSuppliers = useCallback(async () => {
    const data = await SupplierService.getAllSuppliers()
    return bookcarsHelper.flattenSuppliers(data)
  }, [])

  const fetchBookings = useCallback(async (_suppliers: string[]) => {
    try {
      setLoadingCards(true)
      const filter: bookcarsTypes.Filter = {}
      if (from) {
        filter.from = from
      }
      if (to) {
        filter.to = to
      }

      const payload: bookcarsTypes.GetBookingsPayload = {
        suppliers: _suppliers,
        statuses: activeStatuses,
        filter,
      }

      const data = await BookingService.getBookings(payload, 1, 200)
      const result = data && data.length > 0 ? data[0]?.resultData || [] : []

      const sorted = [...result].sort((a, b) => new Date(b.from).getTime() - new Date(a.from).getTime())
      setRecentBookings(sorted.slice(0, 3))

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
      const bookings = bookingData && bookingData.length > 0 ? bookingData[0]?.resultData || [] : []
      const bookedCarIds = new Set(bookings.map((b) => (typeof b.car === 'string' ? b.car : b.car._id)).filter(Boolean) as string[])

      const carsData = await CarService.getCars('', {
        suppliers,
        ranges: carRange !== 'all' ? [carRange] : undefined,
        availability: [bookcarsTypes.Availablity.Available],
        from,
        to,
      }, 1, 200)
      const carsPage = carsData && carsData.length > 0 ? carsData[0] : undefined
      const cars = carsPage?.resultData || []
      const totalCars = Number(carsPage?.pageInfo?.totalRecords ?? 0)
      const filtered = cars.filter((c) => !bookedCarIds.has(c._id || ''))
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
      // Get total cars count
      let totalCars = 0
      let allSupplierIds = _suppliers
      
      // Try to get all suppliers for accurate fleet count
      try {
        const allSuppliersData = await SupplierService.getAllSuppliers()
        allSupplierIds = bookcarsHelper.flattenSuppliers(allSuppliersData)
      } catch (err) {
        // Fall back to user's suppliers if can't get all
      }
      
      // Fetch cars with a large page size to get accurate count
      try {
        // Try with all suppliers first
        if (allSupplierIds.length > 0) {
          const carsData = await CarService.getCars('', { suppliers: allSupplierIds }, 1, 500)
          
          if (carsData && carsData.length > 0 && carsData[0]) {
            const pageInfo = carsData[0].pageInfo
            const resultData = carsData[0].resultData || []
            
            // Try to get total from pageInfo
            if (Array.isArray(pageInfo) && pageInfo.length > 0) {
              totalCars = Number(pageInfo[0]?.totalRecords ?? resultData.length)
            } else {
              totalCars = resultData.length
            }
          }
        }
        
        // If still 0, try without supplier filter
        if (totalCars === 0) {
          const carsData = await CarService.getCars('', { suppliers: [] }, 1, 500)
          
          if (carsData && carsData.length > 0 && carsData[0]) {
            const resultData = carsData[0].resultData || []
            totalCars = resultData.length
          }
        }
      } catch (err) {
        helper.error(err)
      }
      
      // Get bookings that are active TODAY
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const endOfToday = new Date(today)
      endOfToday.setHours(23, 59, 59, 999)
      
      const payload: bookcarsTypes.GetBookingsPayload = {
        suppliers: allSupplierIds.length > 0 ? allSupplierIds : _suppliers,
        statuses: activeStatuses,
      }
      
      const bookingsData = await BookingService.getBookings(payload, 1, 500)
      const allBookings = bookingsData && bookingsData.length > 0 ? bookingsData[0]?.resultData || [] : []
      
      // Filter bookings that are active today (rental period includes today)
      const todayTimestamp = today.getTime()
      const endOfTodayTimestamp = endOfToday.getTime()
      
      const bookingsActiveToday = allBookings.filter((booking) => {
        const fromDate = new Date(booking.from)
        fromDate.setHours(0, 0, 0, 0)
        const toDate = new Date(booking.to)
        toDate.setHours(23, 59, 59, 999)
        
        const fromTimestamp = fromDate.getTime()
        const toTimestamp = toDate.getTime()
        
        // Check if today falls within the rental period
        return fromTimestamp <= endOfTodayTimestamp && toTimestamp >= todayTimestamp
      })
      
      // Get unique car IDs that are rented today
      const rentedCarIds = new Set(
        bookingsActiveToday
          .map((b) => (typeof b.car === 'string' ? b.car : b.car?._id))
          .filter(Boolean) as string[]
      )
      
      // Calculate available cars: total cars - cars rented today
      const availableToday = Math.max(totalCars - rentedCarIds.size, 0)
      setAvailableCarsCount(availableToday)
    } catch (err) {
      helper.error(err)
    }
  }, [])

  const onLoad = async (_user?: bookcarsTypes.User) => {
    if (_user && _user.verified) {
      const supplierIds = helper.admin(_user)
        ? await loadSuppliers()
        : [_user._id || '']
      setSuppliers(supplierIds)
      await fetchBookings(supplierIds)
      await fetchCarsCount(supplierIds)
    }
  }

  // Transform data for chart
  const chartData = useMemo(() => {
    return earningsLabels.map((label, index) => ({
      date: format(new Date(label), 'd MMM'),
      revenue: earningsSeries[index] || 0,
    }))
  }, [earningsLabels, earningsSeries])

  const getStatusVariant = (status: bookcarsTypes.BookingStatus): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case bookcarsTypes.BookingStatus.Paid:
      case bookcarsTypes.BookingStatus.PaidInFull:
        return 'default'
      case bookcarsTypes.BookingStatus.Pending:
      case bookcarsTypes.BookingStatus.Deposit:
      case bookcarsTypes.BookingStatus.Reserved:
        return 'secondary'
      case bookcarsTypes.BookingStatus.Cancelled:
      case bookcarsTypes.BookingStatus.Void:
        return 'destructive'
      default:
        return 'outline'
    }
  }

  const getStatusLabel = (status: bookcarsTypes.BookingStatus): string => {
    switch (status) {
      case bookcarsTypes.BookingStatus.Paid:
        return 'Confirmed'
      case bookcarsTypes.BookingStatus.PaidInFull:
        return 'Confirmed'
      case bookcarsTypes.BookingStatus.Pending:
        return 'Reserved'
      case bookcarsTypes.BookingStatus.Deposit:
        return 'Partial'
      default:
        return status
    }
  }

  const getPaymentLabel = (status: bookcarsTypes.BookingStatus): string => {
    switch (status) {
      case bookcarsTypes.BookingStatus.Paid:
      case bookcarsTypes.BookingStatus.PaidInFull:
        return 'Paid'
      case bookcarsTypes.BookingStatus.Deposit:
        return 'Partial'
      default:
        return 'Pending'
    }
  }

  const currentDate = format(new Date(), 'EEEE, MMMM d, yyyy · h:mm a')

  return (
    <Layout strict onLoad={onLoad}>
      <div className="min-h-screen bg-neutral-50">
        <div className="mx-auto max-w-[1200px] px-6 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-neutral-900">Dashboard</h1>
            <p className="text-sm text-neutral-500 mt-1">{currentDate}</p>
          </div>

          {/* KPI Cards Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {/* Total Revenue */}
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-neutral-500 mb-1">Total Revenue</p>
                <p className="text-3xl font-semibold text-neutral-900">
                  {helper.formatCurrency(totalRevenue, env.CURRENCY || 'USD')}
                </p>
                <p className="text-xs text-green-600 mt-2">
                  +{revenueTrend}% vs last month
                </p>
              </CardContent>
            </Card>

            {/* Cars Rented */}
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-neutral-500 mb-1">Cars Rented</p>
                <p className="text-3xl font-semibold text-neutral-900">{activeBookingsCount}</p>
                <p className="text-xs text-green-600 mt-2">
                  +{rentedTrend}% vs last month
                </p>
              </CardContent>
            </Card>

            {/* Cars Available */}
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-neutral-500 mb-1">Cars Available Today</p>
                <p className="text-3xl font-semibold text-neutral-900">{availableCarsCount}</p>
                <p className="text-xs text-neutral-400 mt-2">
                  Not rented today
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Availability Search Card */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <h2 className="text-base font-medium text-neutral-900 mb-4">Check Availability</h2>
              <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1">
                  <label className="text-xs text-neutral-500 uppercase tracking-wide mb-2 block">From</label>
                  <DatePicker
                    date={from}
                    onDateChange={setFrom}
                    placeholder="Nov 20, 2023"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-neutral-500 uppercase tracking-wide mb-2 block">To</label>
                  <DatePicker
                    date={to}
                    onDateChange={setTo}
                    placeholder="Nov 27, 2023"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-neutral-500 uppercase tracking-wide mb-2 block">Car Type</label>
                  <Select value={carRange} onValueChange={setCarRange}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="car">Car</SelectItem>
                      <SelectItem value="suv">SUV</SelectItem>
                      <SelectItem value="van">Van</SelectItem>
                      <SelectItem value="scooter">Scooter</SelectItem>
                      <SelectItem value="bus">Bus</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={fetchAvailableCars}
                  disabled={loadingAvailability}
                  className="px-8"
                >
                  {loadingAvailability ? 'Searching...' : 'Search'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent Bookings - Full Width */}
          <Card className="mb-6">
            <CardHeader className="p-6 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-medium">Recent Bookings</CardTitle>
                <Button variant="ghost" size="sm" className="text-xs">
                  View all →
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              {loadingCards ? (
                <div className="h-[200px] flex items-center justify-center text-neutral-500">
                  Loading bookings...
                </div>
              ) : recentBookings.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs uppercase tracking-wide text-neutral-500">Customer</TableHead>
                      <TableHead className="text-xs uppercase tracking-wide text-neutral-500">Vehicle</TableHead>
                      <TableHead className="text-xs uppercase tracking-wide text-neutral-500">Rental Period</TableHead>
                      <TableHead className="text-xs uppercase tracking-wide text-neutral-500">Status</TableHead>
                      <TableHead className="text-xs uppercase tracking-wide text-neutral-500">Payment</TableHead>
                      <TableHead className="text-xs uppercase tracking-wide text-neutral-500 text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentBookings.map((booking) => {
                      const driver = typeof booking.driver === 'string' ? booking.driver : booking.driver?.fullName || '—'
                      const driverEmail = typeof booking.driver !== 'string' ? booking.driver?.email : ''
                      const carName = typeof booking.car === 'string' ? booking.car : booking.car?.name || 'Unknown'
                      const fromDate = format(new Date(booking.from), 'MMM d, yyyy')
                      const toDate = format(new Date(booking.to), 'MMM d, yyyy')

                      return (
                        <TableRow key={booking._id}>
                          <TableCell>
                            <div>
                              <p className="text-sm font-medium text-neutral-900">{driver}</p>
                              {driverEmail && <p className="text-xs text-neutral-500">{driverEmail}</p>}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-neutral-900">{carName}</TableCell>
                          <TableCell>
                            <div className="text-xs text-neutral-600">
                              <p>{fromDate}</p>
                              <p>to {toDate}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusVariant(booking.status)} className="text-xs">
                              {getStatusLabel(booking.status)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusVariant(booking.status)} className="text-xs">
                              {getPaymentLabel(booking.status)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm font-medium text-neutral-900 text-right">
                            {helper.formatCurrency(booking.price || 0, env.CURRENCY || 'USD')}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-neutral-500">
                  No recent bookings
                </div>
              )}
            </CardContent>
          </Card>

          {/* Reminders and New Customers - 60/40 Split */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
            {/* Reminders - 60% width (3/5) */}
            <Card className="lg:col-span-3">
              <CardHeader className="p-6 pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-medium">Reminders</CardTitle>
                  <span className="text-xs text-neutral-500">4 tasks today</span>
                </div>
              </CardHeader>
              <CardContent className="p-6 pt-0 space-y-4">
                <div className="border-l-2 border-neutral-900 pl-3">
                  <p className="text-sm text-neutral-900">Confirm customer bookings and update rental status</p>
                  <p className="text-xs text-neutral-500 mt-1 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Today 10:00 AM
                  </p>
                </div>
                <div className="border-l-2 border-neutral-300 pl-3">
                  <p className="text-sm text-neutral-900">Follow up with customers for outstanding payments</p>
                  <p className="text-xs text-neutral-500 mt-1 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Today 1:00 PM
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* New Customers - 40% width (2/5) */}
            <Card className="lg:col-span-2">
              <CardHeader className="p-6 pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-medium">New Customers</CardTitle>
                  <span className="text-xs text-neutral-500">43 this month</span>
                </div>
              </CardHeader>
              <CardContent className="p-6 pt-0 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-neutral-200 flex items-center justify-center text-xs font-medium">
                      OK
                    </div>
                    <span className="text-sm text-neutral-900">Olivia Kortonen</span>
                  </div>
                  <span className="text-xs text-neutral-500">15m ago</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-neutral-200 flex items-center justify-center text-xs font-medium">
                      SR
                    </div>
                    <span className="text-sm text-neutral-900">Sophia Rossi</span>
                  </div>
                  <span className="text-xs text-neutral-500">1hr ago</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-neutral-200 flex items-center justify-center text-xs font-medium">
                      ED
                    </div>
                    <span className="text-sm text-neutral-900">Eric Diaz</span>
                  </div>
                  <span className="text-xs text-neutral-500">3hr ago</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Revenue Chart Card */}
          <Card className="mb-6">
            <CardHeader className="p-6 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-medium">Revenue</CardTitle>
                  <p className="text-xs text-neutral-500 mt-1">Total earnings over time</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={revenueTimeRange === '12m' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setRevenueTimeRange('12m')}
                    className="text-xs"
                  >
                    12 months
                  </Button>
                  <Button
                    variant={revenueTimeRange === '30d' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setRevenueTimeRange('30d')}
                    className="text-xs"
                  >
                    30 days
                  </Button>
                  <Button
                    variant={revenueTimeRange === '7d' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setRevenueTimeRange('7d')}
                    className="text-xs"
                  >
                    7 days
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              {loadingCards ? (
                <div className="h-[300px] flex items-center justify-center text-neutral-500">
                  Loading chart data...
                </div>
              ) : chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: '#737373', fontSize: 12 }}
                      axisLine={{ stroke: '#e5e5e5' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: '#737373', fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(value) => `$${value}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e5e5e5',
                        borderRadius: '6px',
                        fontSize: '12px',
                      }}
                      formatter={(value: number | undefined) => [`$${value || 0}`, 'Revenue']}
                    />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="#171717"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-neutral-500">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  )
}

export default HomeScreen
