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
    Button
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
            user: undefined,
            page: 0,
            pageSize: Env.BOOKINGS_PAGE_SIZE,
            columns: [],
            rows: [],
            rowCount: 0,
            loading: true,
            selectedId: undefined,
            selectedIds: [],
            openUpdateDialog: false,
            openDeleteDialog: false,
            status: '',
            companies: [],
            statuses: Helper.getBookingStatuses(),
            filter: undefined
        };
    }

    getDate = (date) => {
        const d = new Date(date);
        return `${Helper.formatNumber(d.getDate())}-${Helper.formatNumber(d.getMonth() + 1)}-${d.getFullYear()}`;
    };

    getColumns = (user) => {
        const columns = [
            {
                field: 'car',
                headerName: strings.CAR,
                flex: 1,
                renderCell: (params) => (
                    <Link href={`/car?c=${params.value._id}`}>{params.value.name}</Link>
                ),
            },
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
                                <IconButton href={`update-booking?b=${params.row._id}`}>
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

        if (Helper.isAdmin(user)) {
            columns.unshift({
                field: 'company',
                headerName: strings.COMPANY,
                flex: 1,
                // valueGetter: (params) => (
                //     params.value
                // ),
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
        const { companies, statuses, filter, page, pageSize } = this.state;

        this.setState({ loading: true });
        BookingService.getBookings(companies, statuses, filter, page, pageSize)
            .then(data => {
                this.setState({ rows: data.rows, rowCount: data.count }, () => this.setState({ loading: false }));
            })
            .catch(() => {
                toast(commonStrings.GENERIC_ERROR, { type: 'error' });
            });
    };

    static getDerivedStateFromProps(nextProps, prevState) {
        const { companies, statuses, filter } = prevState;

        if (nextProps.companies && !Helper.arrayEqual(companies, nextProps.companies)) {
            return { companies: Helper.clone(nextProps.companies) };
        }

        if (nextProps.statuses && !Helper.statusArrayEqual(statuses, nextProps.statuses)) {
            return { statuses: Helper.clone(nextProps.statuses) };
        }

        if (nextProps.filter && !Helper.filterEqual(filter, nextProps.filter)) {
            return { filter: Helper.clone(nextProps.filter) };
        }

        return null;
    }

    componentDidUpdate(prevProps, prevState) {
        if (!Helper.arrayEqual(this.state.companies, prevState.companies)) {
            this.setState({ page: 0 }, () => this.fetch());
        }

        if (!Helper.statusArrayEqual(this.state.statuses, prevState.statuses)) {
            this.setState({ page: 0 }, () => this.fetch());
        }

        if (!Helper.filterEqual(this.state.filter, prevState.filter)) {
            this.setState({ page: 0 }, () => this.fetch());
        }
    }

    componentDidMount() {

        if (this.props.user) {
            const columns = this.getColumns(this.props.user);
            this.setState({ user: this.props.user, columns });
        }
    }

    render() {
        const {
            user,
            columns,
            rows,
            rowCount,
            loading,
            page,
            pageSize,
            openDeleteDialog,
            openUpdateDialog,
            selectedIds,
        } = this.state;

        return (
            <div style={{ width: this.props.width || '100%', height: this.props.height || 400 }} className='bs-list' >
                {user && columns.length > 0 &&
                    <DataGrid
                        checkboxSelection
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
                    />
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