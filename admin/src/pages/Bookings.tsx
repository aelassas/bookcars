import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, MoreVertical, Edit, Trash2 } from 'lucide-react'
import { differenceInCalendarDays } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import PageContainer from '@/components/PageContainer'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import Layout from '@/components/Layout'
import { strings } from '@/lang/bookings'
import { strings as commonStrings } from '@/lang/common'
import * as helper from '@/utils/helper'
import * as BookingService from '@/services/BookingService'
import * as SupplierService from '@/services/SupplierService'

import '@/assets/css/bookings.css'

const Bookings = () => {
  const navigate = useNavigate()

  const [user, setUser] = useState<bookcarsTypes.User>()
  const [admin, setAdmin] = useState(false)
  const [bookings, setBookings] = useState<bookcarsTypes.Booking[]>([])
  const [filteredBookings, setFilteredBookings] = useState<bookcarsTypes.Booking[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [page, setPage] = useState(0)
  const [pageSize] = useState(20)

  const fetchBookings = async (_user: bookcarsTypes.User, _page: number = 0) => {
    try {
      setLoading(true)
      const _admin = helper.admin(_user)

      // Get all suppliers
      const allSuppliers = await SupplierService.getAllSuppliers()
      const suppliers = _admin ? bookcarsHelper.flattenSuppliers(allSuppliers) : [_user._id ?? '']

      // Get all statuses
      const statuses = helper.getBookingStatuses().map((status) => status.value)

      const payload: bookcarsTypes.GetBookingsPayload = {
        suppliers,
        statuses,
      }

      const data = await BookingService.getBookings(payload, _page + 1, pageSize)
      const _data = data && data.length > 0 ? data[0] : { pageInfo: { totalRecord: 0 }, resultData: [] }

      if (!_data) {
        helper.error()
        return
      }

      const totalRecords = Array.isArray(_data.pageInfo) && _data.pageInfo.length > 0 ? _data.pageInfo[0].totalRecords : 0

      setBookings(_data.resultData)
      setFilteredBookings(_data.resultData)
      setTotalCount(totalRecords)
    } catch (err) {
      helper.error(err)
    } finally {
      setLoading(false)
    }
  }

  const onLoad = async (_user?: bookcarsTypes.User) => {
    if (_user) {
      const _admin = helper.admin(_user)
      setUser(_user)
      setAdmin(_admin)
      await fetchBookings(_user, 0)
    }
  }

  // Filter bookings based on search and status
  useEffect(() => {
    let filtered = [...bookings]

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((booking) => {
        const driver = booking.driver as bookcarsTypes.User
        const car = booking.car as bookcarsTypes.Car
        const customerName = driver?.fullName?.toLowerCase() || ''
        const customerEmail = driver?.email?.toLowerCase() || ''
        const vehicleName = car?.name?.toLowerCase() || ''
        const bookingId = booking._id?.toLowerCase() || ''

        return (
          customerName.includes(query) ||
          customerEmail.includes(query) ||
          vehicleName.includes(query) ||
          bookingId.includes(query)
        )
      })
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((booking) => booking.status === statusFilter)
    }

    setFilteredBookings(filtered)
  }, [searchQuery, statusFilter, bookings])

  const getStatusBadgeVariant = (status: bookcarsTypes.BookingStatus) => {
    switch (status) {
      case bookcarsTypes.BookingStatus.Void:
        return 'bg-gray-100 text-gray-700 hover:bg-gray-100'
      case bookcarsTypes.BookingStatus.Pending:
        return 'bg-orange-100 text-orange-700 hover:bg-orange-100'
      case bookcarsTypes.BookingStatus.Deposit:
        return 'bg-blue-100 text-blue-700 hover:bg-blue-100'
      case bookcarsTypes.BookingStatus.Paid:
        return 'bg-green-100 text-green-700 hover:bg-green-100'
      case bookcarsTypes.BookingStatus.Reserved:
        return 'bg-purple-100 text-purple-700 hover:bg-purple-100'
      case bookcarsTypes.BookingStatus.Cancelled:
        return 'bg-red-100 text-red-700 hover:bg-red-100'
      default:
        return 'bg-gray-100 text-gray-700 hover:bg-gray-100'
    }
  }

  const getPaymentBadgeVariant = (status: bookcarsTypes.BookingStatus) => {
    switch (status) {
      case bookcarsTypes.BookingStatus.Paid:
        return 'bg-green-100 text-green-700 hover:bg-green-100'
      case bookcarsTypes.BookingStatus.Deposit:
        return 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100'
      case bookcarsTypes.BookingStatus.Pending:
        return 'bg-orange-100 text-orange-700 hover:bg-orange-100'
      default:
        return 'bg-gray-100 text-gray-700 hover:bg-gray-100'
    }
  }

  const getStatusLabel = (status: bookcarsTypes.BookingStatus) => {
    switch (status) {
      case bookcarsTypes.BookingStatus.Void:
        return 'Void'
      case bookcarsTypes.BookingStatus.Pending:
        return 'Pending'
      case bookcarsTypes.BookingStatus.Deposit:
        return 'Deposit'
      case bookcarsTypes.BookingStatus.Paid:
        return 'Confirmed'
      case bookcarsTypes.BookingStatus.Reserved:
        return 'Reserved'
      case bookcarsTypes.BookingStatus.Cancelled:
        return 'Cancelled'
      default:
        return status
    }
  }

  const getPaymentLabel = (status: bookcarsTypes.BookingStatus) => {
    switch (status) {
      case bookcarsTypes.BookingStatus.Paid:
        return 'Paid'
      case bookcarsTypes.BookingStatus.Deposit:
        return 'Partial'
      case bookcarsTypes.BookingStatus.Pending:
        return 'Pending'
      default:
        return 'Pending'
    }
  }

  const formatDate = (date?: Date | string) => {
    if (!date) return ''
    const d = new Date(date)
    return `${bookcarsHelper.formatDatePart(d.getDate())}-${bookcarsHelper.formatDatePart(d.getMonth() + 1)}-${d.getFullYear()}`
  }

  const formatPrice = (price?: number) => {
    return bookcarsHelper.formatPrice(price || 0, commonStrings.CURRENCY, user?.language || 'en')
  }

  return (
    <Layout onLoad={onLoad} strict>
      {user && (
        <PageContainer>
          {/* Page Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Bookings</h1>
              <p className="text-sm text-gray-500 mt-1">
                {totalCount} total booking{totalCount !== 1 ? 's' : ''}
              </p>
            </div>
            <Button
              onClick={() => navigate('/create-booking')}
              className="gap-2"
              size="default"
            >
              <Plus className="h-4 w-4" />
              {strings.NEW_BOOKING}
            </Button>
          </div>

          {/* Filters Row */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search by customer, vehicle, or booking ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {helper.getBookingStatuses().map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Table Card */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-semibold">BOOKERS NAME</TableHead>
                    <TableHead className="font-semibold">CAR BOOKED</TableHead>
                    <TableHead className="font-semibold">PICKUP DATE</TableHead>
                    <TableHead className="font-semibold">RETURN DATE</TableHead>
                    <TableHead className="font-semibold">DAYS</TableHead>
                    <TableHead className="font-semibold">EARNINGS</TableHead>
                    <TableHead className="font-semibold">PAYMENT STATUS</TableHead>
                    <TableHead className="font-semibold">INVOICE</TableHead>
                    <TableHead className="font-semibold">USERS RECEIPT</TableHead>
                    <TableHead className="font-semibold">SENT TO AADE MYDATA</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        Loading bookings...
                      </TableCell>
                    </TableRow>
                  ) : filteredBookings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        No bookings found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredBookings.map((booking) => {
                      const driver = booking.driver as bookcarsTypes.User
                      const car = booking.car as bookcarsTypes.Car
                      const days = differenceInCalendarDays(new Date(booking.to), new Date(booking.from)) + 1

                      return (
                        <TableRow
                          key={booking._id}
                          className="cursor-pointer hover:bg-muted/50 group"
                          onClick={() => navigate(`/bookings/${booking._id}`)}
                        >
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-semibold text-gray-900">{driver?.fullName}</span>
                              <span className="text-sm text-gray-500">{driver?.email}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-900">{car?.name}</TableCell>
                          <TableCell className="text-gray-900">{formatDate(booking.from)}</TableCell>
                          <TableCell className="text-gray-900">{formatDate(booking.to)}</TableCell>
                          <TableCell className="text-gray-900 font-medium">
                            {days}
                          </TableCell>
                          <TableCell className="text-gray-900 font-medium">
                            {formatPrice(booking.price)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              style={{
                                backgroundColor: helper.getBookingStatusBackgroundColor(booking.status),
                                color: helper.getBookingStatusTextColor(booking.status)
                              }}
                              className="hover:opacity-80 transition-opacity"
                            >
                              {helper.getBookingStatus(booking.status)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-gray-500 text-sm">
                            {booking.invoice ? booking.invoice : 'No invoice'}
                          </TableCell>
                          <TableCell className="text-gray-500 text-sm">
                            {booking.receipt ? booking.receipt : 'No receipt'}
                          </TableCell>
                          <TableCell className="text-gray-500 text-sm">
                            {/* TODO: Replace with real status when available in backend */}
                            {booking.aadeMyData ? 'Yes' : 'No'}
                          </TableCell>
                          <TableCell>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent align="end" className="w-[160px] p-1">
                                  <div className="flex flex-col gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="justify-start font-normal"
                                      onClick={() => navigate(`/update-booking?b=${booking._id}`)}
                                    >
                                      <Edit className="mr-2 h-4 w-4" />
                                      Edit
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="justify-start font-normal text-red-600 hover:text-red-600 hover:bg-red-50"
                                      onClick={() => {
                                        // TODO: Delete
                                      }}
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete
                                    </Button>
                                  </div>
                                </PopoverContent>
                              </Popover>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </PageContainer>
      )}
    </Layout>
  )
}

export default Bookings
