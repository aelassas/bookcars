import React, { Component } from 'react';
import Env from '../config/env.config';
import { strings as commonStrings } from '../lang/common';
import { strings as csStrings } from '../lang/cars';
import { strings } from '../lang/booking-list';
import Helper from '../common/Helper';
import BookingService from '../services/BookingService';
import StatusList from './StatusList';
import Backdrop from '../elements/SimpleBackdrop';
import { toast } from 'react-toastify';
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
import UserService from '../services/UserService';

import '../assets/css/booking-list.css';

class BookingList extends Component {

    constructor(props) {
        super(props);
        this.state = {
            loggedUser: null,
            user: null,
            page: 0,
            pageSize: Env.isMobile() ? Env.BOOKINGS_MOBILE_PAGE_SIZE : Env.BOOKINGS_PAGE_SIZE,
            columns: [],
            rows: [],
            rowCount: 0,
            loading: true,
            fetch: false,
            selectedId: null,
            selectedIndex: -1,
            selectedIds: [],
            openUpdateDialog: false,
            openDeleteDialog: false,
            status: '',
            companies: props.companies,
            statuses: props.statuses,
            filter: props.filter,
            reload: props.reload,
            car: props.car
        };
    }

    getDate = (date) => {
        const d = new Date(date);
        return `${Helper.formatNumber(d.getDate())}-${Helper.formatNumber(d.getMonth() + 1)}-${d.getFullYear()}`;
    };

    getColumns = (user) => {
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
                    this.getDate(params.value)
                ),
            },
            {
                field: 'to',
                headerName: commonStrings.TO,
                flex: 1,
                valueGetter: (params) => (
                    this.getDate(params.value)
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
                        this.setState({ selectedId: params.row._id, openDeleteDialog: true });
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
                    const { selectedIds } = this.state;

                    return (
                        selectedIds.length > 0 ?
                            <div>
                                <Tooltip title={strings.UPDATE_SELECTION}>
                                    <IconButton onClick={() => {
                                        this.setState({ openUpdateDialog: true });
                                    }}>
                                        <EditIcon />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title={strings.DELETE_SELECTION}>
                                    <IconButton
                                        onClick={() => {
                                            this.setState({ openDeleteDialog: true });
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

        if (this.props.hideDates) columns.splice(1, 2);

        if (!this.props.hideCarColumn) {
            columns.unshift({
                field: 'car',
                headerName: strings.CAR,
                flex: 1,
                renderCell: (params) => (
                    <Link href={`/car?cr=${params.value._id}`}>{params.value.name}</Link>
                ),
            });
        }

        if (Helper.admin(user) && !this.props.hideCompanyColumn) {
            columns.unshift({
                field: 'company',
                headerName: strings.COMPANY,
                flex: 1,
                renderCell: (params) => (
                    <Link href={`/company?c=${params.value._id}`} className='cell-company'>
                        <img src={Helper.joinURL(Env.CDN_USERS, params.value.avatar)}
                            alt={params.value.fullName}
                            style={{ width: Env.COMPANY_IMAGE_WIDTH }} />
                    </Link>
                ),
            });
        }

        return columns;
    }

    handleCancelUpdate = () => {
        this.setState({ openUpdateDialog: false });
    };

    handleStatusChange = (status) => {
        this.setState({ status });
    };

    handleConfirmUpdate = () => {
        const { selectedIds, status, rows } = this.state;
        const data = { ids: selectedIds, status };

        BookingService.updateStatus(data)
            .then(s => {
                if (s === 200) {
                    rows.forEach(row => {
                        if (selectedIds.includes(row._id)) {
                            row.status = status;
                        }
                    });
                    this.setState({ rows });
                } else {
                    toast(commonStrings.GENERIC_ERROR, { type: 'error' });
                }

                this.setState({ openUpdateDialog: false });
            })
            .catch(() => {
                UserService.signout();
            });
    };

    handleDelete = (e) => {
        const selectedId = e.currentTarget.getAttribute('data-id');
        const selectedIndex = e.currentTarget.getAttribute('data-index');

        this.setState({ selectedId, selectedIndex, openDeleteDialog: true });
    };
    handleCancelDelete = () => {
        this.setState({ openDeleteDialog: false, selectedId: undefined });
    };

    handleConfirmDelete = () => {
        if (Env.isMobile()) {
            const { selectedId, selectedIndex, rows } = this.state;
            const ids = [selectedId];

            BookingService.delete(ids)
                .then(status => {
                    if (status === 200) {
                        rows.splice(selectedIndex, 1);
                        this.setState({ rows, selectedId: '', selectedIndex: -1 });
                    } else {
                        toast(commonStrings.GENERIC_ERROR, { type: 'error' });
                    }

                    this.setState({ openDeleteDialog: false });
                })
                .catch(() => {
                    UserService.signout();
                });
        } else {
            const { selectedIds, selectedId, rows } = this.state;
            const ids = selectedIds.length > 0 ? selectedIds : [selectedId];

            BookingService.delete(ids)
                .then(status => {
                    if (status === 200) {
                        if (selectedIds.length > 0) {
                            this.setState({ rows: rows.filter((row) => !selectedIds.includes(row._id)) });
                        } else {
                            this.setState({ rows: rows.filter((row) => row._id !== selectedId) });
                        }
                    } else {
                        toast(commonStrings.GENERIC_ERROR, { type: 'error' });
                    }

                    this.setState({ openDeleteDialog: false });
                })
                .catch(() => {
                    UserService.signout();
                });
        }
    };

    fetch = () => {
        const { companies, statuses, filter, car, page, user, rows, pageSize } = this.state;

        if (companies.length > 0) {
            this.setState({ loading: true });

            BookingService.getBookings({ companies, statuses, filter, car, user: ((user && user._id) || undefined) }, page, pageSize)
                .then(data => {
                    const _data = data.length > 0 ? data[0] : {};
                    const totalRecords = _data.pageInfo.length > 0 ? _data.pageInfo[0].totalRecords : 0;
                    if (Env.isMobile()) {
                        const _rows = page === 0 ? _data.resultData : [...rows, ..._data.resultData];
                        this.setState({ rows: _rows, rowCount: totalRecords, loading: false, fetch: _data.resultData.length > 0 }, () => {
                            if (this.props.onLoad) {
                                this.props.onLoad({ rows: _data.resultData, rowCount: totalRecords });
                            }
                        });
                    } else {
                        this.setState({ rows: _data.resultData, rowCount: totalRecords, loading: false }, () => {
                            if (this.props.onLoad) {
                                this.props.onLoad({ rows: _data.resultData, rowCount: totalRecords });
                            }
                        });
                    }

                })
                .catch((err) => {
                    UserService.signout();
                });
        } else {
            this.setState({ rows: [], rowCount: 0, loading: false }, () => {
                if (this.props.onLoad) {
                    this.props.onLoad({ rows: [], rowCount: 0 });
                }
            });
        }
    };

    static getDerivedStateFromProps(nextProps, prevState) {
        const { companies, statuses, filter, reload, car } = prevState;

        if (nextProps.companies && !Helper.arrayEqual(companies, nextProps.companies)) {
            return { companies: Helper.clone(nextProps.companies) };
        }

        if (nextProps.statuses && !Helper.arrayEqual(statuses, nextProps.statuses)) {
            return { statuses: Helper.clone(nextProps.statuses) };
        }

        if ((nextProps.filter || (filter && !nextProps.filter)) && !Helper.filterEqual(filter, nextProps.filter)) {
            return { filter: Helper.clone(nextProps.filter) };
        }

        if (reload !== nextProps.reload) {
            return { reload: nextProps.reload };
        }

        if (nextProps.car && car !== nextProps.car) {
            return { car: nextProps.car };
        }

        return null;
    }

    componentDidUpdate(prevProps, prevState) {
        if (!Helper.arrayEqual(this.state.companies, prevState.companies)) {
            return this.setState({ page: 0 }, () => this.fetch());
        }

        if (!Helper.arrayEqual(this.state.statuses, prevState.statuses)) {
            return this.setState({ page: 0 }, () => this.fetch());
        }

        if ((prevState.filter && !this.state.filter) || !Helper.filterEqual(this.state.filter, prevState.filter)) {
            return this.setState({ page: 0 }, () => this.fetch());
        }

        if (this.state.reload && !prevState.reload) {
            console.log('!')
            return this.setState({ page: 0 }, () => this.fetch());
        }

        if (this.state.car !== prevState.car) {
            return this.setState({ page: 0 }, () => this.fetch());
        }
    }

    componentDidMount() {

        if (this.props.loggedUser) {
            const columns = this.getColumns(this.props.loggedUser);
            this.setState({ loggedUser: this.props.loggedUser, user: this.props.user, columns }, () => this.fetch());
        }

        if (Env.isMobile()) {
            const element = this.props.from && this.props.from === 'car' ? document.querySelector('div.car') : document.querySelector('div.bookings');

            if (element) {
                element.onscroll = (event) => {
                    const { fetch, loading, page } = this.state;
                    if (fetch
                        && !loading
                        && event.target.scrollTop > 0
                        && (event.target.offsetHeight + event.target.scrollTop) >= (event.target.scrollHeight - Env.CAR_PAGE_OFFSET)) {
                        this.setState({ page: page + 1 }, () => {
                            this.fetch();
                        });
                    }
                };
            }
        }
    }

    render() {
        const {
            loggedUser,
            columns,
            rows,
            rowCount,
            loading,
            page,
            pageSize,
            openDeleteDialog,
            openUpdateDialog,
            selectedIds,
            user
        } = this.state, admin = Helper.admin(user);
        const bookingDetailHeight = Env.COMPANY_IMAGE_HEIGHT + 10;
        const locale = this.props.language === 'fr' ? 'fr-FR' : 'en-US';
        const options = { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' };
        const fr = this.props.language === 'fr';

        return (
            <div className='bs-list' >

                {loggedUser && (
                    rows.length === 0 ?
                        !loading && !this.props.loading && !admin &&
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
                                                    {`${Helper.getDaysShort(Helper.days(from, to))} (${from.toLocaleString(locale, options)} - ${to.toLocaleString(locale, options)})`}
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
                                                <label className='booking-detail-title'>{strings.COMPANY}</label>
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
                                                                <label className='extra-text'>{Helper.getCancellationOption(booking.car.cancellation, fr, true)}</label>
                                                            </div>
                                                        }

                                                        {booking.amendments &&
                                                            <div className='extra'>
                                                                <CheckIcon className='extra-icon' />
                                                                <label className='extra-title'>{csStrings.AMENDMENTS}</label>
                                                                <label className='extra-text'>{Helper.getAmendmentsOption(booking.car.amendments, fr, true)}</label>
                                                            </div>
                                                        }

                                                        {booking.collisionDamageWaiver &&
                                                            <div className='extra'>
                                                                <CheckIcon className='extra-icon' />
                                                                <label className='extra-title'>{csStrings.COLLISION_DAMAGE_WAVER}</label>
                                                                <label className='extra-text'>{Helper.getCollisionDamageWaiverOption(booking.car.collisionDamageWaiver, days, fr, true)}</label>
                                                            </div>
                                                        }

                                                        {booking.theftProtection &&
                                                            <div className='extra'>
                                                                <CheckIcon className='extra-icon' />
                                                                <label className='extra-title'>{csStrings.THEFT_PROTECTION}</label>
                                                                <label className='extra-text'>{Helper.getTheftProtectionOption(booking.car.theftProtection, days, fr, true)}</label>
                                                            </div>
                                                        }

                                                        {booking.fullInsurance &&
                                                            <div className='extra'>
                                                                <CheckIcon className='extra-icon' />
                                                                <label className='extra-title'>{csStrings.FULL_INSURANCE}</label>
                                                                <label className='extra-text'>{Helper.getFullInsuranceOption(booking.car.fullInsurance, days, fr, true)}</label>
                                                            </div>
                                                        }

                                                        {booking.additionalDriver &&
                                                            <div className='extra'>
                                                                <CheckIcon className='extra-icon' />
                                                                <label className='extra-title'>{csStrings.ADDITIONAL_DRIVER}</label>
                                                                <label className='extra-text'>{Helper.getAdditionalDriverOption(booking.car.additionalDriver, days, fr, true)}</label>
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
                                                    onClick={this.handleDelete}
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
                                checkboxSelection={this.props.checkboxSelection}
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
                                onPageChange={(page) => this.setState({ page }, () => this.fetch())}
                                onPageSizeChange={(pageSize) => this.setState({ page: 0, pageSize }, () => this.fetch())}
                                localeText={(loggedUser.language === 'fr' ? frFR : enUS).components.MuiDataGrid.defaultProps.localeText}
                                components={{
                                    NoRowsOverlay: () => ''
                                }}
                                onSelectionModelChange={(selectedIds) => this.setState({ selectedIds })}
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
                            onChange={this.handleStatusChange}
                        />
                    </DialogContent>
                    <DialogActions className='dialog-actions'>
                        <Button onClick={this.handleCancelUpdate} variant='contained' className='btn-secondary'>{commonStrings.CANCEL}</Button>
                        <Button onClick={this.handleConfirmUpdate} variant='contained' className='btn-primary'>{commonStrings.UPDATE}</Button>
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
                        <Button onClick={this.handleCancelDelete} variant='contained' className='btn-secondary'>{commonStrings.CANCEL}</Button>
                        <Button onClick={this.handleConfirmDelete} variant='contained' color='error'>{commonStrings.DELETE}</Button>
                    </DialogActions>
                </Dialog>

                {loading && <Backdrop text={commonStrings.LOADING} />}
            </div>
        );
    }
}

export default BookingList;