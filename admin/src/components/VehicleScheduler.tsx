import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  addDays,
  differenceInCalendarDays,
  endOfDay,
  format,
  isSameDay,
  isWeekend,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { fr, enUS, es } from 'date-fns/locale'
import * as bookcarsTypes from ':bookcars-types'
import * as helper from '@/utils/helper'
import * as BookingService from '@/services/BookingService'
import * as CarService from '@/services/CarService'

type ZoomLevel = 'week' | 'month'

type PositionedBooking = {
  id: string
  carId: string
  lane: number
  offset: number
  span: number
  label: string
  color: string
  textColor?: string
  start: Date
  end: Date
  clampedStart: Date
  clampedEnd: Date
  customerName?: string
  status: bookcarsTypes.BookingStatus
}

type CarRow = {
  car: bookcarsTypes.Car
  bookings: PositionedBooking[]
  laneCount: number
}

interface VehicleSchedulerProps {
  suppliers: string[]
  statuses: string[]
  filter?: bookcarsTypes.Filter
  user?: bookcarsTypes.User
  language: string
}

const getLocale = (_language: string) => {
  if (_language === 'fr') return fr
  if (_language === 'es') return es
  return enUS
}

const formatRange = (range?: string) => {
  if (!range) return undefined
  const value = range.toLowerCase()
  switch (value) {
    case 'mini':
      return 'Car'
    case 'midi':
      return 'SUV'
    case 'maxi':
      return 'Van'
    case 'scooter':
      return 'Scooter'
    case 'bus':
      return 'Bus'
    case 'truck':
      return 'Truck'
    case 'caravan':
      return 'Caravan'
    default:
      return undefined
  }
}

const VehicleScheduler = ({
  suppliers,
  statuses,
  filter: filterFromProps,
  user,
  language,
}: VehicleSchedulerProps) => {
  const [filter, setFilter] = useState<bookcarsTypes.Filter>()
  const [bookings, setBookings] = useState<bookcarsTypes.Booking[]>([])
  const [cars, setCars] = useState<bookcarsTypes.Car[]>([])
  const [zoom, setZoom] = useState<ZoomLevel>('month')
  const [loadingBookings, setLoadingBookings] = useState(false)
  const [loadingCars, setLoadingCars] = useState(false)

  const today = useMemo(() => startOfDay(new Date()), [])
  const [rangeStart, setRangeStart] = useState<Date>(() => startOfDay(new Date()))

  const locale = useMemo(() => getLocale(language), [language])
  const rangeLength = zoom === 'week' ? 14 : 31
  const visibleStart = useMemo(() => startOfDay(rangeStart), [rangeStart])
  const visibleEnd = useMemo(
    () => endOfDay(addDays(visibleStart, rangeLength - 1)),
    [visibleStart, rangeLength],
  )

  const visibleDays = useMemo(
    () => Array.from({ length: rangeLength }, (_, idx) => addDays(visibleStart, idx)),
    [visibleStart, rangeLength],
  )

  useEffect(() => {
    setFilter(filterFromProps)
  }, [filterFromProps])

  const loadBookings = useCallback(async () => {
    if (!suppliers?.length || !statuses?.length) {
      setBookings([])
      return
    }

    setLoadingBookings(true)
    try {
      const bufferDays = zoom === 'week' ? 7 : 31
      const fetchStart = startOfDay(addDays(visibleStart, -bufferDays))
      const fetchEnd = endOfDay(addDays(visibleEnd, bufferDays))

      const composedFilter: bookcarsTypes.Filter = {
        ...filter,
        from: filter?.from || fetchStart,
        to: filter?.to || fetchEnd,
      }

      const payload: bookcarsTypes.GetBookingsPayload = {
        suppliers,
        statuses,
        filter: composedFilter,
        user: (user && user._id) || undefined,
      }

      const data = await BookingService.getBookings(payload, 1, 10000)
      const _data = data && data.length > 0 ? data[0] : undefined
      const result = _data?.resultData || []
      setBookings(result)
    } catch (err) {
      helper.error()
    } finally {
      setLoadingBookings(false)
    }
  }, [filter, suppliers, statuses, user, visibleEnd, visibleStart, zoom])

  const loadCars = useCallback(async () => {
    if (!suppliers?.length) {
      setCars([])
      return
    }

    setLoadingCars(true)
    try {
      const bufferDays = zoom === 'week' ? 7 : 31
      const fetchStart = startOfDay(addDays(visibleStart, -bufferDays))
      const fetchEnd = endOfDay(addDays(visibleEnd, bufferDays))

      const payload: bookcarsTypes.GetCarsPayload = {
        suppliers,
        includeAlreadyBookedCars: true,
        includeComingSoonCars: true,
        from: fetchStart,
        to: fetchEnd,
      }

      const data = await CarService.getCars('', payload, 1, 1000)
      const _data = data && data.length > 0 ? data[0] : undefined
      const result = _data?.resultData || []
      setCars(result)
    } catch (err) {
      helper.error()
    } finally {
      setLoadingCars(false)
    }
  }, [suppliers, visibleEnd, visibleStart, zoom])

  useEffect(() => {
    loadBookings()
  }, [loadBookings])

  useEffect(() => {
    loadCars()
  }, [loadCars])

  const buildRows = useCallback((): CarRow[] => {
    const rows = new Map<string, { car: bookcarsTypes.Car; bookings: PositionedBooking[] }>()

    cars.forEach((car) => {
      rows.set(car._id, { car, bookings: [] })
    })

    bookings.forEach((booking) => {
      const car = (booking.car || {}) as bookcarsTypes.Car
      const carId = (car && (car as any)._id) || (typeof booking.car === 'string' ? booking.car : booking._id) || ''
      if (!carId) {
        return
      }

      const bookingStart = startOfDay(new Date(booking.from))
      const bookingEnd = endOfDay(new Date(booking.to))

      // Skip bookings that are completely outside the visible window
      if (bookingEnd < visibleStart || bookingStart > visibleEnd) {
        return
      }

      const clampedStart = bookingStart < visibleStart ? visibleStart : bookingStart
      const clampedEnd = bookingEnd > visibleEnd ? visibleEnd : bookingEnd
      const offset = differenceInCalendarDays(clampedStart, visibleStart)
      const span = Math.max(1, differenceInCalendarDays(clampedEnd, clampedStart) + 1)

      const supplier = booking.supplier as bookcarsTypes.User
      const driver = booking.driver as bookcarsTypes.User
      const customerName = driver?.fullName || supplier?.fullName
      const statusLabel = helper.getBookingStatus(booking.status)
      const label = `${car.name || 'Car'} · ${customerName || 'Customer'} · ${statusLabel}`

      const positioned: PositionedBooking = {
        id: booking._id as string,
        carId,
        lane: 0,
        offset,
        span,
        label,
        color: helper.getBookingStatusBackgroundColor(booking.status),
        textColor: helper.getBookingStatusTextColor(booking.status),
        start: bookingStart,
        end: bookingEnd,
        clampedStart,
        clampedEnd,
        customerName,
        status: booking.status,
      }

      if (!rows.has(carId)) {
        rows.set(carId, { car, bookings: [] })
      }

      rows.get(carId)!.bookings.push(positioned)
    })

    return Array.from(rows.values()).map((row) => {
      const sorted = [...row.bookings].sort(
        (a, b) => a.start.getTime() - b.start.getTime(),
      )
      const lanes: Date[] = []

      const positioned = sorted.map((booking) => {
        let laneIndex = lanes.findIndex((laneEnd) => laneEnd < booking.start)
        if (laneIndex === -1) {
          lanes.push(booking.end)
          laneIndex = lanes.length - 1
        } else {
          lanes[laneIndex] = booking.end
        }
        return { ...booking, lane: laneIndex }
      })

      const laneCount = lanes.length || 1

      return {
        car: row.car,
        bookings: positioned,
        laneCount,
      }
    })
  }, [bookings, cars, visibleEnd, visibleStart])

  const carRows = useMemo(() => buildRows(), [buildRows])

  const handlePrev = () => {
    const step = zoom === 'week' ? 7 : 14
    setRangeStart((current) => addDays(current, -step))
  }

  const handleNext = () => {
    const step = zoom === 'week' ? 7 : 14
    setRangeStart((current) => addDays(current, step))
  }

  const handleToday = () => {
    const base = zoom === 'month' ? startOfDay(today) : startOfWeek(today, { weekStartsOn: 1 })
    setRangeStart(base)
  }

  const handleZoomChange = (nextZoom: ZoomLevel) => {
    setZoom(nextZoom)
    const base = nextZoom === 'week'
      ? startOfWeek(rangeStart, { weekStartsOn: 1 })
      : startOfDay(rangeStart)
    setRangeStart(base)
  }

  const rangeLabel = useMemo(() => {
    const sameMonth = format(visibleStart, 'yyyy-MM', { locale }) === format(visibleEnd, 'yyyy-MM', { locale })
    if (sameMonth) {
      return format(visibleStart, 'LLLL yyyy', { locale })
    }
    return `${format(visibleStart, 'd MMM yyyy', { locale })} – ${format(visibleEnd, 'd MMM yyyy', { locale })}`
  }, [locale, visibleEnd, visibleStart])

  const gridTemplate = useMemo(
    () => ({
      gridTemplateColumns: `repeat(${rangeLength}, minmax(36px, 1fr))`,
    }),
    [rangeLength],
  )

  const rowHeight = 34

  return (
    <div className="timeline">
      <div className="timeline-header">
        <div className="timeline-month">{rangeLabel}</div>
        <div className="timeline-controls">
          <div className="timeline-zoom">
            <button
              type="button"
              className={`timeline-chip ${zoom === 'week' ? 'active' : ''}`}
              onClick={() => handleZoomChange('week')}
            >
              Week
            </button>
            <button
              type="button"
              className={`timeline-chip ${zoom === 'month' ? 'active' : ''}`}
              onClick={() => handleZoomChange('month')}
            >
              Month
            </button>
          </div>
          <div className="timeline-nav">
            <button type="button" className="timeline-btn" onClick={handleToday}>
              Today
            </button>
            <button type="button" className="timeline-btn" onClick={handlePrev} aria-label="Previous">
              ‹
            </button>
            <button type="button" className="timeline-btn" onClick={handleNext} aria-label="Next">
              ›
            </button>
          </div>
        </div>
      </div>

      <div className="timeline-scroll">
        <div
          className="timeline-scale"
          style={{ ['--day-count' as string]: rangeLength } as React.CSSProperties}
        >
          <div className="timeline-row-label scale">Car</div>
          <div className="timeline-days" style={gridTemplate}>
            {visibleDays.map((day) => {
              const weekend = isWeekend(day)
              const todayMatch = isSameDay(day, today)
              return (
                <div
                  key={day.toISOString()}
                  className={`timeline-day ${weekend ? 'weekend' : ''} ${todayMatch ? 'today' : ''}`}
                >
                  <div className="timeline-day-number">{format(day, 'd', { locale })}</div>
                  <div className="timeline-day-weekday">{format(day, 'EEE', { locale })}</div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="timeline-body">
          {(loadingBookings || loadingCars) && <div className="timeline-empty">Loading timeline...</div>}
          {!loadingBookings && !loadingCars && carRows.length === 0 && (
            <div className="timeline-empty">No cars or bookings in this range.</div>
          )}

          {!loadingBookings && !loadingCars &&
            carRows.map((row) => {
              const laneHeight = Math.max(row.laneCount, 1) * rowHeight + 8
              return (
                <div
                  key={(row.car as any)._id || row.car.name}
                  className="timeline-row"
                  style={{ minHeight: laneHeight }}
                >
                  <div className="timeline-row-label">
                    <div className="timeline-car-name">{row.car.name || 'Car'}</div>
                    {row.car.licensePlate && (
                      <div className="timeline-car-meta">{row.car.licensePlate}</div>
                    )}
                    {formatRange(row.car.range as string | undefined) && (
                      <div className="timeline-car-meta subtle">
                        {formatRange(row.car.range as string | undefined)}
                      </div>
                    )}
                  </div>

                  <div className="timeline-row-grid" style={{ minHeight: laneHeight }}>
                    <div className="timeline-day-columns" style={gridTemplate}>
                      {visibleDays.map((day) => {
                        const weekend = isWeekend(day)
                        const todayMatch = isSameDay(day, today)
                        return (
                          <div
                            key={`${row.car.name}-${day.toISOString()}`}
                            className={`timeline-day-cell ${weekend ? 'weekend' : ''} ${todayMatch ? 'today' : ''}`}
                          />
                        )
                      })}
                    </div>

                    <div
                      className="timeline-booking-lanes"
                      style={{ ...gridTemplate, gridAutoRows: `${rowHeight}px` }}
                    >
                      {row.bookings.map((booking) => (
                        <button
                          type="button"
                          key={booking.id}
                          className={`timeline-booking status-${booking.status}`}
                          style={{
                            gridColumn: `${booking.offset + 1} / span ${booking.span}`,
                            gridRowStart: booking.lane + 1,
                            backgroundColor: booking.color,
                            color: booking.textColor || '#0f172a',
                          }}
                          onClick={() => {
                            if (booking.id) {
                              window.open(`/update-booking?b=${booking.id}`, '_blank')?.focus()
                            }
                          }}
                        >
                          <span className="timeline-booking-label">{booking.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })}
        </div>
      </div>
    </div>
  )
}

export default VehicleScheduler
