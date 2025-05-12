import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Card,
  CardContent,
  Typography
} from '@mui/material'
import {
  LocalGasStation as CarTypeIcon,
  AccountTree as GearboxIcon,
  Person as SeatsIcon,
  AcUnit as AirconIcon,
  DirectionsCar as MileageIcon,
  Check as CheckIcon,
  Clear as UncheckIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Info as InfoIcon,
} from '@mui/icons-material'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import env from '@/config/env.config'
import Const from '@/config/const'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/cars'
import * as helper from '@/common/helper'
import * as CarService from '@/services/CarService'
import Pager from '@/components/Pager'
import SimpleBackdrop from '@/components/SimpleBackdrop'
import SupplierBadge from '@/components/SupplierBadge'

import DoorsIcon from '@/assets/img/car-door.png'
import RatingIcon from '@/assets/img/rating-icon.png'
import CO2MinIcon from '@/assets/img/co2-min-icon.png'
import CO2MiddleIcon from '@/assets/img/co2-middle-icon.png'
import CO2MaxIcon from '@/assets/img/co2-max-icon.png'

import '@/assets/css/car-list.css'

interface CarListProps {
  suppliers?: string[]
  keyword?: string
  carSpecs?: bookcarsTypes.CarSpecs
  carType?: string[]
  gearbox?: string[]
  mileage?: string[]
  fuelPolicy?: string[],
  deposit?: number
  availability?: string[]
  reload?: boolean
  cars?: bookcarsTypes.Car[]
  user?: bookcarsTypes.User
  booking?: bookcarsTypes.Booking
  className?: string
  loading?: boolean
  hideSupplier?: boolean
  hidePrice?: boolean
  language?: string
  range?: string[]
  multimedia?: string[]
  rating?: number
  seats?: number
  onLoad?: bookcarsTypes.DataEvent<bookcarsTypes.Car>
  onDelete?: (rowCount: number) => void
}

const CarList = ({
  suppliers: carSuppliers,
  keyword: carKeyword,
  carSpecs: _carSpecs,
  carType: _carType,
  gearbox: carGearbox,
  mileage: carMileage,
  fuelPolicy: _fuelPolicy,
  deposit: carDeposit,
  availability: carAvailability,
  reload,
  cars,
  user: carUser,
  booking,
  className,
  loading: carLoading,
  hideSupplier,
  hidePrice,
  language,
  range,
  multimedia,
  rating,
  seats,
  onLoad,
  onDelete
}: CarListProps) => {
  const navigate = useNavigate()

  const [user, setUser] = useState<bookcarsTypes.User>()
  const [init, setInit] = useState(true)
  const [loading, setLoading] = useState(false)
  const [fetch, setFetch] = useState(false)
  const [rows, setRows] = useState<bookcarsTypes.Car[]>([])
  const [page, setPage] = useState(1)
  const [rowCount, setRowCount] = useState(0)
  const [totalRecords, setTotalRecords] = useState(0)
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false)
  const [carId, setCarId] = useState('')
  const [carIndex, setCarIndex] = useState(-1)
  const [openInfoDialog, setOpenInfoDialog] = useState(false)

  useEffect(() => {
    if (env.PAGINATION_MODE === Const.PAGINATION_MODE.INFINITE_SCROLL || env.isMobile) {
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
  }, [fetch, loading, page])

  const fetchData = async (
    _page: number,
    suppliers?: string[],
    keyword?: string,
    carSpecs?: bookcarsTypes.CarSpecs,
    __carType?: string[],
    gearbox?: string[],
    mileage?: string[],
    fuelPolicy?: string[],
    deposit?: number,
    availability?: string[],
    _range?: string[],
    _multimedia?: string[],
    _rating?: number,
    _seats?: number,
  ) => {
    try {
      setLoading(true)

      const payload: bookcarsTypes.GetCarsPayload = {
        suppliers: suppliers ?? [],
        carSpecs,
        carType: __carType,
        gearbox,
        mileage,
        fuelPolicy,
        deposit,
        availability,
        ranges: _range,
        multimedia: _multimedia,
        rating: _rating,
        seats: _seats,
      }
      const data = await CarService.getCars(keyword || '', payload, _page, env.CARS_PAGE_SIZE)

      const _data = data && data.length > 0 ? data[0] : { pageInfo: { totalRecord: 0 }, resultData: [] }
      if (!_data) {
        helper.error()
        return
      }
      const _totalRecords = Array.isArray(_data.pageInfo) && _data.pageInfo.length > 0 ? _data.pageInfo[0].totalRecords : 0

      let _rows: bookcarsTypes.Car[] = []
      if (env.PAGINATION_MODE === Const.PAGINATION_MODE.INFINITE_SCROLL || env.isMobile) {
        _rows = _page === 1 ? _data.resultData : [...rows, ..._data.resultData]
      } else {
        _rows = _data.resultData
      }

      setRows(_rows)
      setRowCount((_page - 1) * env.CARS_PAGE_SIZE + _rows.length)
      setTotalRecords(_totalRecords)
      setFetch(_data.resultData.length > 0)

      if (((env.PAGINATION_MODE === Const.PAGINATION_MODE.INFINITE_SCROLL || env.isMobile) && _page === 1) || (env.PAGINATION_MODE === Const.PAGINATION_MODE.CLASSIC && !env.isMobile)) {
        window.scrollTo(0, 0)
      }

      if (onLoad) {
        onLoad({ rows: _data.resultData, rowCount: _totalRecords })
      }
    } catch (err) {
      helper.error(err)
    } finally {
      setLoading(false)
      setInit(false)
    }
  }

  useEffect(() => {
    if (carSuppliers) {
      if (carSuppliers.length > 0) {
        fetchData(
          page,
          carSuppliers,
          carKeyword,
          _carSpecs,
          _carType,
          carGearbox,
          carMileage,
          _fuelPolicy,
          carDeposit || 0,
          carAvailability,
          range,
          multimedia,
          rating,
          seats
        )
      } else {
        setRows([])
        setRowCount(0)
        setFetch(false)
        if (onLoad) {
          onLoad({ rows: [], rowCount: 0 })
        }
        setInit(false)
      }
    }
  }, [page, carSuppliers, carKeyword, _carSpecs, _carType, carGearbox, carMileage, _fuelPolicy, carDeposit, carAvailability, range, multimedia, rating, seats]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (cars) {
      setRows(cars)
      setRowCount(cars.length)
      setFetch(false)
      if (onLoad) {
        onLoad({ rows: cars, rowCount: cars.length })
      }
      // setLoading(false)
    }
  }, [cars]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setPage(1)
  }, [
    carSuppliers,
    carKeyword,
    _carSpecs,
    _carType,
    carGearbox,
    carMileage,
    _fuelPolicy,
    carDeposit,
    carAvailability,
    range,
    multimedia,
    rating,
    seats,
  ])

  useEffect(() => {
    if (reload) {
      setPage(1)
      fetchData(
        1,
        carSuppliers,
        carKeyword,
        _carSpecs,
        _carType,
        carGearbox,
        carMileage,
        _fuelPolicy,
        carDeposit,
        carAvailability,
        range,
        multimedia,
        rating,
        seats,
      )
    }
  }, [reload, carSuppliers, carKeyword, _carSpecs, _carType, carGearbox, carMileage, _fuelPolicy, carDeposit, carAvailability, range, multimedia, rating, seats,]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setUser(carUser)
  }, [carUser])

  const handleDelete = async (e: React.MouseEvent<HTMLElement>) => {
    try {
      const _carId = e.currentTarget.getAttribute('data-id') as string
      const _carIndex = Number(e.currentTarget.getAttribute('data-index') as string)

      const status = await CarService.check(_carId)

      if (status === 200) {
        setOpenInfoDialog(true)
      } else if (status === 204) {
        setOpenDeleteDialog(true)
        setCarId(_carId)
        setCarIndex(_carIndex)
      } else {
        helper.error()
      }
    } catch (err) {
      helper.error(err)
    }
  }

  const handleCloseInfo = () => {
    setOpenInfoDialog(false)
  }

  const handleConfirmDelete = async () => {
    try {
      if (carId !== '' && carIndex > -1) {
        setOpenDeleteDialog(false)

        const status = await CarService.deleteCar(carId)

        if (status === 200) {
          const _rowCount = rowCount - 1
          rows.splice(carIndex, 1)
          setRows(rows)
          setRowCount(_rowCount)
          setTotalRecords(totalRecords - 1)
          setCarId('')
          setCarIndex(-1)
          if (onDelete) {
            onDelete(_rowCount)
          }
          setLoading(false)
        } else {
          helper.error()
          setCarId('')
          setCarIndex(-1)
          setLoading(false)
        }
      } else {
        helper.error()
        setCarId('')
        setCarIndex(-1)
        setOpenDeleteDialog(false)
      }
    } catch (err) {
      helper.error(err)
    }
  }

  const handleCancelDelete = () => {
    setOpenDeleteDialog(false)
    setCarId('')
  }

  const getExtraIcon = (option: string, extra: number) => {
    let available = false
    if (booking) {
      if (option === 'cancellation' && booking.cancellation && extra > 0) {
        available = true
      }
      if (option === 'amendments' && booking.amendments && extra > 0) {
        available = true
      }
      if (option === 'collisionDamageWaiver' && booking.collisionDamageWaiver && extra > 0) {
        available = true
      }
      if (option === 'theftProtection' && booking.theftProtection && extra > 0) {
        available = true
      }
      if (option === 'fullInsurance' && booking.fullInsurance && extra > 0) {
        available = true
      }
      if (option === 'additionalDriver' && booking.additionalDriver && extra > 0) {
        available = true
      }
    }

    return extra === -1
      ? <UncheckIcon className="unavailable" />
      : extra === 0 || available
        ? <CheckIcon className="available" />
        : <InfoIcon className="extra-info" />
  }

  const admin = helper.admin(user)
  const fr = bookcarsHelper.isFrench(language)

  return (
    (user && (
      <>
        <section className={`${className ? `${className} ` : ''}car-list`}>
          {rows.length === 0
            ? !init
            && !loading
            && !carLoading
            && (
              <Card variant="outlined" className="empty-list">
                <CardContent>
                  <Typography color="textSecondary">{strings.EMPTY_LIST}</Typography>
                </CardContent>
              </Card>
            )
            : rows.map((car, index) => {
              const edit = admin || car.supplier._id === user._id
              return (
                <article key={car._id}>
                  <div className="car">
                    <img src={bookcarsHelper.joinURL(env.CDN_CARS, car.image)} alt={car.name} className="car-img" />
                    <div className="car-footer">
                      <div className="car-footer-row1">
                        <div className="rating">
                          {car.rating && car.rating >= 1 && (
                            <>
                              <span className="value">{car.rating.toFixed(2)}</span>
                              <img alt="Rating" src={RatingIcon} />
                            </>
                          )}
                          {car.trips >= 10 && <span className="trips">{`(${car.trips} ${strings.TRIPS})`}</span>}
                        </div>
                        {car.co2 && (
                          <div className="co2">
                            <img
                              alt="CO2 Effect"
                              src={
                                car.co2 <= 90
                                  ? CO2MinIcon
                                  : car.co2 <= 110
                                    ? CO2MiddleIcon
                                    : CO2MaxIcon
                              }
                            />
                            <span>{strings.CO2}</span>
                          </div>
                        )}
                      </div>
                      {!hideSupplier && (
                        <SupplierBadge supplier={car.supplier} />
                      )}
                    </div>
                  </div>
                  <div className="car-info">
                    <div className="car-info-header">
                      <div className="name"><h2>{car.name}</h2></div>
                      {!hidePrice && <div className="price">{`${bookcarsHelper.formatPrice(car.dailyPrice, commonStrings.CURRENCY, language as string)}${commonStrings.DAILY}`}</div>}
                    </div>
                    <ul className="car-info-list">
                      {car.type !== bookcarsTypes.CarType.Unknown && (
                        <li className="car-type">
                          <Tooltip title={helper.getCarTypeTooltip(car.type)} placement="top">
                            <div className="car-info-list-item">
                              <CarTypeIcon />
                              <span className="car-info-list-text">{helper.getCarTypeShort(car.type)}</span>
                            </div>
                          </Tooltip>
                        </li>
                      )}
                      <li className="gearbox">
                        <Tooltip title={helper.getGearboxTooltip(car.gearbox)} placement="top">
                          <div className="car-info-list-item">
                            <GearboxIcon />
                            <span className="car-info-list-text">{helper.getGearboxTypeShort(car.gearbox)}</span>
                          </div>
                        </Tooltip>
                      </li>
                      {car.seats > 0 && (
                        <li className="seats">
                          <Tooltip title={helper.getSeatsTooltip(car.seats)} placement="top">
                            <div className="car-info-list-item">
                              <SeatsIcon />
                              <span className="car-info-list-text">{car.seats}</span>
                            </div>
                          </Tooltip>
                        </li>
                      )}
                      {car.doors > 0 && (
                        <li className="doors">
                          <Tooltip title={helper.getDoorsTooltip(car.doors)} placement="top">
                            <div className="car-info-list-item">
                              <img src={DoorsIcon} alt="" className="car-doors" />
                              <span className="car-info-list-text">{car.doors}</span>
                            </div>
                          </Tooltip>
                        </li>
                      )}
                      {car.aircon && (
                        <li className="aircon">
                          <Tooltip title={strings.AIRCON_TOOLTIP} placement="top">
                            <div className="car-info-list-item">
                              <AirconIcon />
                            </div>
                          </Tooltip>
                        </li>
                      )}
                    </ul>
                    <ul className="extras-list">
                      {car.mileage !== 0 && (
                        <li className="mileage">
                          <Tooltip title={helper.getMileageTooltip(car.mileage, language as string)} placement="left">
                            <div className="car-info-list-item">
                              <MileageIcon />
                              <span className="car-info-list-text">{`${strings.MILEAGE}${fr ? ' : ' : ': '}${helper.getMileage(car.mileage, language as string)}`}</span>
                            </div>
                          </Tooltip>
                        </li>
                      )}
                      <li className="fuel-policy">
                        <Tooltip title={helper.getFuelPolicyTooltip(car.fuelPolicy)} placement="left">
                          <div className="car-info-list-item">
                            <CarTypeIcon />
                            <span className="car-info-list-text">{`${strings.FUEL_POLICY}${fr ? ' : ' : ': '}${helper.getFuelPolicy(car.fuelPolicy)}`}</span>
                          </div>
                        </Tooltip>
                      </li>
                      {edit && (
                        <>
                          <li className={car.available ? 'car-available' : 'car-unavailable'}>
                            <Tooltip title={car.available ? strings.CAR_AVAILABLE_TOOLTIP : strings.CAR_UNAVAILABLE_TOOLTIP}>
                              <div className="car-info-list-item">
                                {car.available ? <CheckIcon /> : <UncheckIcon />}
                                {car.available ? <span className="car-info-list-text">{strings.CAR_AVAILABLE}</span> : <span className="car-info-list-text">{strings.CAR_UNAVAILABLE}</span>}
                              </div>
                            </Tooltip>
                          </li>
                          {car.fullyBooked && (
                            <li className="car-unavailable">
                              <div className="car-info-list-item">
                                <UncheckIcon />
                                <span className="car-info-list-text">{strings.FULLY_BOOKED}</span>
                              </div>
                            </li>
                          )}
                          {car.comingSoon && (
                            <li className="car-coming-soon">
                              <div className="car-info-list-item">
                                <CheckIcon />
                                <span className="car-info-list-text">{strings.COMING_SOON}</span>
                              </div>
                            </li>
                          )}
                        </>
                      )}
                      {car.cancellation > -1 && (
                        <li>
                          <Tooltip title={booking ? '' : car.cancellation > -1 ? strings.CANCELLATION_TOOLTIP : helper.getCancellation(car.cancellation, language as string)} placement="left">
                            <div className="car-info-list-item">
                              {getExtraIcon('cancellation', car.cancellation)}
                              <span className="car-info-list-text">{helper.getCancellation(car.cancellation, language as string)}</span>
                            </div>
                          </Tooltip>
                        </li>
                      )}
                      {car.amendments > -1 && (
                        <li>
                          <Tooltip title={booking ? '' : car.amendments > -1 ? strings.AMENDMENTS_TOOLTIP : helper.getAmendments(car.amendments, language as string)} placement="left">
                            <div className="car-info-list-item">
                              {getExtraIcon('amendments', car.amendments)}
                              <span className="car-info-list-text">{helper.getAmendments(car.amendments, language as string)}</span>
                            </div>
                          </Tooltip>
                        </li>
                      )}
                      {car.theftProtection > -1 && (
                        <li>
                          <Tooltip
                            title={booking ? '' : car.theftProtection > -1 ? strings.THEFT_PROTECTION_TOOLTIP : helper.getTheftProtection(car.theftProtection, language as string)}
                            placement="left"
                          >
                            <div className="car-info-list-item">
                              {getExtraIcon('theftProtection', car.theftProtection)}
                              <span className="car-info-list-text">{helper.getTheftProtection(car.theftProtection, language as string)}</span>
                            </div>
                          </Tooltip>
                        </li>
                      )}
                      {car.collisionDamageWaiver > -1 && (
                        <li>
                          <Tooltip
                            title={
                              booking ? '' : car.collisionDamageWaiver > -1 ? strings.COLLISION_DAMAGE_WAVER_TOOLTIP : helper.getCollisionDamageWaiver(car.collisionDamageWaiver, language as string)
                            }
                            placement="left"
                          >
                            <div className="car-info-list-item">
                              {getExtraIcon('collisionDamageWaiver', car.collisionDamageWaiver)}
                              <span className="car-info-list-text">{helper.getCollisionDamageWaiver(car.collisionDamageWaiver, language as string)}</span>
                            </div>
                          </Tooltip>
                        </li>
                      )}
                      {car.fullInsurance > -1 && (
                        <li>
                          <Tooltip title={booking ? '' : car.fullInsurance > -1 ? strings.FULL_INSURANCE_TOOLTIP : helper.getFullInsurance(car.fullInsurance, language as string)} placement="left">
                            <div className="car-info-list-item">
                              {getExtraIcon('fullInsurance', car.fullInsurance)}
                              <span className="car-info-list-text">{helper.getFullInsurance(car.fullInsurance, language as string)}</span>
                            </div>
                          </Tooltip>
                        </li>
                      )}
                      {car.additionalDriver > -1 && (
                        <li>
                          <Tooltip title={booking ? '' : helper.getAdditionalDriver(car.additionalDriver, language as string)} placement="left">
                            <div className="car-info-list-item">
                              {getExtraIcon('additionalDriver', car.additionalDriver)}
                              <span className="car-info-list-text">{helper.getAdditionalDriver(car.additionalDriver, language as string)}</span>
                            </div>
                          </Tooltip>
                        </li>
                      )}
                    </ul>
                    <div className="action">
                      {edit && (
                        <>
                          <Tooltip title={strings.VIEW_CAR}>
                            <IconButton onClick={() => navigate(`/car?cr=${car._id}`)}>
                              <ViewIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={commonStrings.UPDATE}>
                            <IconButton onClick={() => navigate(`/update-car?cr=${car._id}`)}>
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          {/* <Tooltip title={commonStrings.DELETE}>
                            <IconButton data-id={car._id} data-index={index} onClick={handleDelete}>
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip> */}
                        </>
                      )}
                    </div>
                  </div>
                </article>
              )
            })}
          <Dialog disableEscapeKeyDown maxWidth="xs" open={openInfoDialog}>
            <DialogTitle className="dialog-header">{commonStrings.INFO}</DialogTitle>
            <DialogContent>{strings.CANNOT_DELETE_CAR}</DialogContent>
            <DialogActions className="dialog-actions">
              <Button onClick={handleCloseInfo} variant="contained" className="btn-secondary">
                {commonStrings.CLOSE}
              </Button>
            </DialogActions>
          </Dialog>

          <Dialog disableEscapeKeyDown maxWidth="xs" open={openDeleteDialog}>
            <DialogTitle className="dialog-header">{commonStrings.CONFIRM_TITLE}</DialogTitle>
            <DialogContent>{strings.DELETE_CAR}</DialogContent>
            <DialogActions className="dialog-actions">
              <Button onClick={handleCancelDelete} variant="contained" className="btn-secondary">
                {commonStrings.CANCEL}
              </Button>
              <Button onClick={handleConfirmDelete} variant="contained" color="error">
                {commonStrings.DELETE}
              </Button>
            </DialogActions>
          </Dialog>
        </section>
        {env.PAGINATION_MODE === Const.PAGINATION_MODE.CLASSIC && !env.isMobile && (
          <Pager
            page={page}
            pageSize={env.CARS_PAGE_SIZE}
            rowCount={rowCount}
            totalRecords={totalRecords}
            onNext={() => setPage(page + 1)}
            onPrevious={() => setPage(page - 1)}
          />
        )}
        {loading && <SimpleBackdrop text={commonStrings.LOADING} />}
      </>
    )) || <></>
  )
}

export default CarList
