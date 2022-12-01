import React, { Component } from 'react';
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

class BookingList extends Component {

    constructor(props) {
        super(props);
        this.state = {
            user: null,
            page: 0,
            pageSize: Env.BOOKINGS_PAGE_SIZE,
            columns: [],
            rows: [],
            rowCount: 0,
            loading: true,
            selectedId: null,
            selectedIds: [],
            openUpdateDialog: false,
            openDeleteDialog: false,
            status: '',
            companies: props.companies,
            statuses: props.statuses,
            filter: props.filter,
            reload: props.reload,
            car: props.car,
            openCancelDialog: false,
            cancelRequestSent: false,
            cancelRequestProcessing: false,
            offset: 0
        };
    }

    getDate = (date) => {
        const d = new Date(date);
        return `${Helper.formatNumber(d.getDate())}-${Helper.formatNumber(d.getMonth() + 1)}-${d.getFullYear()}`;
    };

    getColumns = () => {
        const columns = [
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
                    const cancelBooking = (e) => {
                        e.stopPropagation(); // don't select this row after clicking
                        this.setState({ selectedId: params.row._id, openCancelDialog: true });
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

        if (this.props.hideDates) columns.splice(0, 2);

        if (!this.props.hideCarColumn) {
            columns.unshift({
                field: 'car',
                headerName: strings.CAR,
                flex: 1,
                renderCell: (params) => (
                    params.value.name
                ),
            });
        }

        if (!this.props.hideCompanyColumn) {
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

    handleCloseCancelBooking = () => {
        const { cancelRequestSent } = this.state;
        this.setState({ openCancelDialog: false }, () => {
            if (cancelRequestSent) {
                setTimeout(() => {
                    this.setState({ cancelRequestSent: false });
                }, 500);
            }
        });
    };

    handleConfirmCancelBooking = async () => {
        try {
            const { rows, selectedId } = this.state;

            this.setState({ cancelRequestProcessing: true });
            const status = await BookingService.cancel(selectedId);
            if (status === 200) {
                const row = rows.find(r => r._id === selectedId);
                row.cancelRequest = true;

                this.setState({ cancelRequestSent: true, rows, selectedId: '', cancelRequestProcessing: false });
            } else {
                Helper.error();
                this.setState({ openCancelDialog: false, cancelRequestProcessing: false });
            }
        } catch (err) {
            Helper.error(err);
            this.setState({ openCancelDialog: false, cancelRequestProcessing: false });
        }
    };

    fetch = () => {
        const { companies, statuses, filter, car, page, user, rows } = this.state;
        const pageSize = Env.isMobile() ? Env.BOOKINGS_MOBILE_PAGE_SIZE : Env.BOOKINGS_PAGE_SIZE;

        if (companies.length > 0) {
            this.setState({ loading: true });

            BookingService.getBookings({ companies, statuses, filter, car, user: ((user && user._id) || undefined) }, page, pageSize)
                .then(data => {
                    const _data = data.length > 0 ? data[0] : {};
                    const totalRecords = _data.pageInfo.length > 0 ? _data.pageInfo[0].totalRecords : 0;
                    if (Env.isMobile()) {
                        const _rows = page === 0 ? _data.resultData : [...rows, ..._data.resultData];
                        this.setState({ rows: _rows, rowCount: totalRecords, fetch: _data.resultData.length > 0 }, () => {
                            if (this.props.onLoad) {
                                this.props.onLoad({ rows: _data.resultData, rowCount: totalRecords });
                            }

                            this.setState({ loading: false });
                        });
                    } else {
                        this.setState({ rows: _data.resultData, rowCount: totalRecords }, () => {
                            if (this.props.onLoad) {
                                this.props.onLoad({ rows: _data.resultData, rowCount: totalRecords });
                            }

                            this.setState({ loading: false });
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
        const { companies, statuses, filter, reload, car, offset } = prevState;

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

        if (offset !== nextProps.offset) {
            return { offset: nextProps.offset };
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
            return this.setState({ page: 0 }, () => this.fetch());
        }

        if (this.state.car !== prevState.car) {
            return this.setState({ page: 0 }, () => this.fetch());
        }
    }

    componentDidMount() {

        if (this.props.user) {
            const columns = this.getColumns();
            this.setState({ user: this.props.user, columns }, () => this.fetch());
        }

        if (Env.isMobile()) {
            const element = document.querySelector(`.${this.props.containerClassName}`);

            if (element) {
                element.onscroll = (event) => {
                    const { fetch, loading, page, offset } = this.state;

                    if (fetch
                        && !loading
                        && event.target.scrollTop > 0
                        && (event.target.offsetHeight + event.target.scrollTop + offset) >= (event.target.scrollHeight - Env.CAR_PAGE_OFFSET)) {
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
            columns,
            rows,
            rowCount,
            loading,
            page,
            pageSize,
            user,
            openCancelDialog,
            cancelRequestSent,
            cancelRequestProcessing
        } = this.state;

        const _fr = this.props.language === 'fr';
        const _locale = _fr ? dfnsFR : dfnsENUS;
        const _format = _fr ? 'eee d LLL kk:mm' : 'eee, d LLL, kk:mm';
        const bookingDetailHeight = Env.COMPANY_IMAGE_HEIGHT + 10;

        return (
            <div className='bs-list'>

                {user && (
                    rows.length === 0 ?
                        !loading && !this.props.loading &&
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
                                                            this.setState({ selectedId: booking._id, openCancelDialog: true });
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
                                localeText={(user.language === 'fr' ? frFR : enUS).components.MuiDataGrid.defaultProps.localeText}
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
                            <Button onClick={this.handleCloseCancelBooking} variant='contained' className='btn-secondary'>
                                {commonStrings.CLOSE}
                            </Button>
                        }
                        {
                            !cancelRequestSent && !cancelRequestProcessing &&
                            <Button onClick={this.handleConfirmCancelBooking} variant='contained' className='btn-primary'>
                                {commonStrings.CONFIRM}
                            </Button>
                        }
                    </DialogActions>
                </Dialog>

                {loading && <Backdrop text={commonStrings.LOADING} />}
            </div>
        );
    }
}

export default BookingList;