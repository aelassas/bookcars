import React, { useState, useEffect } from 'react';
import Env from '../config/env.config';
import { strings as commonStrings } from '../lang/common';
import { strings as csStrings } from '../lang/cars';
import { strings } from '../lang/booking-list';
import * as Helper from '../common/Helper';
import * as BookingService from '../services/BookingService';
import StatusList from './StatusList';
import Backdrop from '../elements/SimpleBackdrop';
import {
    DataGrid,
    frFR,
    enUS
} from '@mui/x-data-grid';
import {
    Tooltip,
    IconButton,
    Link,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Card,
    CardContent,
    Typography
} from '@mui/material';
import {
    Edit as EditIcon,
    Delete as DeleteIcon,
    Check as CheckIcon,
} from '@mui/icons-material';
import * as UserService from '../services/UserService';
import { format } from 'date-fns';
import { fr as dfnsFR, enUS as dfnsENUS } from "date-fns/locale";

import '../assets/css/booking-list.css';

const BookingList = (props) => {
    const [loggedUser, setLoggedUser] = useState();
    const [user, setUser] = useState();
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(Env.isMobile() ? Env.BOOKINGS_MOBILE_PAGE_SIZE : Env.BOOKINGS_PAGE_SIZE);
    const [columns, setColumns] = useState([]);
    const [rows, setRows] = useState([]);
    const [rowCount, setRowCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [fetch, setFetch] = useState(false);
    const [selectedId, setSelectedId] = useState();
    const [selectedIds, setSelectedIds] = useState([]);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [companies, setCompanies] = useState(props.companies);
    const [statuses, setStatuses] = useState(props.statuses);
    const [status, setStatus] = useState();
    const [filter, setFilter] = useState(props.filter);
    const [reload, setReload] = useState(props.reload);
    const [car, setCar] = useState(props.car);
    const [openUpdateDialog, setOpenUpdateDialog] = useState(false);
    const [openDeleteDialog, setopenDeleteDialog] = useState(false);
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
        if (companies.length > 0 && statuses.length > 0) {
            const columns = getColumns();
            setColumns(columns);
            setUser(props.user || null);
            _fetch(page, props.user);
        }
    }, [props.user, page, pageSize, companies, statuses, filter]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        const columns = getColumns();
        setColumns(columns);
    }, [selectedIds]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        setLoggedUser(props.loggedUser || null);
    }, [props.loggedUser]);

    useEffect(() => {
        if (Env.isMobile()) {
            const element = props.containerClassName ? document.querySelector(`.${props.containerClassName}`) : document.querySelector('div.bookings');

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

    const getColumns = (user) => {
        const columns = [
            {
                field: 'driver',
                headerName: strings.DRIVER,
                flex: 1,
                renderCell: (params) => (
                    <Link href={`/user?u=${params.value._id}`}>{params.value.fullName}</Link>
                ),
            },
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
                    const handleDelete = (e) => {
                        e.stopPropagation(); // don't select this row after clicking
                        setSelectedId(params.row._id);
                        setopenDeleteDialog(true);
                    };

                    return (
                        <div>
                            <Tooltip title={commonStrings.UPDATE}>
                                <IconButton
                                    href={`booking?b=${params.row._id}`}
                                >
                                    <EditIcon />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title={commonStrings.DELETE}>
                                <IconButton
                                    onClick={handleDelete}>
                                    <DeleteIcon />
                                </IconButton>
                            </Tooltip>

                        </div>
                    );
                },
                renderHeader: () => {
                    return (
                        selectedIds.length > 0 ?
                            <div>
                                <Tooltip title={strings.UPDATE_SELECTION}>
                                    <IconButton onClick={() => {
                                        setOpenUpdateDialog(true);
                                    }}>
                                        <EditIcon />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title={strings.DELETE_SELECTION}>
                                    <IconButton
                                        onClick={() => {
                                            setopenDeleteDialog(true);
                                        }}
                                    >
                                        <DeleteIcon />
                                    </IconButton>
                                </Tooltip>
                            </div>
                            : <></>
                    );
                }
            }
        ];

        if (props.hideDates) columns.splice(1, 2);

        if (!props.hideCarColumn) {
            columns.unshift({
                field: 'car',
                headerName: strings.CAR,
                flex: 1,
                renderCell: (params) => (
                    <Link href={`/car?cr=${params.value._id}`}>{params.value.name}</Link>
                ),
            });
        }

        if (Helper.admin(loggedUser) && !props.hideCompanyColumn) {
            columns.unshift({
                field: 'company',
                headerName: commonStrings.SUPPLIER,
                flex: 1,
                renderCell: (params) => (
                    <Link href={`/supplier?c=${params.value._id}`} className='cell-company'>
                        <img src={Helper.joinURL(Env.CDN_USERS, params.value.avatar)}
                            alt={params.value.fullName}
                            style={{ width: Env.COMPANY_IMAGE_WIDTH }} />
                    </Link>
                ),
            });
        }

        return columns;
    }

    const handleCancelUpdate = () => {
        setOpenUpdateDialog(false);
    };

    const handleStatusChange = (status) => {
        setStatus(status);
    };

    const handleConfirmUpdate = () => {
        const data = { ids: selectedIds, status };

        BookingService.updateStatus(data)
            .then(s => {
                if (s === 200) {
                    rows.forEach(row => {
                        if (selectedIds.includes(row._id)) {
                            row.status = status;
                        }
                    });
                    setRows(rows);
                } else {
                    Helper.error();
                }

                setOpenUpdateDialog(false);
            })
            .catch(() => {
                UserService.signout();
            });
    };

    const handleDelete = (e) => {
        const selectedId = e.currentTarget.getAttribute('data-id');
        const selectedIndex = e.currentTarget.getAttribute('data-index');

        setSelectedId(selectedId);
        setSelectedIndex(selectedIndex);
        setopenDeleteDialog(true);
        setSelectedId(selectedId);
        setSelectedIndex(selectedIndex);
    };

    const handleCancelDelete = () => {
        setopenDeleteDialog(false);
        setSelectedId('');
    };

    const handleConfirmDelete = () => {
        if (Env.isMobile()) {
            const ids = [selectedId];

            BookingService.deleteBookings(ids)
                .then(status => {
                    if (status === 200) {
                        rows.splice(selectedIndex, 1);
                        setRows(rows);
                        setSelectedId('');
                        setSelectedIndex(-1);
                    } else {
                        Helper.error();
                    }

                    setopenDeleteDialog(false);
                })
                .catch(() => {
                    UserService.signout();
                });
        } else {
            const ids = selectedIds.length > 0 ? selectedIds : [selectedId];

            BookingService.deleteBookings(ids)
                .then(status => {
                    if (status === 200) {
                        if (selectedIds.length > 0) {
                            setRows(rows.filter((row) => !selectedIds.includes(row._id)));
                        } else {
                            setRows(rows.filter((row) => row._id !== selectedId));
                        }
                    } else {
                        Helper.error();
                    }

                    setopenDeleteDialog(false);
                })
                .catch(() => {
                    UserService.signout();
                });
        }
    };

    const admin = Helper.admin(loggedUser);
    const _fr = props.language === 'fr';
    const _locale = _fr ? dfnsFR : dfnsENUS;
    const _format = _fr ? 'eee d LLL kk:mm' : 'eee, d LLL, kk:mm';
    const bookingDetailHeight = Env.COMPANY_IMAGE_HEIGHT + 10;

    return (
        <div className='bs-list' >

            {loggedUser && (
                rows.length === 0 ?
                    !loading && !props.loading && !admin &&
                    <Card variant="outlined" className="empty-list">
                        <CardContent>
                            <Typography color="textSecondary">{strings.EMPTY_LIST}</Typography>
                        </CardContent>
                    </Card>
                    :
                    Env.isMobile() ?
                        <div>
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
                                                <Link href={`car/?cr=${booking.car._id}`}>{booking.car.name}</Link>
                                            </div>
                                        </div>
                                        <div className='booking-detail' style={{ height: bookingDetailHeight }}>
                                            <label className='booking-detail-title'>{strings.DRIVER}</label>
                                            <div className='booking-detail-value'>
                                                <Link href={`user/?u=${booking.driver._id}`}>{booking.driver.fullName}</Link>
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

                                            <Button
                                                variant="contained"
                                                className='btn-primary'
                                                size="small"
                                                href={`booking?b=${booking._id}`}
                                            >
                                                {commonStrings.UPDATE}
                                            </Button>
                                            <Button
                                                variant="contained"
                                                className='btn-secondary'
                                                size="small"
                                                data-id={booking._id}
                                                data-index={index}
                                                onClick={handleDelete}
                                            >
                                                {commonStrings.DELETE}
                                            </Button>

                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        :
                        <DataGrid
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
                            localeText={(loggedUser.language === 'fr' ? frFR : enUS).components.MuiDataGrid.defaultProps.localeText}
                            components={{
                                NoRowsOverlay: () => ''
                            }}
                            onSelectionModelChange={(selectedIds) => {
                                setSelectedIds(selectedIds);
                            }}
                            disableSelectionOnClick
                        />)
            }
            <Dialog
                disableEscapeKeyDown
                maxWidth="xs"
                open={openUpdateDialog}
            >
                <DialogTitle className='dialog-header'>{strings.UPDATE_STATUS}</DialogTitle>
                <DialogContent className='bs-update-status'>
                    <StatusList
                        label={strings.NEW_STATUS}
                        onChange={handleStatusChange}
                    />
                </DialogContent>
                <DialogActions className='dialog-actions'>
                    <Button onClick={handleCancelUpdate} variant='contained' className='btn-secondary'>{commonStrings.CANCEL}</Button>
                    <Button onClick={handleConfirmUpdate} variant='contained' className='btn-primary'>{commonStrings.UPDATE}</Button>
                </DialogActions>
            </Dialog>

            <Dialog
                disableEscapeKeyDown
                maxWidth="xs"
                open={openDeleteDialog}
            >
                <DialogTitle className='dialog-header'>{commonStrings.CONFIRM_TITLE}</DialogTitle>
                <DialogContent className='dialog-content'>{selectedIds.length === 0 ? strings.DELETE_BOOKING : strings.DELETE_BOOKINGS}</DialogContent>
                <DialogActions className='dialog-actions'>
                    <Button onClick={handleCancelDelete} variant='contained' className='btn-secondary'>{commonStrings.CANCEL}</Button>
                    <Button onClick={handleConfirmDelete} variant='contained' color='error'>{commonStrings.DELETE}</Button>
                </DialogActions>
            </Dialog>

            {loading && <Backdrop text={commonStrings.LOADING} />}
        </div>
    );
}

export default BookingList;