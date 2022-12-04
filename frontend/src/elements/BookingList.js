import React, { useState, useEffect } from 'react';
import Env from '../config/env.config';
import { strings as commonStrings } from '../lang/common';
import { strings as csStrings } from '../lang/cars';
import { strings } from '../lang/booking-list';
import * as Helper from '../common/Helper';
import * as BookingService from '../services/BookingService';
import Backdrop from '../elements/SimpleBackdrop';
import {
    DataGrid,
    frFR,
    enUS
} from '@mui/x-data-grid';
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
} from '@mui/material';
import {
    Visibility as ViewIcon,
    Check as CheckIcon,
    Cancel as CancelIcon
} from '@mui/icons-material';
import * as UserService from '../services/UserService';
import { format } from 'date-fns';
import { fr as dfnsFR, enUS as dfnsENUS } from "date-fns/locale";

import '../assets/css/booking-list.css';

const BookingList = (props) => {
    const [user, setUser] = useState();
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(Env.isMobile() ? Env.BOOKINGS_MOBILE_PAGE_SIZE : Env.BOOKINGS_PAGE_SIZE);
    const [columns, setColumns] = useState([]);
    const [rows, setRows] = useState([]);
    const [rowCount, setRowCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [fetch, setFetch] = useState(false);
    const [selectedId, setSelectedId] = useState();
    const [companies, setCompanies] = useState(props.companies);
    const [statuses, setStatuses] = useState(props.statuses);
    const [filter, setFilter] = useState(props.filter);
    const [reload, setReload] = useState(props.reload);
    const [car, setCar] = useState(props.car);
    const [openCancelDialog, setOpenCancelDialog] = useState(false);
    const [cancelRequestSent, setCancelRequestSent] = useState(false);
    const [cancelRequestProcessing, setCancelRequestProcessing] = useState(false);
    const [offset, setOffset] = useState(0);

    const _fetch = (page, user) => {
        const _pageSize = Env.isMobile() ? Env.BOOKINGS_MOBILE_PAGE_SIZE : pageSize;

        if (companies.length > 0) {
            setLoading(true);

            BookingService.getBookings({ companies, statuses, filter, car, user: ((user && user._id) || undefined) }, page, _pageSize)
                .then(data => {
                    const _data = data.length > 0 ? data[0] : {};
                    const totalRecords = _data.pageInfo.length > 0 ? _data.pageInfo[0].totalRecords : 0;
                    if (Env.isMobile()) {
                        const _rows = page === 0 ? _data.resultData : [...rows, ..._data.resultData];
                        setRows(_rows);
                        setRowCount(totalRecords);
                        setFetch(_data.resultData.length > 0);
                        if (props.onLoad) {
                            props.onLoad({ rows: _data.resultData, rowCount: totalRecords });
                        }
                        setLoading(false);
                    } else {
                        setRows(_data.resultData);
                        setRowCount(totalRecords);
                        if (props.onLoad) {
                            props.onLoad({ rows: _data.resultData, rowCount: totalRecords });
                        }
                        setLoading(false);
                    }
                })
                .catch((err) => {
                    UserService.signout();
                });
        } else {
            setRows([]);
            setRowCount(0);
            if (props.onLoad) {
                props.onLoad({ rows: [], rowCount: 0 });
            }
            setLoading(false);
        }
    };

    useEffect(() => {
        setCompanies(props.companies || []);
    }, [props.companies]);

    useEffect(() => {
        setStatuses(props.statuses || []);
    }, [props.statuses]);

    useEffect(() => {
        setFilter(props.filter || null);
    }, [props.filter]);

    useEffect(() => {
        setCar(props.car || null);
    }, [props.car]);

    useEffect(() => {
        setOffset(props.offset || 0);
    }, [props.offset]);

    useEffect(() => {
        setReload(props.reload || false);
    }, [props.reload]);

    useEffect(() => {
        if (reload) {
            setPage(0);
            _fetch(0, user);
        }
    }, [reload]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (props.user && companies.length > 0 && statuses.length > 0) {
            const columns = getColumns();
            setUser(props.user);
            setColumns(columns);
            _fetch(page, props.user);
        }
    }, [props.user, page, pageSize, companies, statuses, filter]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (Env.isMobile()) {
            const element = document.querySelector(`.${props.containerClassName}`);

            if (element) {
                element.onscroll = (event) => {
                    if (fetch
                        && !loading
                        && event.target.scrollTop > 0
                        && (event.target.offsetHeight + event.target.scrollTop + offset) >= (event.target.scrollHeight - Env.CAR_PAGE_OFFSET)) {
                        const p = page + 1;
                        setPage(p);
                    }
                };
            }
        }
    }, [props.containerClassName, page, fetch, loading, offset]); // eslint-disable-line react-hooks/exhaustive-deps

    const getDate = (date) => {
        const d = new Date(date);
        return `${Helper.formatNumber(d.getDate())}-${Helper.formatNumber(d.getMonth() + 1)}-${d.getFullYear()}`;
    };

    const getColumns = () => {
        const columns = [
            {
                field: 'from',
                headerName: commonStrings.FROM,
                flex: 1,
                valueGetter: (params) => (
                    getDate(params.value)
                ),
            },
            {
                field: 'to',
                headerName: commonStrings.TO,
                flex: 1,
                valueGetter: (params) => (
                    getDate(params.value)
                ),
            },
            {
                field: 'price',
                headerName: strings.PRICE,
                flex: 1,
                valueGetter: (params) => (
                    `${params.value} ${strings.CURRENCY}`
                ),
                renderCell: (params) => (
                    <span className='bp'>{params.value}</span>
                )
            },
            {
                field: 'status',
                headerName: strings.STATUS,
                flex: 1,
                renderCell: (params) => (
                    <span className={`bs bs-${params.value}`}>{Helper.getBookingStatus(params.value)}</span>
                ),
            },
            {
                field: 'action',
                headerName: '',
                sortable: false,
                disableColumnMenu: true,
                renderCell: (params) => {
                    const cancelBooking = (e) => {
                        e.stopPropagation(); // don't select this row after clicking
                        setSelectedId(params.row._id);
                        setOpenCancelDialog(true);
                    };

                    return (
                        <>
                            <Tooltip title={strings.VIEW}>
                                <IconButton href={`booking?b=${params.row._id}`}>
                                    <ViewIcon />
                                </IconButton>
                            </Tooltip>
                            {params.row.cancellation
                                && !params.row.cancelRequest
                                && params.row.status !== Env.BOOKING_STATUS.CANCELLED
                                && new Date(params.row.from) > new Date()
                                && <Tooltip title={strings.CANCEL}>
                                    <IconButton onClick={cancelBooking}>
                                        <CancelIcon />
                                    </IconButton>
                                </Tooltip>
                            }
                        </>
                    );
                },
            }
        ];

        if (props.hideDates) columns.splice(0, 2);

        if (!props.hideCarColumn) {
            columns.unshift({
                field: 'car',
                headerName: strings.CAR,
                flex: 1,
                renderCell: (params) => (
                    params.value.name
                ),
            });
        }

        if (!props.hideCompanyColumn) {
            columns.unshift({
                field: 'company',
                headerName: commonStrings.SUPPLIER,
                flex: 1,
                renderCell: (params) => (
                    <img src={Helper.joinURL(Env.CDN_USERS, params.value.avatar)}
                        alt={params.value.fullName}
                        style={{ width: Env.COMPANY_IMAGE_WIDTH }} />
                ),
            });
        }

        return columns;
    }

    const handleCloseCancelBooking = () => {

        setOpenCancelDialog(false);
        if (cancelRequestSent) {
            setTimeout(() => {
                setCancelRequestSent(false)
            }, 500);
        }
    };

    const handleConfirmCancelBooking = async () => {
        try {
            setCancelRequestProcessing(true);
            const status = await BookingService.cancel(selectedId);
            if (status === 200) {
                const row = rows.find(r => r._id === selectedId);
                row.cancelRequest = true;

                setCancelRequestSent(true);
                setRows(rows);
                setSelectedId('');
                setCancelRequestProcessing(false);
            } else {
                Helper.error();
                setOpenCancelDialog(false);
                setCancelRequestProcessing(false);
            }
        } catch (err) {
            Helper.error(err);
            setOpenCancelDialog(false);
            setCancelRequestProcessing(false);
        }
    };

    const _fr = props.language === 'fr';
    const _locale = _fr ? dfnsFR : dfnsENUS;
    const _format = _fr ? 'eee d LLL kk:mm' : 'eee, d LLL, kk:mm';
    const bookingDetailHeight = Env.COMPANY_IMAGE_HEIGHT + 10;

    return (
        <div className='bs-list'>

            {user && (
                rows.length === 0 ?
                    !loading && !props.loading &&
                    <Card variant="outlined" className="empty-list">
                        <CardContent>
                            <Typography color="textSecondary">{strings.EMPTY_LIST}</Typography>
                        </CardContent>
                    </Card>
                    :
                    Env.isMobile() ?
                        <>
                            {rows.map((booking, index) => {
                                const from = new Date(booking.from);
                                const to = new Date(booking.to);
                                const days = Helper.days(from, to);

                                return (
                                    <div key={booking._id} className='booking-details'>
                                        <div className={`bs bs-${booking.status}`}>
                                            <label>{Helper.getBookingStatus(booking.status)}</label>
                                        </div>
                                        <div className='booking-detail' style={{ height: bookingDetailHeight }}>
                                            <label className='booking-detail-title'>{strings.CAR}</label>
                                            <div className='booking-detail-value'>
                                                {`${booking.car.name} (${booking.car.price} ${csStrings.CAR_CURRENCY})`}
                                            </div>
                                        </div>
                                        <div className='booking-detail' style={{ height: bookingDetailHeight }}>
                                            <label className='booking-detail-title'>{strings.DAYS}</label>
                                            <div className='booking-detail-value'>
                                                {`${Helper.getDaysShort(Helper.days(from, to))} (${Helper.capitalize(format(from, _format, { locale: _locale }))} - ${Helper.capitalize(format(to, _format, { locale: _locale }))})`}
                                            </div>
                                        </div>
                                        <div className='booking-detail' style={{ height: bookingDetailHeight }}>
                                            <label className='booking-detail-title'>{commonStrings.PICKUP_LOCATION}</label>
                                            <div className='booking-detail-value'>{booking.pickupLocation.name}</div>
                                        </div>
                                        <div className='booking-detail' style={{ height: bookingDetailHeight }}>
                                            <label className='booking-detail-title'>{commonStrings.DROP_OFF_LOCATION}</label>
                                            <div className='booking-detail-value'>{booking.dropOffLocation.name}</div>
                                        </div>
                                        <div className='booking-detail' style={{ height: bookingDetailHeight }}>
                                            <label className='booking-detail-title'>{commonStrings.SUPPLIER}</label>
                                            <div className='booking-detail-value'>
                                                <div className='car-company'>
                                                    <img src={Helper.joinURL(Env.CDN_USERS, booking.company.avatar)}
                                                        alt={booking.company.fullName}
                                                        style={{ height: Env.COMPANY_IMAGE_HEIGHT }}
                                                    />
                                                    <label className='car-company-name'>{booking.company.fullName}</label>
                                                </div>
                                            </div>
                                        </div>

                                        {(booking.cancellation
                                            || booking.amendments
                                            || booking.collisionDamageWaiver
                                            || booking.theftProtection
                                            || booking.fullInsurance
                                            || booking.additionalDriver) &&
                                            <>
                                                <div className='extras'>
                                                    <label className='extras-title'>{commonStrings.OPTIONS}</label>
                                                    {booking.cancellation &&
                                                        <div className='extra'>
                                                            <CheckIcon className='extra-icon' />
                                                            <label className='extra-title'>{csStrings.CANCELLATION}</label>
                                                            <label className='extra-text'>{Helper.getCancellationOption(booking.car.cancellation, _fr, true)}</label>
                                                        </div>
                                                    }

                                                    {booking.amendments &&
                                                        <div className='extra'>
                                                            <CheckIcon className='extra-icon' />
                                                            <label className='extra-title'>{csStrings.AMENDMENTS}</label>
                                                            <label className='extra-text'>{Helper.getAmendmentsOption(booking.car.amendments, _fr, true)}</label>
                                                        </div>
                                                    }

                                                    {booking.collisionDamageWaiver &&
                                                        <div className='extra'>
                                                            <CheckIcon className='extra-icon' />
                                                            <label className='extra-title'>{csStrings.COLLISION_DAMAGE_WAVER}</label>
                                                            <label className='extra-text'>{Helper.getCollisionDamageWaiverOption(booking.car.collisionDamageWaiver, days, _fr, true)}</label>
                                                        </div>
                                                    }

                                                    {booking.theftProtection &&
                                                        <div className='extra'>
                                                            <CheckIcon className='extra-icon' />
                                                            <label className='extra-title'>{csStrings.THEFT_PROTECTION}</label>
                                                            <label className='extra-text'>{Helper.getTheftProtectionOption(booking.car.theftProtection, days, _fr, true)}</label>
                                                        </div>
                                                    }

                                                    {booking.fullInsurance &&
                                                        <div className='extra'>
                                                            <CheckIcon className='extra-icon' />
                                                            <label className='extra-title'>{csStrings.FULL_INSURANCE}</label>
                                                            <label className='extra-text'>{Helper.getFullInsuranceOption(booking.car.fullInsurance, days, _fr, true)}</label>
                                                        </div>
                                                    }

                                                    {booking.additionalDriver &&
                                                        <div className='extra'>
                                                            <CheckIcon className='extra-icon' />
                                                            <label className='extra-title'>{csStrings.ADDITIONAL_DRIVER}</label>
                                                            <label className='extra-text'>{Helper.getAdditionalDriverOption(booking.car.additionalDriver, days, _fr, true)}</label>
                                                        </div>
                                                    }
                                                </div>
                                            </>
                                        }
                                        <div className='booking-detail' style={{ height: bookingDetailHeight }}>
                                            <label className='booking-detail-title'>{strings.COST}</label>
                                            <div className='booking-detail-value booking-price'>{`${booking.price} ${commonStrings.CURRENCY}`}</div>
                                        </div>

                                        <div className='bs-buttons'>

                                            {booking.cancellation
                                                && !booking.cancelRequest
                                                && booking.status !== Env.BOOKING_STATUS.CANCELLED
                                                && new Date(booking.from) > new Date()
                                                && <Button
                                                    variant="contained"
                                                    className='btn-secondary'
                                                    onClick={() => {
                                                        setSelectedId(booking._id);
                                                        setOpenCancelDialog(true);
                                                    }}
                                                >
                                                    {strings.CANCEL}
                                                </Button>
                                            }

                                        </div>
                                    </div>
                                );
                            })}
                        </>
                        :
                        <DataGrid
                            className='data-grid'
                            checkboxSelection={props.checkboxSelection}
                            getRowId={(row) => row._id}
                            columns={columns}
                            rows={rows}
                            rowCount={rowCount}
                            // loading={loading}
                            rowsPerPageOptions={[Env.BOOKINGS_PAGE_SIZE, 50, 100]}
                            pagination
                            page={page}
                            pageSize={pageSize}
                            paginationMode='server'
                            onPageChange={(page) => {
                                setPage(page);
                            }}
                            onPageSizeChange={(pageSize) => {
                                setPage(0);
                                setPageSize(pageSize);
                            }}
                            localeText={(user.language === 'fr' ? frFR : enUS).components.MuiDataGrid.defaultProps.localeText}
                            components={{
                                NoRowsOverlay: () => ''
                            }}
                            disableSelectionOnClick
                        />)
            }

            <Dialog
                disableEscapeKeyDown
                maxWidth="xs"
                open={openCancelDialog}
            >
                <DialogTitle className='dialog-header'>{!cancelRequestSent && !cancelRequestProcessing && commonStrings.CONFIRM_TITLE}</DialogTitle>
                <DialogContent className='dialog-content'>
                    {
                        cancelRequestProcessing ? <Stack sx={{ color: '#f37022' }}><CircularProgress color='inherit' /></Stack>
                            : cancelRequestSent ? strings.CANCEL_BOOKING_REQUEST_SENT
                                : strings.CANCEL_BOOKING
                    }
                </DialogContent>
                <DialogActions className='dialog-actions'>
                    {
                        !cancelRequestProcessing &&
                        <Button onClick={handleCloseCancelBooking} variant='contained' className='btn-secondary'>
                            {commonStrings.CLOSE}
                        </Button>
                    }
                    {
                        !cancelRequestSent && !cancelRequestProcessing &&
                        <Button onClick={handleConfirmCancelBooking} variant='contained' className='btn-primary'>
                            {commonStrings.CONFIRM}
                        </Button>
                    }
                </DialogActions>
            </Dialog>

            {loading && <Backdrop text={commonStrings.LOADING} />}
        </div>
    );
};

export default BookingList;