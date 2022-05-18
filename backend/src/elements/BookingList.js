import React, { Component } from 'react';
import Env from '../config/env.config';
import { strings as commonStrings } from '../lang/common';
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
    Delete as DeleteIcon
} from '@mui/icons-material';

import '../assets/css/booking-list.css';

class BookingList extends Component {

    constructor(props) {
        super(props);
        this.state = {
            loggedUser: null,
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
                                <IconButton href={`booking?b=${params.row._id}`}>
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
                            style={{
                                width: Env.COMPANY_IMAGE_WIDTH,
                                // height: Env.COMPANY_IMAGE_HEIGHT
                            }} />
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
                toast(commonStrings.GENERIC_ERROR, { type: 'error' });
                this.setState({ openUpdateDialog: false });
            });
    };

    handleCancelDelete = () => {
        this.setState({ openDeleteDialog: false, selectedId: undefined });
    };

    handleConfirmDelete = () => {
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
                toast(commonStrings.GENERIC_ERROR, { type: 'error' });
            });
    };

    fetch = () => {
        const { companies, statuses, filter, car, page, pageSize, user } = this.state;

        if (companies.length > 0) {
            this.setState({ loading: true });

            BookingService.getBookings({ companies, statuses, filter, car, user: ((user && user._id) || undefined) }, page, pageSize)
                .then(data => {
                    const _data = data.length > 0 ? data[0] : {};
                    const totalRecords = _data.pageInfo.length > 0 ? _data.pageInfo[0].totalRecords : 0;
                    this.setState({ rows: _data.resultData, rowCount: totalRecords, loading: false }, () => {
                        if (this.props.onLoad) {
                            this.props.onLoad({ rows: _data.resultData, rowCount: totalRecords });
                        }
                    });
                })
                .catch((err) => {
                    toast(commonStrings.GENERIC_ERROR, { type: 'error' });
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

        return (
            <div style={{ width: this.props.width || '100%', height: this.props.height || 400 }} className='bs-list' >

                {loggedUser && (
                    rows.length === 0 ?
                        !loading && !admin &&
                        <Card variant="outlined" className="empty-list">
                            <CardContent>
                                <Typography color="textSecondary">{strings.EMPTY_LIST}</Typography>
                            </CardContent>
                        </Card>
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