import React, { useCallback, useEffect, useRef, useState } from 'react';
import { strings as commonStrings } from '../lang/common';
import { strings } from '../lang/notifications';
import Master from '../elements/Master';
import * as UserService from '../services/UserService';
import * as NotificationService from '../services/NotificationService';
import { Button, Card, CardContent, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Tooltip, Typography } from '@mui/material';
import {
    Visibility as ViewIcon,
    Drafts as MarkReadIcon,
    Markunread as MarkUnreadIcon,
    Delete as DeleteIcon,
    ArrowBackIos as PreviousPageIcon,
    ArrowForwardIos as NextPageIcon
} from '@mui/icons-material';
import * as Helper from '../common/Helper';
import Env from '../config/env.config';
import Backdrop from '../elements/SimpleBackdrop';
import { format } from 'date-fns';
import { fr, enUS } from "date-fns/locale";

import '../assets/css/notifications.css';

const Notifications = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [rows, setRows] = useState([]);
    const [rowCount, setRowCount] = useState(-1);
    const [totalRecords, setTotalRecords] = useState(-1);
    const [notificationCount, setNotificationCount] = useState(-1);
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [selectedRows, setSelectedRows] = useState([]);
    const notificationsListRef = useRef(null);

    const _fr = user && user.language === 'fr';
    const _locale = _fr ? fr : enUS;
    const _format = _fr ? 'eee d LLLL, kk:mm' : 'eee, d LLLL, kk:mm';

    const fetch = useCallback(async () => {
        if (user) {
            try {
                setLoading(true);
                const data = await NotificationService.getNotifications(user._id, page);
                const _data = data[0];
                const _rows = _data.resultData.map(row => ({ checked: false, ...row }));
                const _totalRecords = _data.pageInfo.length > 0 ? _data.pageInfo[0].totalRecords : 0;
                setTotalRecords(_totalRecords);
                setRowCount(((page - 1) * Env.PAGE_SIZE) + _rows.length);
                setRows(_rows);
                if (notificationsListRef.current) notificationsListRef.current.scrollTo(0, 0);
                setLoading(false);
            }
            catch (err) {
                UserService.signout();
            }
        }
    }, [user, page]);

    useEffect(() => {
        fetch();
    }, [fetch]);

    useEffect(() => {
        if (user) {
            const _init = async () => {
                const notificationCounter = await NotificationService.getNotificationCounter(user._id);
                const _notificationCount = notificationCounter.count;
                setNotificationCount(_notificationCount);
            };

            _init();
        }
    }, [user]);

    const onLoad = async (user) => {
        setUser(user);
    };

    const checkedRows = rows.filter(row => row.checked);
    const allChecked = rows.length > 0 && checkedRows.length === rows.length;
    const indeterminate = checkedRows.length > 0 && checkedRows.length < rows.length;

    return (
        <Master onLoad={onLoad} notificationCount={notificationCount} strict>

            <div className='notifications'>

                {
                    totalRecords === 0 &&
                    <Card variant="outlined" className="empty-list">
                        <CardContent>
                            <Typography color="textSecondary">{strings.EMPTY_LIST}</Typography>
                        </CardContent>
                    </Card>
                }


                {
                    totalRecords > 0 &&
                    <>
                        <div className='header-container'>
                            <div className='header'>
                                <div className='header-checkbox'>
                                    <Checkbox
                                        checked={allChecked}
                                        indeterminate={indeterminate}
                                        onChange={(event) => {
                                            if (indeterminate) {
                                                rows.forEach(row => {
                                                    row.checked = false;
                                                });
                                            } else {
                                                rows.forEach(row => {
                                                    row.checked = event.target.checked;
                                                });
                                            }
                                            setRows(Helper.clone(rows));
                                        }} />
                                </div>
                                {
                                    checkedRows.length > 0 &&
                                    <div className='header-actions'>
                                        {
                                            checkedRows.some(row => !row.isRead) &&
                                            <Tooltip title={strings.MARK_ALL_AS_READ}>
                                                <IconButton onClick={async () => {
                                                    try {
                                                        const _rows = checkedRows.filter(row => !row.isRead);
                                                        const ids = _rows.map(row => row._id);
                                                        const status = await NotificationService.markAsRead(user._id, ids);

                                                        if (status === 200) {
                                                            _rows.forEach(row => {
                                                                row.isRead = true;
                                                            });
                                                            setRows(Helper.clone(rows));
                                                            setNotificationCount(notificationCount - _rows.length);
                                                        } else {
                                                            Helper.error();
                                                        }
                                                    }
                                                    catch (err) {
                                                        UserService.signout();
                                                    }
                                                }}>
                                                    <MarkReadIcon />
                                                </IconButton>
                                            </Tooltip>
                                        }
                                        {
                                            checkedRows.some(row => row.isRead) &&
                                            <Tooltip title={strings.MARK_ALL_AS_UNREAD}>
                                                <IconButton onClick={async () => {
                                                    try {
                                                        const _rows = checkedRows.filter(row => row.isRead);
                                                        const ids = _rows.map(row => row._id);
                                                        const status = await NotificationService.markAsUnread(user._id, ids);

                                                        if (status === 200) {
                                                            _rows.forEach(row => {
                                                                row.isRead = false;
                                                            });
                                                            setRows(Helper.clone(rows));
                                                            setNotificationCount(notificationCount + _rows.length);
                                                        } else {
                                                            Helper.error();
                                                        }
                                                    }
                                                    catch (err) {
                                                        UserService.signout();
                                                    }
                                                }}>
                                                    <MarkUnreadIcon />
                                                </IconButton>
                                            </Tooltip>
                                        }
                                        <Tooltip title={strings.DELETE_ALL}>
                                            <IconButton onClick={() => {
                                                setSelectedRows(checkedRows);
                                                setOpenDeleteDialog(true);
                                            }}>
                                                <DeleteIcon />
                                            </IconButton>
                                        </Tooltip>
                                    </div>
                                }
                            </div>
                        </div>
                        <div ref={notificationsListRef} className='notifications-list'>
                            {
                                rows.map((row, index) => (
                                    <div key={row._id} className='notification-container'>
                                        <div className='notification-checkbox'>
                                            <Checkbox checked={row.checked} onChange={(event) => {
                                                row.checked = event.target.checked;
                                                setRows(Helper.clone(rows));
                                            }} />
                                        </div>
                                        <div className={`notification${!row.isRead ? ' unread' : ''}`}>
                                            <div className='date'>
                                                {Helper.capitalize(format(new Date(row.createdAt), _format, { locale: _locale }))}
                                            </div>
                                            <div className='message-container'>
                                                <div className='message'>
                                                    {row.message}
                                                </div>
                                                <div className='actions'>
                                                    {
                                                        row.booking &&
                                                        <Tooltip title={strings.VIEW}>
                                                            <IconButton onClick={async () => {
                                                                try {
                                                                    const navigate = () => {
                                                                        window.location.href = `/booking?b=${row.booking}`;
                                                                    };

                                                                    if (!row.isRead) {
                                                                        const status = await NotificationService.markAsRead(user._id, [row._id]);

                                                                        if (status === 200) {
                                                                            row.isRead = true;
                                                                            setRows(Helper.clone(rows));
                                                                            setNotificationCount(notificationCount - 1);
                                                                            navigate();
                                                                        } else {
                                                                            Helper.error();
                                                                        }
                                                                    } else {
                                                                        navigate();
                                                                    }
                                                                }
                                                                catch (err) {
                                                                    UserService.signout();
                                                                }
                                                            }}>
                                                                <ViewIcon />
                                                            </IconButton>
                                                        </Tooltip>
                                                    }
                                                    {
                                                        !row.isRead ?
                                                            <Tooltip title={strings.MARK_AS_READ}>
                                                                <IconButton onClick={async () => {
                                                                    try {
                                                                        const status = await NotificationService.markAsRead(user._id, [row._id]);

                                                                        if (status === 200) {
                                                                            row.isRead = true;
                                                                            setRows(Helper.clone(rows));
                                                                            setNotificationCount(notificationCount - 1);
                                                                        } else {
                                                                            Helper.error();
                                                                        }
                                                                    }
                                                                    catch (err) {
                                                                        UserService.signout();
                                                                    }
                                                                }}>
                                                                    <MarkReadIcon />
                                                                </IconButton>
                                                            </Tooltip>
                                                            :
                                                            <Tooltip title={strings.MARK_AS_UNREAD}>
                                                                <IconButton onClick={async () => {
                                                                    try {
                                                                        const status = await NotificationService.markAsUnread(user._id, [row._id]);

                                                                        if (status === 200) {
                                                                            row.isRead = false;
                                                                            setRows(Helper.clone(rows));
                                                                            setNotificationCount(notificationCount + 1);
                                                                        } else {
                                                                            Helper.error();
                                                                        }
                                                                    }
                                                                    catch (err) {
                                                                        UserService.signout();
                                                                    }
                                                                }}>
                                                                    <MarkUnreadIcon />
                                                                </IconButton>
                                                            </Tooltip>
                                                    }
                                                    <Tooltip title={commonStrings.DELETE}>
                                                        <IconButton onClick={() => {
                                                            setSelectedRows([row]);
                                                            setOpenDeleteDialog(true);
                                                        }}>
                                                            <DeleteIcon />
                                                        </IconButton>
                                                    </Tooltip>
                                                </div>
                                            </div>

                                        </div>
                                    </div>
                                ))
                            }
                        </div>
                        <div className='footer'>

                            {
                                rowCount > -1 &&
                                <div className='row-count'>
                                    {`${((page - 1) * Env.PAGE_SIZE) + 1}-${rowCount} ${commonStrings.OF} ${totalRecords}`}
                                </div>
                            }

                            <div className='actions'>
                                <IconButton
                                    disabled={page === 1}
                                    onClick={() => {
                                        const _page = page - 1;
                                        setRowCount(_page < Math.ceil(totalRecords / Env.PAGE_SIZE) ? ((_page - 1) * Env.PAGE_SIZE) + Env.PAGE_SIZE : totalRecords);
                                        setPage(_page);
                                    }}>
                                    <PreviousPageIcon className='icon' />
                                </IconButton>
                                <IconButton
                                    disabled={(((page - 1) * Env.PAGE_SIZE) + rows.length) === totalRecords}
                                    onClick={() => {
                                        const _page = page + 1;
                                        setRowCount(_page < Math.ceil(totalRecords / Env.PAGE_SIZE) ? ((_page - 1) * Env.PAGE_SIZE) + Env.PAGE_SIZE : totalRecords);
                                        setPage(_page);
                                    }}
                                >
                                    <NextPageIcon className='icon' />
                                </IconButton>
                            </div>

                        </div>

                        <Dialog
                            disableEscapeKeyDown
                            maxWidth="xs"
                            open={openDeleteDialog}
                        >
                            <DialogTitle className='dialog-header'>{commonStrings.CONFIRM_TITLE}</DialogTitle>
                            <DialogContent>{selectedRows.length > 1 ? strings.DELETE_NOTIFICATIONS : strings.DELETE_NOTIFICATION}</DialogContent>
                            <DialogActions className='dialog-actions'>
                                <Button onClick={() => {
                                    setOpenDeleteDialog(false);
                                }} variant='contained' className='btn-secondary'>{commonStrings.CANCEL}</Button>
                                <Button onClick={async () => {
                                    try {
                                        const ids = selectedRows.map(row => row._id);
                                        const status = await NotificationService.deleteNotifications(user._id, ids);

                                        if (status === 200) {
                                            if (selectedRows.length === rows.length) {
                                                const _page = 1;
                                                const _totalRecords = totalRecords - selectedRows.length;
                                                setRowCount(_page < Math.ceil(_totalRecords / Env.PAGE_SIZE) ? ((_page - 1) * Env.PAGE_SIZE) + Env.PAGE_SIZE : _totalRecords);

                                                if (page > 1) {
                                                    setPage(1);
                                                } else {
                                                    fetch();
                                                }
                                            } else {
                                                selectedRows.forEach(row => {
                                                    rows.splice(rows.findIndex(_row => _row._id === row._id), 1);
                                                });
                                                setRows(Helper.clone(rows));
                                                setRowCount(rowCount - selectedRows.length);
                                                setTotalRecords(totalRecords - selectedRows.length);
                                            }
                                            setNotificationCount(notificationCount - selectedRows.length);
                                            setOpenDeleteDialog(false);
                                        } else {
                                            Helper.error();
                                        }
                                    }
                                    catch (err) {
                                        UserService.signout();
                                    }
                                }} variant='contained' color='error'>{commonStrings.DELETE}</Button>
                            </DialogActions>
                        </Dialog>
                    </>
                }
            </div>
            {loading && <Backdrop text={commonStrings.LOADING} />}
        </Master >
    );
};

export default Notifications;