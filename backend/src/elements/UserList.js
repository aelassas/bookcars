import React, { Component } from 'react';
import Env from '../config/env.config';
import { strings as commonStrings } from '../lang/common';
import { strings } from '../lang/user-list';
import Helper from '../common/Helper';
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
    Avatar,
    Badge,
    Box
} from '@mui/material';
import {
    Edit as EditIcon,
    Delete as DeleteIcon,
    AccountCircle,
    Check as VerifiedIcon
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
            openDeleteDialog: false,
            types: props.types,
            keyword: props.keyword,
            reload: false
        };
    }

    getColumns = (user) => {
        const columns = [
            {
                field: 'fullName',
                headerName: commonStrings.USER,
                flex: 1,
                renderCell: (params) => {
                    const user = params.row;
                    let userAvatar;

                    if (user.avatar) {
                        if (user.type === Env.RECORD_TYPE.COMPANY) {
                            userAvatar = (
                                <img src={Helper.joinURL(Env.CDN_USERS, params.row.avatar)}
                                    alt={params.row.fullName}
                                    style={{ width: Env.COMPANY_IMAGE_WIDTH }}
                                />
                            );

                        } else {
                            const avatar = <Avatar
                                src={Helper.joinURL(Env.CDN_USERS, params.row.avatar)}
                                className='avatar-small'

                            />;
                            if (user.verified) {
                                userAvatar = <Badge
                                    overlap="circular"
                                    anchorOrigin={{
                                        vertical: 'bottom',
                                        horizontal: 'right',
                                    }}
                                    badgeContent={
                                        <Tooltip title={commonStrings.VERIFIED}>
                                            <Box borderRadius="50%" className="user-avatar-verified-small">
                                                <VerifiedIcon className='user-avatar-verified-icon-small' />
                                            </Box>
                                        </Tooltip>
                                    }
                                >
                                    {avatar}
                                </Badge>;
                            } else {
                                userAvatar = avatar;
                            }
                        }
                    } else {
                        const avatar = <AccountCircle className='avatar-small' color='disabled' />;

                        if (user.verified) {
                            userAvatar = <Badge
                                overlap="circular"
                                anchorOrigin={{
                                    vertical: 'bottom',
                                    horizontal: 'right',
                                }}
                                badgeContent={
                                    <Tooltip title={commonStrings.VERIFIED}>
                                        <Box borderRadius="50%" className="user-avatar-verified-small">
                                            <VerifiedIcon className='user-avatar-verified-icon-small' />
                                        </Box>
                                    </Tooltip>
                                }
                            >
                                {avatar}
                            </Badge>;
                        } else {
                            userAvatar = avatar;
                        }
                    }

                    return (
                        <Link href={`/user?u=${params.row._id}`} className='us-user'>
                            <span className='us-avatar'>{userAvatar}</span>
                            <span>{params.value}</span>
                        </Link>);

                }
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

                    const _user = params.row;
                    return (
                        user.type === Env.RECORD_TYPE.ADMIN || _user.company === user._id ?
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
                            : <></>

                    );
                },
                renderHeader: () => {
                    const { selectedIds } = this.state;

                    return (
                        selectedIds.length > 0 ?
                            <div>
                                <div style={{ width: 40, display: 'inline-block' }}></div>
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

    handleCancelDelete = () => {
        this.setState({ openDeleteDialog: false, selectedId: undefined });
    };

    handleConfirmDelete = () => {
        const { selectedIds, selectedId, rows } = this.state;
        const ids = selectedIds.length > 0 ? selectedIds : [selectedId];

        this.setState({ openDeleteDialog: false, loading: true });

        UserService.delete(ids)
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

                this.setState({ loading: false });
            })
            .catch(() => {
                toast(commonStrings.GENERIC_ERROR, { type: 'error' });
                this.setState({ loading: false });
            });
    };

    fetch = () => {
        const { user, types, keyword, page, pageSize } = this.state;

        this.setState({ loading: true });

        const payload = { user: user._id, types };

        UserService.getUsers(payload, keyword, page + 1, pageSize)
            .then(data => {
                const _data = data.length > 0 ? data[0] : {};
                if (_data.length === 0) _data.resultData = [];
                const totalRecords = _data.pageInfo.length > 0 ? _data.pageInfo[0].totalRecords : 0;
                const _rows = _data.resultData;
                this.setState({ rows: _rows, rowCount: totalRecords }, () => {
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
        const { types, keyword, reload } = prevState;

        if (nextProps.types && !Helper.arrayEqual(types, nextProps.types)) {
            return { types: Helper.clone(nextProps.types) };
        }

        if (keyword !== nextProps.keyword) {
            return { keyword: nextProps.keyword };
        }

        if (reload !== nextProps.reload) {
            return { reload: nextProps.reload };
        }

        return null;
    }

    componentDidUpdate(prevProps, prevState) {
        if (!Helper.arrayEqual(this.state.types, prevState.types)) {
            return this.setState({ page: 0 }, () => this.fetch());
        }

        if (this.state.keyword !== prevState.keyword) {
            return this.setState({ page: 0 }, () => this.fetch());
        }

        if (this.state.reload && !prevState.reload) {
            return this.setState({ page: 0 }, () => this.fetch());
        }
    }

    componentDidMount() {

        if (this.props.user) {
            const columns = this.getColumns(this.props.user);
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
                        getRowClassName={(params) => params.row.blacklisted ? 'us-blacklisted' : ''}
                        disableSelectionOnClick
                    />
                }

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