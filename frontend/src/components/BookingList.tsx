import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  DataGrid,
  GridColDef,
  GridPaginationModel,
  GridRowId,
  GridRenderCellParams
} from '@mui/x-data-grid'
import {
  Tooltip,
  IconButton,
  Card,
  CardContent,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
  Stack
} from '@mui/material'
import {
  Visibility as ViewIcon,
  Cancel as CancelIcon
} from '@mui/icons-material'
import { format } from 'date-fns'
import { fr as dfnsFR, enUS as dfnsENUS } from 'date-fns/locale'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import * as BookingService from '@/services/BookingService'
import * as PaymentService from '@/services/PaymentService'
import * as helper from '@/common/helper'
import { strings } from '@/lang/booking-list'
import { strings as commonStrings } from '@/lang/common'
import env from '@/config/env.config'
import BookingStatus from '@/components/BookingStatus'
import Extras from '@/components/Extras'

import '@/assets/css/booking-list.css'

interface BookingListProps {
  suppliers?: string[]
  statuses?: string[]
  filter?: bookcarsTypes.Filter | null
  car?: string
  user?: bookcarsTypes.User
  hideDates?: boolean
  hideCarColumn?: boolean
  hideSupplierColumn?: boolean
  language?: string
  loading?: boolean
  checkboxSelection?: boolean
  onLoad?: bookcarsTypes.DataEvent<bookcarsTypes.Booking>
}

const BookingList = ({
  suppliers: bookingSuppliers,
  statuses: bookingStatuses,
  filter: bookingFilter,
  car: bookingCar,
  user: bookingUser,
  loading: bookingLoading,
  hideDates,
  hideCarColumn,
  hideSupplierColumn,
  language,
  checkboxSelection,
  onLoad,
}: BookingListProps) => {
  const navigate = useNavigate()

  const [user, setUser] = useState<bookcarsTypes.User>()
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(env.isMobile ? env.BOOKINGS_MOBILE_PAGE_SIZE : env.BOOKINGS_PAGE_SIZE)
  const [columns, setColumns] = useState<GridColDef<bookcarsTypes.Booking>[]>([])
  const [rows, setRows] = useState<bookcarsTypes.Booking[]>([])
  const [rowCount, setRowCount] = useState(0)
  const [fetch, setFetch] = useState(false)
  const [selectedId, setSelectedId] = useState('')
  const [suppliers, setSuppliers] = useState<string[] | undefined>(bookingSuppliers)
  const [statuses, setStatuses] = useState<string[] | undefined>(bookingStatuses)
  const [filter, setFilter] = useState<bookcarsTypes.Filter | undefined | null>(bookingFilter)
  const [car, setCar] = useState<string>(bookingCar || '')
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    pageSize: env.BOOKINGS_PAGE_SIZE,
    page: 0,
  })
  const [init, setInit] = useState(true)
  const [loading, setLoading] = useState(false)
  const [openCancelDialog, setOpenCancelDialog] = useState(false)
  const [cancelRequestSent, setCancelRequestSent] = useState(false)
  const [cancelRequestProcessing, setCancelRequestProcessing] = useState(false)

  useEffect(() => {
    if (!env.isMobile) {
      setPage(paginationModel.page)
      setPageSize(paginationModel.pageSize)
    }
  }, [paginationModel])

  const fetchData = async (_page: number, _user?: bookcarsTypes.User) => {
    try {
      const _pageSize = env.isMobile ? env.BOOKINGS_MOBILE_PAGE_SIZE : pageSize

      if (suppliers && statuses) {
        setLoading(true)

        const payload: bookcarsTypes.GetBookingsPayload = {
          suppliers,
          statuses,
          filter: filter || undefined,
          car,
          user: (_user && _user._id) || undefined,
        }

        const data = await BookingService.getBookings(
          payload,
          _page + 1,
          _pageSize,
        )
        const _data = data && data.length > 0 ? data[0] : { pageInfo: { totalRecord: 0 }, resultData: [] }
        if (!_data) {
          helper.error()
          return
        }
        const totalRecords = Array.isArray(_data.pageInfo) && _data.pageInfo.length > 0 ? _data.pageInfo[0].totalRecords : 0

        for (const booking of _data.resultData) {
          booking.price = await PaymentService.convertPrice(booking.price!)
        }

        if (env.isMobile) {
          const _rows = _page === 0 ? _data.resultData : [...rows, ..._data.resultData]
          setRows(_rows)
          setRowCount(totalRecords)
          setFetch(_data.resultData.length > 0)
          if (onLoad) {
            onLoad({ rows: _data.resultData, rowCount: totalRecords })
          }
        } else {
          setRows(_data.resultData)
          setRowCount(totalRecords)
          if (onLoad) {
            onLoad({ rows: _data.resultData, rowCount: totalRecords })
          }
        }
      } else {
        setRows([])
        setRowCount(0)
        if (onLoad) {
          onLoad({ rows: [], rowCount: 0 })
        }
      }
    } catch (err) {
      helper.error(err)
    } finally {
      setLoading(false)
      setInit(false)
    }
  }

  useEffect(() => {
    setSuppliers(bookingSuppliers)
  }, [bookingSuppliers])

  useEffect(() => {
    setStatuses(bookingStatuses)
  }, [bookingStatuses])

  useEffect(() => {
    setFilter(bookingFilter)
  }, [bookingFilter])

  useEffect(() => {
    setCar(bookingCar || '')
  }, [bookingCar])

  useEffect(() => {
    setUser(bookingUser)
  }, [bookingUser])

  useEffect(() => {
    if (suppliers && statuses && user) {
      fetchData(page, user)
    }
  }, [page]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (suppliers && statuses && user) {
      if (page === 0) {
        fetchData(0, user)
      } else {
        const _paginationModel = bookcarsHelper.clone(paginationModel)
        _paginationModel.page = 0
        setPaginationModel(_paginationModel)
      }
    }
  }, [pageSize]) // eslint-disable-line react-hooks/exhaustive-deps

  const getDate = (date?: string) => {
    if (date) {
      const d = new Date(date)
      return `${bookcarsHelper.formatDatePart(d.getDate())}-${bookcarsHelper.formatDatePart(d.getMonth() + 1)}-${d.getFullYear()}`
    }

    throw new Error('Invalid date')
  }

  const getColumns = (): GridColDef<bookcarsTypes.Booking>[] => {
    const _columns: GridColDef<bookcarsTypes.Booking>[] = [
      {
        field: 'from',
        headerName: commonStrings.FROM,
        flex: 1,
        valueGetter: (value: string) => getDate(value),
      },
      {
        field: 'to',
        headerName: commonStrings.TO,
        flex: 1,
        valueGetter: (value: string) => getDate(value),
      },
      {
        field: 'price',
        headerName: strings.PRICE,
        flex: 1,
        renderCell: ({ value }: GridRenderCellParams<bookcarsTypes.Booking, string>) => <span className="bp">{value}</span>,
        valueGetter: (value: number) => bookcarsHelper.formatPrice(value, commonStrings.CURRENCY, language as string),
      },
      {
        field: 'status',
        headerName: strings.STATUS,
        flex: 1,
        renderCell: ({ value }: GridRenderCellParams<bookcarsTypes.Booking, bookcarsTypes.BookingStatus>) => <BookingStatus value={value!} showIcon />,
        valueGetter: (value: string) => value,
      },
      {
        field: 'action',
        headerName: '',
        sortable: false,
        disableColumnMenu: true,
        renderCell: ({ row }: GridRenderCellParams<bookcarsTypes.Booking>) => {
          const cancelBooking = (e: React.MouseEvent<HTMLElement>) => {
            e.stopPropagation() // don't select this row after clicking
            setSelectedId(row._id || '')
            setOpenCancelDialog(true)
          }

          const today = new Date()
          today.setHours(0)
          today.setMinutes(0)
          today.setSeconds(0)
          today.setMilliseconds(0)

          return (
            <>
              <Tooltip title={strings.VIEW}>
                <IconButton onClick={() => navigate(`/booking?b=${row._id}`)}>
                  <ViewIcon />
                </IconButton>
              </Tooltip>
              {row.cancellation
                && !row.cancelRequest
                && row.status !== bookcarsTypes.BookingStatus.Cancelled
                && new Date(row.from) >= today && (
                  <Tooltip title={strings.CANCEL}>
                    <IconButton onClick={cancelBooking}>
                      <CancelIcon />
                    </IconButton>
                  </Tooltip>
                )}
            </>
          )
        },
      },
    ]

    if (hideDates) {
      _columns.splice(0, 2)
    }

    if (!hideCarColumn) {
      _columns.unshift({
        field: 'car',
        headerName: strings.CAR,
        flex: 1,
        valueGetter: (value: bookcarsTypes.Car) => value?.name,
      })
    }

    if (!hideSupplierColumn) {
      _columns.unshift({
        field: 'supplier',
        headerName: commonStrings.SUPPLIER,
        flex: 1,
        renderCell: ({ row, value }: GridRenderCellParams<bookcarsTypes.Booking, string>) => (
          <div className="cell-supplier">
            <img src={bookcarsHelper.joinURL(env.CDN_USERS, (row.supplier as bookcarsTypes.User).avatar)} alt={value} />
          </div>
        ),
        valueGetter: (value: bookcarsTypes.User) => value?.fullName,
      })
    }

    return _columns
  }

  useEffect(() => {
    if (suppliers && statuses && user) {
      const _columns = getColumns()
      setColumns(_columns)

      if (page === 0) {
        fetchData(0, user)
      } else {
        const _paginationModel = bookcarsHelper.clone(paginationModel)
        _paginationModel.page = 0
        setPaginationModel(_paginationModel)
      }
    }
  }, [suppliers, statuses, filter]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (env.isMobile) {
      const element = document.querySelector('body')

      if (element) {
        element.onscroll = () => {
          if (fetch
            && !loading
            && window.scrollY > 0
            && window.scrollY + window.innerHeight + env.INFINITE_SCROLL_OFFSET >= document.body.scrollHeight) {
            setLoading(true)
            setPage(page + 1)
          }
        }
      }
    }
  }, [page, fetch, loading])

  const handleCloseCancelBooking = () => {
    setOpenCancelDialog(false)
    if (cancelRequestSent) {
      setTimeout(() => {
        setCancelRequestSent(false)
      }, 500)
    }
  }

  const handleConfirmCancelBooking = async () => {
    try {
      setCancelRequestProcessing(true)
      const status = await BookingService.cancel(selectedId)
      if (status === 200) {
        const row = rows.find((r) => r._id === selectedId)
        if (row) {
          row.cancelRequest = true

          setCancelRequestSent(true)
          setRows(rows)
          setSelectedId('')
          setCancelRequestProcessing(false)
        } else {
          helper.error()
        }
      } else {
        helper.error()
        setOpenCancelDialog(false)
        setCancelRequestProcessing(false)
      }
    } catch (err) {
      helper.error(err)
      setOpenCancelDialog(false)
      setCancelRequestProcessing(false)
    }
  }

  const _fr = language === 'fr'
  const _locale = _fr ? dfnsFR : dfnsENUS
  const _format = _fr ? 'eee d LLL yyyy kk:mm' : 'eee, d LLL yyyy, p'
  const bookingDetailHeight = env.SUPPLIER_IMAGE_HEIGHT + 10

  return (
    <div className="bs-list">
      {user
        && (rows.length === 0 ? (
          !init
          && !loading
          && !bookingLoading
          && (
            <Card variant="outlined" className="empty-list">
              <CardContent>
                <Typography color="textSecondary">{strings.EMPTY_LIST}</Typography>
              </CardContent>
            </Card>
          )
        ) : env.isMobile ? (
          <>
            {rows.map((booking) => {
              const _bookingCar = booking.car as bookcarsTypes.Car
              const bookingSupplier = booking.supplier as bookcarsTypes.User
              const from = new Date(booking.from)
              const to = new Date(booking.to)
              const days = bookcarsHelper.days(from, to)

              return (
                <div key={booking._id} className="booking-details">
                  <div className={`bs bs-${booking.status}`}>
                    <span>{helper.getBookingStatus(booking.status)}</span>
                  </div>
                  <div className="booking-detail" style={{ height: bookingDetailHeight }}>
                    <span className="booking-detail-title">{strings.CAR}</span>
                    <div className="booking-detail-value">{_bookingCar.name}</div>
                  </div>
                  <div className="booking-detail" style={{ height: bookingDetailHeight }}>
                    <span className="booking-detail-title">{strings.DAYS}</span>
                    <div className="booking-detail-value">
                      {`${helper.getDaysShort(bookcarsHelper.days(from, to))} (${bookcarsHelper.capitalize(
                        format(from, _format, { locale: _locale }),
                      )} - ${bookcarsHelper.capitalize(format(to, _format, { locale: _locale }))})`}
                    </div>
                  </div>
                  <div className="booking-detail" style={{ height: bookingDetailHeight }}>
                    <span className="booking-detail-title">{commonStrings.PICK_UP_LOCATION}</span>
                    <div className="booking-detail-value">{(booking.pickupLocation as bookcarsTypes.Location).name}</div>
                  </div>
                  <div className="booking-detail" style={{ height: bookingDetailHeight }}>
                    <span className="booking-detail-title">{commonStrings.DROP_OFF_LOCATION}</span>
                    <div className="booking-detail-value">{(booking.dropOffLocation as bookcarsTypes.Location).name}</div>
                  </div>
                  <div className="booking-detail" style={{ height: bookingDetailHeight }}>
                    <span className="booking-detail-title">{commonStrings.SUPPLIER}</span>
                    <div className="booking-detail-value">
                      <div className="car-supplier">
                        <img src={bookcarsHelper.joinURL(env.CDN_USERS, bookingSupplier.avatar)} alt={bookingSupplier.fullName} />
                        <span className="car-supplier-name">{bookingSupplier.fullName}</span>
                      </div>
                    </div>
                  </div>

                  {(booking.cancellation
                    || booking.amendments
                    || booking.collisionDamageWaiver
                    || booking.theftProtection
                    || booking.fullInsurance
                    || booking.additionalDriver) && (
                      <Extras
                        booking={booking}
                        days={days}
                      />
                    )}
                  <div className="booking-detail" style={{ height: bookingDetailHeight }}>
                    <span className="booking-detail-title">{strings.COST}</span>
                    <div className="booking-detail-value booking-price">{bookcarsHelper.formatPrice(booking.price as number, commonStrings.CURRENCY, language as string)}</div>
                  </div>

                  <div className="bs-buttons">
                    {booking.cancellation
                      && !booking.cancelRequest
                      && booking.status !== bookcarsTypes.BookingStatus.Cancelled
                      && new Date(booking.from) > new Date() && (
                        <Button
                          variant="contained"
                          className="btn-secondary"
                          onClick={() => {
                            setSelectedId(booking._id as string)
                            setOpenCancelDialog(true)
                          }}
                        >
                          {strings.CANCEL}
                        </Button>
                      )}
                  </div>
                </div>
              )
            })}
          </>
        ) : (
          <DataGrid
            className="data-grid"
            checkboxSelection={checkboxSelection}
            getRowId={(row: bookcarsTypes.Booking): GridRowId => row._id as GridRowId}
            columns={columns}
            rows={rows}
            rowCount={rowCount}
            loading={loading}
            initialState={{
              pagination: {
                paginationModel: { pageSize: env.BOOKINGS_PAGE_SIZE },
              },
            }}
            pageSizeOptions={[env.BOOKINGS_PAGE_SIZE, 50, 100]}
            paginationMode="server"
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            disableRowSelectionOnClick
          />
        ))}

      <Dialog disableEscapeKeyDown maxWidth="xs" open={openCancelDialog}>
        <DialogTitle className="dialog-header">{!cancelRequestSent && !cancelRequestProcessing && commonStrings.CONFIRM_TITLE}</DialogTitle>
        <DialogContent className="dialog-content">
          {cancelRequestProcessing ? (
            <Stack sx={{ color: '#232323' }}>
              <CircularProgress color="inherit" />
            </Stack>
          ) : cancelRequestSent ? (
            strings.CANCEL_BOOKING_REQUEST_SENT
          ) : (
            strings.CANCEL_BOOKING
          )}
        </DialogContent>
        <DialogActions className="dialog-actions">
          {!cancelRequestProcessing && (
            <Button onClick={handleCloseCancelBooking} variant="outlined" color="primary" className="btn-secondary">
              {commonStrings.CLOSE}
            </Button>
          )}
          {!cancelRequestSent && !cancelRequestProcessing && (
            <Button onClick={handleConfirmCancelBooking} variant="contained" className="btn-primary">
              {commonStrings.CONFIRM}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </div>
  )
}

export default BookingList
