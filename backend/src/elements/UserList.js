import React, { Component } from 'react';
import Env from '../config/env.config';
import { strings as commonStrings } from '../lang/common';
import { strings } from '../lang/user-list';
import Helper from '../common/Helper';
import BookingService from '../services/BookingService';
import UserService from '../services/UserService';
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
    Avatar
} from '@mui/material';
import {
    Edit as EditIcon,
    Delete as DeleteIcon,
    AccountCircle,
    Block as BlacklistIcon
} from '@mui/icons-material';

import '../assets/css/user-list.css';

class BookingList extends Component {

    constructor(props) {
        super(props);
        this.state = {
            user: null,
            page: 0,
            pageSize: Env.PAGE_SIZE,
            columns: [],
            rows: [],
            rowCount: 0,
            loading: true,
            selectedId: null,
            selectedIds: [],
            openBlacklistDialog: false,
            openDeleteDialog: false,
            types: props.types,
            keyword: props.keyword
        };
    }

    getColumns = () => {
        const columns = [
            {
                field: 'fullName',
                headerName: commonStrings.USER,
                flex: 1,
                renderCell: (params) => (
                    <Link href={`/user?u=${params.row._id}`} className='us-user'>
                        <span className='us-avatar'>
                            {params.row.avatar ?
                                params.row.type === Env.RECORD_TYPE.COMPANY ?
                                    <img src={Helper.joinURL(Env.CDN_USERS, params.row.avatar)}
                                        alt={params.row.fullName}
                                        style={{ width: Env.COMPANY_IMAGE_WIDTH }}
                                    />
                                    :
                                    < Avatar
                                        src={Helper.joinURL(Env.CDN_USERS, params.row.avatar)}
                                        className='avatar-small'
                                    />
                                :
                                <AccountCircle className='avatar-small' color='disabled' />
                            }
                        </span>
                        <span>{params.value}</span>
                    </Link>
                )
            },
            {
                field: 'email',
                headerName: commonStrings.EMAIL,
                flex: 1
            },
            {
                field: 'phone',
                headerName: commonStrings.PHONE,
                flex: 1
            },
            {
                field: 'type',
                headerName: commonStrings.TYPE,
                flex: 1,
                renderCell: (params) => (
                    <span className={`bs us-${params.value}`}>{Helper.getUserType(params.value)}</span>
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
                                <IconButton href={`update-user?u=${params.row._id}`}>
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
                                <Tooltip title={strings.BLACKLIST_SELECTION}>
                                    <IconButton onClick={() => {
                                        this.setState({ openBlacklistDialog: true });
                                    }}>
                                        <BlacklistIcon />
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

        if (this.props.hideTypeColumn) {
            columns.splice(3, 1);
        }

        return columns;
    }

    handleCancelBlacklist = () => {
        this.setState({ openBlacklistDialog: false });
    };

    handleConfirmBlacklist = () => {
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

                this.setState({ openBlacklistDialog: false });
            })
            .catch(() => {
                toast(commonStrings.GENERIC_ERROR, { type: 'error' });
                this.setState({ openBlacklistDialog: false });
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
        const { types, keyword, page, pageSize } = this.state;

        this.setState({ loading: true });

        UserService.getUsers(types, keyword, page + 1, pageSize)
            .then(data => {
                console.log('!');
                const _data = data.length > 0 ? data[0] : {};
                const totalRecords = _data.pageInfo.length > 0 ? _data.pageInfo[0].totalRecords : 0;
                this.setState({ rows: _data.resultData, rowCount: totalRecords }, () => {
                    this.setState({ loading: false });

                    if (this.props.onLoad) {
                        this.props.onLoad({ rows: _data.resultData, rowCount: totalRecords });
                    }
                });
            })
            .catch((err) => {
                toast(commonStrings.GENERIC_ERROR, { type: 'error' });
            });
    };

    static getDerivedStateFromProps(nextProps, prevState) {
        const { types, keyword } = prevState;

        if (nextProps.types && !Helper.arrayEqual(types, nextProps.types)) {
            return { types: Helper.clone(nextProps.types) };
        }

        if (keyword !== nextProps.keyword) {
            return { keyword: nextProps.keyword };
        }

        return null;
    }

    componentDidUpdate(prevProps, prevState) {
        if (!Helper.arrayEqual(this.state.types, prevState.types)) {
            console.log('1')
            return this.setState({ page: 0 }, () => this.fetch());
        }

        if (this.state.keyword !== prevState.keyword) {
            console.log('2')
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
            user,
            columns,
            rows,
            rowCount,
            loading,
            page,
            pageSize,
            openDeleteDialog,
            openBlacklistDialog,
            selectedIds,
        } = this.state;

        return (
            <div style={{ width: this.props.width || '100%', height: this.props.height || 400 }} className='us-list' >
                {user && columns.length > 0 &&
                    <DataGrid
                        checkboxSelection={this.props.checkboxSelection}
                        getRowId={(row) => row._id}
                        columns={columns}
                        rows={rows}
                        rowCount={rowCount}
                        // loading={loading}
                        rowsPerPageOptions={[Env.PAGE_SIZE, 50, 100]}
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
                    open={openBlacklistDialog}
                >
                    <DialogTitle className='dialog-header'>{commonStrings.CONFIRM_TITLE}</DialogTitle>
                    <DialogContent className='us-blacklist-user'>
                        {strings.BLACKLIST_USERS}
                    </DialogContent>
                    <DialogActions className='dialog-actions'>
                        <Button onClick={this.handleCancelBlacklist} variant='contained' className='btn-secondary'>{commonStrings.CANCEL}</Button>
                        <Button onClick={this.handleConfirmBlacklist} variant='contained' className='btn-primary'>{commonStrings.CONFIRM}</Button>
                    </DialogActions>
                </Dialog>

                <Dialog
                    disableEscapeKeyDown
                    maxWidth="xs"
                    open={openDeleteDialog}
                >
                    <DialogTitle className='dialog-header'>{commonStrings.CONFIRM_TITLE}</DialogTitle>
                    <DialogContent className='dialog-content'>{selectedIds.length === 0 ? strings.DELETE_USER : strings.DELETE_USERS}</DialogContent>
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