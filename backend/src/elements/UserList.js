import React, { useState, useEffect } from 'react';
import Env from '../config/env.config';
import { strings as commonStrings } from '../lang/common';
import { strings } from '../lang/user-list';
import * as Helper from '../common/Helper';
import * as UserService from '../services/UserService';
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

const UserList = (props) => {
    const [user, setUser] = useState();
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(Env.PAGE_SIZE);
    const [columns, setColumns] = useState([]);
    const [rows, setRows] = useState([]);
    const [rowCount, setRowCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [selectedId, setSelectedId] = useState();
    const [selectedIds, setSelectedIds] = useState([]);
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [types, setTypes] = useState(props.types);
    const [keyword, setKeyword] = useState(props.keyword);
    const [reload, setReload] = useState(props.reload);
    const [reloadColumns, setReloadColumns] = useState(false);

    const _fetch = (page, user) => {
        setLoading(true);

        const payload = { user: user._id, types };

        UserService.getUsers(payload, keyword, page + 1, pageSize)
            .then(data => {
                const _data = data.length > 0 ? data[0] : {};
                if (_data.length === 0) _data.resultData = [];
                const totalRecords = _data.pageInfo.length > 0 ? _data.pageInfo[0].totalRecords : 0;
                const _rows = _data.resultData;
                setRows(_rows);
                setRowCount(totalRecords);
                if (props.onLoad) {
                    props.onLoad({ rows: _data.resultData, rowCount: totalRecords });
                }
                setLoading(false);
            })
            .catch((err) => {
                UserService.signout();
            });
    };

    useEffect(() => {
        setTypes(props.types || []);
    }, [props.types]);

    useEffect(() => {
        setKeyword(props.keyword || '');
    }, [props.keyword]);


    useEffect(() => {
        setReload(props.reload || false)
    }, [props.reload]);

    useEffect(() => {
        if (props.user) {
            const columns = getColumns(props.user);
            setColumns(columns);
            setUser(props.user);
            _fetch(page, props.user);
        }
    }, [props.user, page, pageSize, types, keyword]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (reload) {
            setPage(0);
            _fetch(0, user);
        }
    }, [reload]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (user && reloadColumns) {
            const columns = getColumns(user);
            setColumns(columns);
            setReloadColumns(false);
        }
    }, [user, selectedIds, reloadColumns]); // eslint-disable-line react-hooks/exhaustive-deps

    const getColumns = (user) => {
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
                        setSelectedId(params.row._id);
                        setOpenDeleteDialog(true);
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
                    return (
                        selectedIds.length > 0 ?
                            <div>
                                <div style={{ width: 40, display: 'inline-block' }}></div>
                                <Tooltip title={strings.DELETE_SELECTION}>
                                    <IconButton
                                        onClick={() => {
                                            setOpenDeleteDialog(true);
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

        if (props.hideDesktopColumns) {
            columns.splice(1, 3);
        }


        return columns;
    }

    const handleCancelDelete = () => {
        setOpenDeleteDialog(false);
        setSelectedId('');
    };

    const handleConfirmDelete = () => {
        const ids = selectedIds.length > 0 ? selectedIds : [selectedId];

        setOpenDeleteDialog(false);
        setLoading(true);

        UserService.deleteUsers(ids)
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

                setLoading(false);
            })
            .catch(() => {
                UserService.signout();
            });
    };

    return (
        <div className='us-list' >
            {user && columns.length > 0 &&
                <DataGrid
                    checkboxSelection={props.checkboxSelection}
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
                    onSelectionModelChange={(selectedIds) => {
                        setSelectedIds(selectedIds);
                        setReloadColumns(true);
                    }}
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
                    <Button onClick={handleCancelDelete} variant='contained' className='btn-secondary'>{commonStrings.CANCEL}</Button>
                    <Button onClick={handleConfirmDelete} variant='contained' color='error'>{commonStrings.DELETE}</Button>
                </DialogActions>
            </Dialog>

            {loading && <Backdrop text={commonStrings.LOADING} />}
        </div>
    );
}

export default UserList;