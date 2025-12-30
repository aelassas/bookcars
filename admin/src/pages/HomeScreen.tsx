import React, { useMemo, useState, useCallback } from 'react'
import MetricCard from '@/components/MetricCard'
import AvailabilityCard from '@/components/AvailabilityCard'
import EarningsChart from '@/components/EarningsChart'
import RecentBookingsTable from '@/components/RecentBookingsTable'
import AvailableCarsDialog from '@/components/AvailableCarsDialog'
import RemindersCard from '@/components/RemindersCard'
import DashboardHeader from '@/components/DashboardHeader'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import Layout from '@/components/Layout'
import * as BookingService from '@/services/BookingService'
import * as SupplierService from '@/services/SupplierService'
import * as CarService from '@/services/CarService'
import * as helper from '@/utils/helper'
import env from '@/config/env.config'

type MetricCardType = { label: string, value: string }

const reminders = [
  { title: 'Confirm customer bookings and update rental status', time: 'Today 10:00 AM' },
  { title: 'Follow up with customers for outstanding payments', time: 'Today 1:00 PM' },
]

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

  const metrics: MetricCardType[] = useMemo(() => ([
    { label: 'Total Revenue', value: helper.formatCurrency(totalRevenue, env.CURRENCY || 'USD') },
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
      const bookings = bookingData && bookingData.length > 0 ? bookingData[0]?.resultData || [] : []
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
      const totalCars = Number(carsPage?.pageInfo?.totalRecords ?? 0)
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
      const total = Number(data?.[0]?.pageInfo?.totalRecords ?? 0)
      setAvailableCarsCount(Math.max(total - activeBookingsCount, 0))
    } catch (err) {
      helper.error(err)
    }
  }, [activeBookingsCount])

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

  const earningsTotal = useMemo(() => earningsSeries.reduce((a, b) => a + b, 0), [earningsSeries])

  return (
    <Layout strict onLoad={onLoad}>
      <div className="min-h-screen bg-gray-50">
        <DashboardHeader
          onRefresh={() => suppliers.length && fetchBookings(suppliers)}
          loading={loadingCards}
        />

        <main className="pt-20 pb-8">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {metrics.map((metric) => (
                <MetricCard key={metric.label} label={metric.label} value={metric.value} />
              ))}
            </div>

            <div className="mt-6">
              <AvailabilityCard
                from={from}
                to={to}
                carRange={carRange}
                onFromChange={setFrom}
                onToChange={setTo}
                onCarRangeChange={setCarRange}
                onCheckAvailability={fetchAvailableCars}
                loading={loadingAvailability}
              />
            </div>

            <div className="mt-6">
              <EarningsChart
                labels={earningsLabels}
                series={earningsSeries}
                total={earningsTotal}
                currency={env.CURRENCY}
                loading={loadingCards}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
              <div className="md:col-span-2">
                <RecentBookingsTable
                  bookings={recentBookings}
                  formatCurrency={helper.formatCurrency}
                  currency={env.CURRENCY}
                  loading={loadingCards}
                />
              </div>

              <div>
                <RemindersCard reminders={reminders} className="h-full" />
              </div>
            </div>
          </div>
        </main>
      </div>

      <AvailableCarsDialog
        open={openAvailability}
        onOpenChange={setOpenAvailability}
        cars={availableCars}
        loading={loadingAvailability}
      />
    </Layout>
  )
}

export default HomeScreen
