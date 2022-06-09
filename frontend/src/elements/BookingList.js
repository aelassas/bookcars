import React, { Component } from 'react';
import Env from '../config/env.config';
import { strings as commonStrings } from '../lang/common';
import { strings } from '../lang/booking-list';
import Helper from '../common/Helper';
import BookingService from '../services/BookingService';
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
    Card,
    CardContent,
    Typography
} from '@mui/material';
import {
    Visibility as ViewIcon,
    // Edit as EditIcon
} from '@mui/icons-material';
import UserService from '../services/UserService';

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
            car: props.car
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
                    return (
                        // <Tooltip title={params.row.amendments ? strings.UPDATE : strings.VIEW}>
                        //     <IconButton href={`booking?b=${params.row._id}`}>
                        //         {params.row.amendments ? <EditIcon /> : <ViewIcon />}
                        //     </IconButton>
                        // </Tooltip>
                        <Tooltip title={strings.VIEW}>
                            <IconButton href={`booking?b=${params.row._id}`}>
                                <ViewIcon />
                            </IconButton>
                        </Tooltip>
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
                headerName: strings.COMPANY,
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
                UserService.signout(false, true);
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
                UserService.signout(false, true);
            });
    };

    fetch = () => {
        const { companies, statuses, filter, car, page, pageSize, user } = this.state;

        if (companies.length > 0) {
            this.setState({ loading: true });

            const payload = { companies, statuses, filter, car, user: user._id };

            BookingService.getBookings(payload, page, pageSize)
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
                    UserService.signout(false, true);
                });
        } else {
            this.setState({ rows: [], rowCount: 0 }, () => {
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
    }

    render() {
        const {
            columns,
            rows,
            rowCount,
            loading,
            page,
            pageSize,
            user
        } = this.state;

        return (
            <div style={{ width: this.props.width || '100%', height: this.props.height || 400 }} className='bs-list' >

                {user && (
                    rows.length === 0 ?
                        !loading && !this.props.loading &&
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
                            localeText={(user.language === 'fr' ? frFR : enUS).components.MuiDataGrid.defaultProps.localeText}
                            components={{
                                NoRowsOverlay: () => ''
                            }}
                            onSelectionModelChange={(selectedIds) => this.setState({ selectedIds })}
                            disableSelectionOnClick
                        />)
                }

                {loading && <Backdrop text={commonStrings.LOADING} />}
            </div>
        );
    }
}

export default BookingList;