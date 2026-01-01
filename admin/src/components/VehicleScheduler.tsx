import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { strings } from '@/lang/bookings'
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
  if (_language === 'fr') {
    return fr
  }
  if (_language === 'es') {
    return es
  }
  return enUS
}

const formatRange = (range?: string) => {
  if (!range) {
    return undefined
  }
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
  const navigate = useNavigate()
  const [filter, setFilter] = useState<bookcarsTypes.Filter>()
  const [bookings, setBookings] = useState<bookcarsTypes.Booking[]>([])
  const [cars, setCars] = useState<bookcarsTypes.Car[]>([])
  const [zoom, setZoom] = useState<ZoomLevel>('month')
  const [loadingBookings, setLoadingBookings] = useState(false)
  const [loadingCars, setLoadingCars] = useState(false)

  const today = useMemo(() => startOfDay(new Date()), [])
  const [currentDate, setCurrentDate] = useState<Date>(() => startOfDay(new Date()))

  const locale = useMemo(() => getLocale(language), [language])

  // Configuration for continuous scroll
  const COLUMN_WIDTH = 50

  // Let's refine the range logic to be strictly based on months for smoother "infinite" feel
  // We will simply render X days starting from `startDate`.
  // To simulate infinite scroll, we need to track `startDate` tailored to be "Previous Month Start"

  // Fixed Sliding Window Configuration
  const PAST_DAYS = 10
  const FUTURE_DAYS = 30
  const NAVIGATION_SHIFT = 5

  const timelineStart = useMemo(() => {
    if (zoom === 'week') {
      return startOfWeek(currentDate, { weekStartsOn: 1 })
    }
    // Anchor - 10 days
    return addDays(startOfDay(currentDate), -PAST_DAYS)
  }, [currentDate, zoom])

  const timelineEnd = useMemo(() => {
    if (zoom === 'week') {
      return endOfDay(addDays(timelineStart, 6))
    }
    // Anchor + 30 days
    return endOfDay(addDays(startOfDay(currentDate), FUTURE_DAYS))
  }, [currentDate, zoom, timelineStart])

  const daysCount = useMemo(() => {
    return differenceInCalendarDays(timelineEnd, timelineStart) + 1
  }, [timelineEnd, timelineStart])

  const visibleDays = useMemo(
    () => Array.from({ length: daysCount }, (_, idx) => addDays(timelineStart, idx)),
    [timelineStart, daysCount],
  )

  // Scroll management
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const ignoreScrollComp = useRef(false)
  const [prevStart, setPrevStart] = useState(timelineStart)

  useLayoutEffect(() => {
    if (zoom === 'week') {
      return
    }

    if (ignoreScrollComp.current) {
      // Force scroll to "Today" column (Index = PAST_DAYS = 10)
      if (scrollRef.current) {
        scrollRef.current.scrollLeft = PAST_DAYS * COLUMN_WIDTH
      }
      ignoreScrollComp.current = false
      setPrevStart(timelineStart) // Sync baseline
      return
    }

    const diffDays = differenceInCalendarDays(timelineStart, prevStart)
    if (diffDays !== 0 && scrollRef.current) {
      // Compensation: If start moved +5 days (Forward), content moved Left.
      // We must scroll Left (-5 cols) to keep content static.
      scrollRef.current.scrollLeft -= diffDays * COLUMN_WIDTH
    }
    setPrevStart(timelineStart)
  }, [timelineStart, prevStart, zoom, PAST_DAYS, COLUMN_WIDTH])




  // Initial scroll to center (Current Month Start) on mount
  useEffect(() => {
    if (scrollRef.current && zoom === 'month') {
      // Scroll to Today or StartBound of Current Month
      // const daysToToday = differenceInCalendarDays(new Date(), timelineStart)
      // Or scroll to header of current month?
      // Actually, let's scroll to the start of the defined "Current Date" month
      const startOfCurrent = startOfMonth(currentDate)
      const daysOffset = differenceInCalendarDays(startOfCurrent, timelineStart)
      scrollRef.current.scrollLeft = daysOffset * COLUMN_WIDTH
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Run once on mount

  // Re-sync scroll when zoom changes to month
  useEffect(() => {
    if (zoom === 'month' && scrollRef.current) {
      const startOfCurrent = startOfMonth(currentDate)
      const daysOffset = differenceInCalendarDays(startOfCurrent, timelineStart)
      scrollRef.current.scrollLeft = daysOffset * COLUMN_WIDTH
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom]) // Only re-center when switching zoom levels, not when navigating dates

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
      const bufferDays = zoom === 'week' ? 7 : 0 // TimelineStart is already buffered for month
      const fetchStart = startOfDay(addDays(timelineStart, -bufferDays))
      const fetchEnd = endOfDay(addDays(timelineEnd, bufferDays))

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
    } catch {
      helper.error()
    } finally {
      setLoadingBookings(false)
    }
  }, [filter, suppliers, statuses, user, timelineEnd, timelineStart, zoom])

  const loadCars = useCallback(async () => {
    if (!suppliers?.length) {
      setCars([])
      return
    }

    setLoadingCars(true)
    try {
      const bufferDays = zoom === 'week' ? 7 : 0
      const fetchStart = startOfDay(addDays(timelineStart, -bufferDays))
      const fetchEnd = endOfDay(addDays(timelineEnd, bufferDays))

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
    } catch {
      helper.error()
    } finally {
      setLoadingCars(false)
    }
  }, [suppliers, timelineEnd, timelineStart, zoom])

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
      if (bookingEnd < timelineStart || bookingStart > timelineEnd) {
        return
      }

      const clampedStart = bookingStart < timelineStart ? timelineStart : bookingStart
      const clampedEnd = bookingEnd > timelineEnd ? timelineEnd : bookingEnd
      const offset = differenceInCalendarDays(clampedStart, timelineStart)
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
  }, [bookings, cars, timelineEnd, timelineStart])

  const carRows = useMemo(() => buildRows(), [buildRows])



  /* Navigation Handlers */
  const handlePrev = () => {
    if (zoom === 'week') {
      setCurrentDate((d) => addDays(d, -7))
    } else {
      setCurrentDate((d) => addDays(d, -NAVIGATION_SHIFT))
    }
  }

  const handleNext = () => {
    if (zoom === 'week') {
      setCurrentDate((d) => addDays(d, 7))
    } else {
      setCurrentDate((d) => addDays(d, NAVIGATION_SHIFT))
    }
  }

  const handleToday = () => {
    ignoreScrollComp.current = true
    setCurrentDate(startOfDay(new Date()))
  }

  const handleZoomChange = (nextZoom: ZoomLevel) => {
    setZoom(nextZoom)
  }

  const rangeLabel = useMemo(() => {
    if (zoom === 'week') {
      return `${format(timelineStart, 'd MMM', { locale })} – ${format(timelineEnd, 'd MMM yyyy', { locale })}`
    }
    // For month view, just show the central month name
    return format(currentDate, 'LLLL yyyy', { locale })
  }, [locale, timelineEnd, timelineStart, zoom, currentDate])

  const gridTemplate = useMemo(
    () => ({
      gridTemplateColumns: `repeat(${daysCount}, ${COLUMN_WIDTH}px)`,
    }),
    [daysCount],
  )

  // const rowHeight = 34
  const rowHeight = 28

  return (
    <div className="timeline">
      <div className="timeline-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="timeline-month">{rangeLabel}</div>
          <Button
            className="h-8 text-xs" /* height 32px to match timeline-btn */
            onClick={() => navigate('/create-booking')}
          >
            {strings.NEW_BOOKING}
          </Button>
        </div>
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

      <div className="timeline-scroll" ref={scrollRef}>
        <div style={{ minWidth: 'max-content' }}>
          <div
            className="timeline-scale"
            style={{ ['--day-count' as string]: daysCount } as React.CSSProperties}
          >
            <div className="timeline-row-label scale" style={{ zIndex: 20 }}>Car</div>
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
            {/* Show loading indicator overlay or top bar, but don't hide content */}
            {(loadingBookings || loadingCars) && (
              <div className="timeline-loading-overlay">
                <div className="timeline-loading-spinner" />
              </div>
            )}

            {!loadingBookings && !loadingCars && carRows.length === 0 && (
              <div className="timeline-empty">No cars or bookings in this range.</div>
            )}

            {carRows.map((row) => {
              const laneHeight = Math.max(row.laneCount, 1) * rowHeight + 8
              return (
                <div
                  key={(row.car as any)._id || row.car.name}
                  className="timeline-row"
                  style={{ minHeight: laneHeight }}
                >
                  <div className="timeline-row-label" style={{ zIndex: 20 }}>
                    <div className="timeline-car-name">{row.car.name || 'Car'}</div>
                    {row.car.licensePlate && (
                      <div className="timeline-car-meta">{row.car.licensePlate}</div>
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
    </div>
  )
}

export default VehicleScheduler
