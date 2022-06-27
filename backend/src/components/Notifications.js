import React, { useCallback, useEffect, useRef, useState } from 'react';
import { strings as commonStrings } from '../lang/common';
import { strings } from '../lang/notifications';
import Master from '../elements/Master';
// import UserService from '../services/UserService';
import NotificationService from '../services/NotificationService';
import { Card, CardContent, Checkbox, IconButton, Tooltip, Typography } from '@mui/material';
import {
    Visibility as ViewIcon,
    Drafts as MarkReadIcon,
    Markunread as MarkUnreadIcon,
    Delete as DeleteIcon,
    ArrowBackIos as PreviousPageIcon,
    ArrowForwardIos as NextPageIcon
} from '@mui/icons-material';
import Helper from '../common/Helper';
import Env from '../config/env.config';
import Backdrop from '../elements/SimpleBackdrop';

import '../assets/css/notifications.css';

export default function Notifications() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [rows, setRows] = useState([]);
    const [totalRecords, setTotalRecords] = useState(-1);
    const notificationsListRef = useRef(null);

    const locale = user && user.language === 'en' ? 'en-US' : 'fr-FR';
    const options = { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' };

    const fetch = useCallback(async () => {
        if (user) {
            try {
                setLoading(true);
                const data = await NotificationService.getNotifications(user._id, page);
                const _data = data[0];
                const _rows = _data.resultData.map(row => ({ checked: false, ...row }));
                const _totalRecords = _data.pageInfo.length > 0 ? _data.pageInfo[0].totalRecords : 0;
                setTotalRecords(_totalRecords);
                setRows(_rows);
                // setRowCount(((page - 1) * Env.PAGE_SIZE) + _rows.length);
                setLoading(false);
                if (notificationsListRef.current) notificationsListRef.current.scrollTo(0, 0);
            }
            catch (err) {
                // UserService.signout();
                console.log(err);
            }
        }
    }, [user, page]);

    useEffect(() => {
        fetch();
    }, [fetch]);

    const onLoad = async (user) => {
        setUser(user);
    };

    const checkedRows = rows.filter(row => row.checked);
    const allChecked = rows.length > 0 && checkedRows.length === rows.length;
    const indeterminate = checkedRows.length > 0 && checkedRows.length < rows.length;

    return (
        <Master onLoad={onLoad} strict>


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
                                            rows.forEach(row => {
                                                row.checked = event.target.checked;
                                            });
                                            setRows(Helper.clone(rows));
                                        }} />
                                </div>
                                {
                                    checkedRows.length > 0 &&
                                    <div className='header-actions'>
                                        <Tooltip title={strings.MARK_ALL_AS_READ}>
                                            <IconButton>
                                                <MarkReadIcon />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title={strings.MARK_ALL_AS_UNREAD}>
                                            <IconButton>
                                                <MarkUnreadIcon />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title={strings.DELETE_ALL}>
                                            <IconButton>
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
                                                {new Date(row.createdAt).toLocaleString(locale, options)}
                                            </div>
                                            <div className='message-container'>
                                                <div className='message'>
                                                    {row.message}
                                                </div>
                                                <div className='actions'>
                                                    {
                                                        row.link &&
                                                        <Tooltip title={strings.VIEW}>
                                                            <IconButton href={row.link}>
                                                                <ViewIcon />
                                                            </IconButton>
                                                        </Tooltip>
                                                    }
                                                    {
                                                        !row.isRead ?
                                                            <Tooltip title={strings.MARK_AS_READ}>
                                                                <IconButton>
                                                                    <MarkReadIcon />
                                                                </IconButton>
                                                            </Tooltip>
                                                            :
                                                            <Tooltip title={strings.MARK_AS_UNREAD}>
                                                                <IconButton>
                                                                    <MarkUnreadIcon />
                                                                </IconButton>
                                                            </Tooltip>
                                                    }
                                                    <Tooltip title={commonStrings.DELETE}>
                                                        <IconButton>
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

                            <div className='row-count'>
                                {`${((page - 1) * Env.PAGE_SIZE) + 1}-${page < Math.ceil(totalRecords / Env.PAGE_SIZE) ? ((page - 1) * Env.PAGE_SIZE) + Env.PAGE_SIZE : totalRecords} ${commonStrings.OF} ${totalRecords}`}
                            </div>

                            <div className='actions'>
                                <IconButton
                                    disabled={page === 1}
                                    onClick={() => {
                                        setPage(page - 1);
                                    }}>
                                    <PreviousPageIcon className='icon' />
                                </IconButton>
                                <IconButton
                                    disabled={(((page - 1) * Env.PAGE_SIZE) + rows.length) === totalRecords}
                                    onClick={() => {
                                        setPage(page + 1);
                                    }}
                                >
                                    <NextPageIcon className='icon' />
                                </IconButton>
                            </div>

                        </div>
                    </>
                }
            </div>
            {loading && <Backdrop text={commonStrings.LOADING} />}
        </Master>
    );
}