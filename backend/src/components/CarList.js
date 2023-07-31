import React, { useState, useEffect } from 'react'
import Env from '../config/env.config'
import Const from '../config/const'
import { strings as commonStrings } from '../lang/common'
import { strings } from '../lang/cars'
import * as Helper from '../common/Helper'
import * as CarService from '../services/CarService'
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
    LocalGasStation as FuelIcon,
    AccountTree as GearboxIcon,
    Person as SeatsIcon,
    AcUnit as AirconIcon,
    DirectionsCar as MileageIcon,
    Check as CheckIcon,
    Clear as UncheckIcon,
    Visibility as ViewIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Info as InfoIcon
} from '@mui/icons-material'
import Pager from './Pager'

import DoorsIcon from '../assets/img/car-door.png'

import '../assets/css/car-list.css'

const CarList = (props) => {
    const [user, setUser] = useState()
    const [loading, setLoading] = useState(true)
    const [fetch, setFetch] = useState(false)
    const [rows, setRows] = useState([])
    const [page, setPage] = useState(1)
    const [rowCount, setRowCount] = useState(0)
    const [totalRecords, setTotalRecords] = useState(0)
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false)
    const [carId, setCarId] = useState('')
    const [carIndex, setCarIndex] = useState(-1)
    const [openInfoDialog, setOpenInfoDialog] = useState(false)

    useEffect(() => {
        if (Env.PAGINATION_MODE === Const.PAGINATION_MODE.INFINITE_SCROLL || Env.isMobile()) {
            const element = document.querySelector('body')

            if (element) {
                element.onscroll = () => {
                    if (fetch
                        && !loading
                        && window.scrollY > 0
                        && (window.scrollY + window.innerHeight) >= document.body.scrollHeight) {
                        setPage(page + 1)
                    }
                }
            }
        }
    }, [fetch, loading, page])


    const _fetch = async (page, companies, keyword, fuel, gearbox, mileage, deposit, availability) => {
        try {
            setLoading(true)
            const payload = { companies, fuel, gearbox, mileage, deposit, availability }

            const data = await CarService.getCars(keyword, payload, page, Env.CARS_PAGE_SIZE)
            const _data = Array.isArray(data) && data.length > 0 ? data[0] : { resultData: [] }
            const totalRecords = Array.isArray(_data.pageInfo) && _data.pageInfo.length > 0 ? _data.pageInfo[0].totalRecords : 0

            let _rows = []
            if (Env.PAGINATION_MODE === Const.PAGINATION_MODE.INFINITE_SCROLL || Env.isMobile()) {
                _rows = page === 1 ? _data.resultData : [...rows, ..._data.resultData]
            } else {
                _rows = _data.resultData
            }

            setRows(_rows)
            setRowCount(((page - 1) * Env.CARS_PAGE_SIZE) + _rows.length)
            setTotalRecords(totalRecords)
            setFetch(_data.resultData.length > 0)

            if (
                ((Env.PAGINATION_MODE === Const.PAGINATION_MODE.INFINITE_SCROLL || Env.isMobile()) && page === 1)
                || (Env.PAGINATION_MODE === Const.PAGINATION_MODE.CLASSIC && !Env.isMobile())
            ) {
                window.scrollTo(0, 0)
            }

            if (props.onLoad) {
                props.onLoad({ rows: _data.resultData, rowCount: totalRecords })
            }
        } catch (err) {
            Helper.error(err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (props.companies) {
            if (props.companies.length > 0) {
                _fetch(page, props.companies, props.keyword, props.fuel, props.gearbox, props.mileage, props.deposit, props.availability)
            } else {
                setRows([])
                setRowCount(0)
                setFetch(false)
                if (props.onLoad) {
                    props.onLoad({ rows: [], rowCount: 0 })
                }
                // setLoading(false)
            }
        }
    }, [page, props.companies, props.keyword, props.fuel, props.gearbox, props.mileage, props.deposit, props.availability]) // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (props.cars) {
            setRows(props.cars)
            setRowCount(props.cars.length)
            setFetch(false)
            if (props.onLoad) {
                props.onLoad({ rows: props.cars, rowCount: props.cars.length })
            }
            // setLoading(false)
        }
    }, [props.cars]) // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        setPage(1)
    }, [props.companies, props.keyword, props.fuel, props.gearbox, props.mileage, props.deposit, props.availability])

    useEffect(() => {
        if (props.reload) {
            setPage(1)
            _fetch(1, props.companies, props.keyword, props.fuel, props.gearbox, props.mileage, props.deposit, props.availability)
        }
    }, [props.reload, props.companies, props.keyword, props.fuel, props.gearbox, props.mileage, props.deposit, props.availability]) // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        setUser(props.user)
    }, [props.user])

    const handleDelete = async (e) => {
        try {
            const carId = e.currentTarget.getAttribute('data-id')
            const carIndex = e.currentTarget.getAttribute('data-index')

            const status = await CarService.check(carId)

            if (status === 200) {
                setOpenInfoDialog(true)
            } else if (status === 204) {
                setOpenDeleteDialog(true)
                setCarId(carId)
                setCarIndex(carIndex)
            } else {
                Helper.error()
            }
        } catch (err) {
            Helper.error(err)
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
                    if (props.onDelete) {
                        props.onDelete(_rowCount)
                    }
                    setLoading(false)
                } else {
                    Helper.error()
                    setCarId('')
                    setCarIndex(-1)
                    setLoading(false)
                }
            } else {
                Helper.error()
                setCarId('')
                setCarIndex(-1)
                setOpenDeleteDialog(false)
            }
        } catch (err) {
            Helper.error(err)
        }
    }

    const handleCancelDelete = () => {
        setOpenDeleteDialog(false)
        setCarId('')
    }

    const getExtraIcon = (option, extra) => {
        let available = false
        if (props.booking) {
            if (option === 'cancellation' && props.booking.cancellation && extra > 0) available = true
            if (option === 'amendments' && props.booking.amendments && extra > 0) available = true
            if (option === 'collisionDamageWaiver' && props.booking.collisionDamageWaiver && extra > 0) available = true
            if (option === 'theftProtection' && props.booking.theftProtection && extra > 0) available = true
            if (option === 'fullInsurance' && props.booking.fullInsurance && extra > 0) available = true
            if (option === 'additionalDriver' && props.booking.additionalDriver && extra > 0) available = true
        }

        return extra === -1 ? <UncheckIcon className='unavailable' />
            : extra === 0 || available ? <CheckIcon className='available' />
                : <InfoIcon className='extra-info' />
    }

    const admin = Helper.admin(user)
    const fr = user && user.language === 'fr'

    return (
        user &&
        <>
            <section className={`${props.className ? `${props.className} ` : ''}car-list`}>
                {rows.length === 0 ?
                    !loading && !props.loading && <Card variant="outlined" className="empty-list">
                        <CardContent>
                            <Typography color="textSecondary">{strings.EMPTY_LIST}</Typography>
                        </CardContent>
                    </Card>
                    :
                    rows.map((car, index) => {
                        const edit = admin || car.company._id === user._id
                        return (
                            <article key={car._id}>
                                <div className='name'><h2>{car.name}</h2></div>
                                <div className='car'>
                                    <img src={Helper.joinURL(Env.CDN_CARS, car.image)}
                                        alt={car.name} className='car-img'
                                    />
                                    {!props.hideCompany && <div className='car-company'>
                                        <span className='car-company-logo'>
                                            <img src={Helper.joinURL(Env.CDN_USERS, car.company.avatar)}
                                                alt={car.company.fullName}
                                            />
                                        </span>
                                        <a href={`/supplier?c=${car.company._id}`} className='car-company-info'>
                                            {car.company.fullName}
                                        </a>
                                    </div>}
                                </div>
                                <div className='car-info'>
                                    <ul className='car-info-list'>
                                        <li className='car-type'>
                                            <Tooltip title={Helper.getCarTypeTooltip(car.type)} placement='top'>
                                                <div className='car-info-list-item'>
                                                    <FuelIcon />
                                                    <span className='car-info-list-text'>{Helper.getCarTypeShort(car.type)}</span>
                                                </div>
                                            </Tooltip>
                                        </li>
                                        <li className='gearbox'>
                                            <Tooltip title={Helper.getGearboxTooltip(car.gearbox)} placement='top'>
                                                <div className='car-info-list-item'>
                                                    <GearboxIcon />
                                                    <span className='car-info-list-text'>{Helper.getGearboxTypeShort(car.gearbox)}</span>
                                                </div>
                                            </Tooltip>
                                        </li>
                                        <li className='seats'>
                                            <Tooltip title={Helper.getSeatsTooltip(car.seats)} placement='top'>
                                                <div className='car-info-list-item'>
                                                    <SeatsIcon />
                                                    <span className='car-info-list-text'>{car.seats}</span>
                                                </div>
                                            </Tooltip>
                                        </li>
                                        <li className='doors'>
                                            <Tooltip title={Helper.getDoorsTooltip(car.doors)} placement='top'>
                                                <div className='car-info-list-item'>
                                                    <img src={DoorsIcon} alt='' className='car-doors' />
                                                    <span className='car-info-list-text'>{car.doors}</span>
                                                </div>
                                            </Tooltip>
                                        </li>
                                        {car.aircon &&
                                            <li className='aircon'>
                                                <Tooltip title={strings.AIRCON_TOOLTIP} placement='top'>
                                                    <div className='car-info-list-item'>
                                                        <AirconIcon />
                                                    </div>
                                                </Tooltip>
                                            </li>
                                        }
                                        <li className='mileage'>
                                            <Tooltip title={Helper.getMileageTooltip(car.mileage, fr)} placement='left'>
                                                <div className='car-info-list-item'>
                                                    <MileageIcon />
                                                    <span className='car-info-list-text'>{`${strings.MILEAGE}${fr ? ' : ' : ': '}${Helper.getMileage(car.mileage)}`}</span>
                                                </div>
                                            </Tooltip>
                                        </li>
                                        <li className='fuel-policy'>
                                            <Tooltip title={Helper.getFuelPolicyTooltip(car.fuelPolicy)} placement='left'>
                                                <div className='car-info-list-item'>
                                                    <FuelIcon />
                                                    <span className='car-info-list-text'>{`${strings.FUEL_POLICY}${fr ? ' : ' : ': '}${Helper.getFuelPolicy(car.fuelPolicy)}`}</span>
                                                </div>
                                            </Tooltip>
                                        </li>
                                    </ul>
                                    <ul className='extras-list'>
                                        {
                                            edit &&
                                            <li className={car.available ? 'car-available' : 'car-unavailable'}>
                                                <Tooltip title={car.available ? strings.CAR_AVAILABLE_TOOLTIP : strings.CAR_UNAVAILABLE_TOOLTIP}>
                                                    <div className='car-info-list-item'>
                                                        {car.available ? <CheckIcon /> : <UncheckIcon />}
                                                        {car.available ?
                                                            <span className='car-info-list-text'>{strings.CAR_AVAILABLE}</span>
                                                            :
                                                            <span className='car-info-list-text'>{strings.CAR_UNAVAILABLE}</span>
                                                        }
                                                    </div>
                                                </Tooltip>
                                            </li>
                                        }
                                        <li>
                                            <Tooltip title={props.booking ? '' : car.cancellation > -1 ? strings.CANCELLATION_TOOLTIP : Helper.getCancellation(car.cancellation, fr)} placement='left'>
                                                <div className='car-info-list-item'>
                                                    {getExtraIcon('cancellation', car.cancellation)}
                                                    <span className='car-info-list-text'>{Helper.getCancellation(car.cancellation, fr)}</span>
                                                </div>
                                            </Tooltip>
                                        </li>
                                        <li>
                                            <Tooltip title={props.booking ? '' : car.amendments > -1 ? strings.AMENDMENTS_TOOLTIP : Helper.getAmendments(car.amendments, fr)} placement='left'>
                                                <div className='car-info-list-item'>
                                                    {getExtraIcon('amendments', car.amendments)}
                                                    <span className='car-info-list-text'>{Helper.getAmendments(car.amendments, fr)}</span>
                                                </div>
                                            </Tooltip>
                                        </li>
                                        <li>
                                            <Tooltip title={props.booking ? '' : car.collisionDamageWaiver > -1 ? strings.COLLISION_DAMAGE_WAVER_TOOLTIP : Helper.getCollisionDamageWaiver(car.collisionDamageWaiver, fr)} placement='left'>
                                                <div className='car-info-list-item'>
                                                    {getExtraIcon('collisionDamageWaiver', car.collisionDamageWaiver)}
                                                    <span className='car-info-list-text'>{Helper.getCollisionDamageWaiver(car.collisionDamageWaiver, fr)}</span>
                                                </div>
                                            </Tooltip>
                                        </li>
                                        <li>
                                            <Tooltip title={props.booking ? '' : car.theftProtection > -1 ? strings.THEFT_PROTECTION_TOOLTIP : Helper.getTheftProtection(car.theftProtection, fr)} placement='left'>
                                                <div className='car-info-list-item'>
                                                    {getExtraIcon('theftProtection', car.theftProtection)}
                                                    <span className='car-info-list-text'>{Helper.getTheftProtection(car.theftProtection, fr)}</span>
                                                </div>
                                            </Tooltip>
                                        </li>
                                        <li>
                                            <Tooltip title={props.booking ? '' : car.fullInsurance > -1 ? strings.FULL_INSURANCE_TOOLTIP : Helper.getFullInsurance(car.fullInsurance, fr)} placement='left'>
                                                <div className='car-info-list-item'>
                                                    {getExtraIcon('fullInsurance', car.fullInsurance)}
                                                    <span className='car-info-list-text'>{Helper.getFullInsurance(car.fullInsurance, fr)}</span>
                                                </div>
                                            </Tooltip>
                                        </li>
                                        <li>
                                            <Tooltip title={props.booking ? '' : Helper.getAdditionalDriver(car.additionalDriver, fr)} placement='left'>
                                                <div className='car-info-list-item'>
                                                    {getExtraIcon('additionalDriver', car.additionalDriver)}
                                                    <span className='car-info-list-text'>{Helper.getAdditionalDriver(car.additionalDriver, fr)}</span>
                                                </div>
                                            </Tooltip>
                                        </li>
                                    </ul>
                                </div>
                                {!props.hidePrice && <div className='price'>{`${Helper.formatPrice(car.price)} ${strings.CAR_CURRENCY}`}</div>}
                                <div className='action'>
                                    {edit &&
                                        <>
                                            <Tooltip title={strings.VIEW_CAR}>
                                                <IconButton href={`/car?cr=${car._id}`}>
                                                    <ViewIcon />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title={commonStrings.UPDATE}>
                                                <IconButton href={`/update-car?cr=${car._id}`}>
                                                    <EditIcon />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title={commonStrings.DELETE}>
                                                <IconButton
                                                    data-id={car._id}
                                                    data-index={index}
                                                    onClick={handleDelete}>
                                                    <DeleteIcon />
                                                </IconButton>
                                            </Tooltip>
                                        </>
                                    }
                                </div>
                            </article>
                        )
                    })
                }
                <Dialog
                    disableEscapeKeyDown
                    maxWidth="xs"
                    open={openInfoDialog}
                >
                    <DialogTitle className='dialog-header'>{commonStrings.INFO}</DialogTitle>
                    <DialogContent>{strings.CANNOT_DELETE_CAR}</DialogContent>
                    <DialogActions className='dialog-actions'>
                        <Button onClick={handleCloseInfo} variant='contained' className='btn-secondary'>{commonStrings.CLOSE}</Button>
                    </DialogActions>
                </Dialog>

                <Dialog
                    disableEscapeKeyDown
                    maxWidth="xs"
                    open={openDeleteDialog}
                >
                    <DialogTitle className='dialog-header'>{commonStrings.CONFIRM_TITLE}</DialogTitle>
                    <DialogContent>{strings.DELETE_CAR}</DialogContent>
                    <DialogActions className='dialog-actions'>
                        <Button onClick={handleCancelDelete} variant='contained' className='btn-secondary'>{commonStrings.CANCEL}</Button>
                        <Button onClick={handleConfirmDelete} variant='contained' color='error'>{commonStrings.DELETE}</Button>
                    </DialogActions>
                </Dialog>
            </section>
            {
                Env.PAGINATION_MODE === Const.PAGINATION_MODE.CLASSIC && !Env.isMobile() &&
                <Pager
                    page={page}
                    pageSize={Env.CARS_PAGE_SIZE}
                    rowCount={rowCount}
                    totalRecords={totalRecords}
                    onNext={() => setPage(page + 1)}
                    onPrevious={() => setPage(page - 1)}
                />
            }
        </>
    )
}

export default CarList