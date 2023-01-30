import React, { useState, useEffect } from 'react';
import Env from '../config/env.config';
import { strings as commonStrings } from '../lang/common';
import { strings } from '../lang/locations';
import * as LocationService from '../services/LocationService';
import Backdrop from './SimpleBackdrop';
import {
    IconButton,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Tooltip,
    Card,
    CardContent,
    Typography,
    List,
    ListItem,
    ListItemAvatar,
    ListItemText,
    Avatar
} from '@mui/material';
import {
    Edit as EditIcon,
    Delete as DeleteIcon,
    LocationOn as LocationIcon
} from '@mui/icons-material';
import * as UserService from '../services/UserService';
import * as Helper from '../common/Helper';

import '../assets/css/location-list.css';

const LocationList = (props) => {
    const [keyword, setKeyword] = useState(props.keyword);
    const [reload, setReload] = useState(false);
    const [offset, setOffset] = useState(0);
    const [loading, setLoading] = useState(true);
    const [fetch, setFetch] = useState(false);
    const [rows, setRows] = useState([]);
    const [rowCount, setRowCount] = useState(0);
    const [page, setPage] = useState(1);
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [openInfoDialog, setOpenInfoDialog] = useState(false);
    const [locationId, setLocationId] = useState('');
    const [locationIndex, setLocationIndex] = useState(-1);

    useEffect(() => {
        setOffset(props.offset);
    }, [props.offset]);

    const _fetch = (page, keyword) => {
        setLoading(true);

        LocationService.getLocations(keyword, page, Env.PAGE_SIZE)
            .then(data => {
                const _data = data.length > 0 ? data[0] : {};
                if (_data.length === 0) _data.resultData = [];
                const totalRecords = _data.pageInfo.length > 0 ? _data.pageInfo[0].totalRecords : 0;
                const _rows = page === 1 ? _data.resultData : [...rows, ..._data.resultData];

                setRows(_rows);
                setRowCount(totalRecords);
                setFetch(_data.resultData.length > 0);

                if (props.onLoad) {
                    props.onLoad({ rows: _data.resultData, rowCount: totalRecords });
                }

                setLoading(false);
            })
            .catch((err) => {
                Helper.error(err);
            });
    };

    useEffect(() => {
        if (props.keyword !== keyword) {
            _fetch(1, props.keyword);
        }
        setKeyword(props.keyword || '');
    }, [props.keyword, keyword]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (props.reload && !reload) {
            _fetch(1, '');
        }
        setReload(props.reload || false);
    }, [props.reload, reload]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        const element = document.querySelector(`.${props.containerClassName}`);
        if (element) {
            element.onscroll = (event) => {
                let _offset = 0;
                if (Env.isMobile()) _offset = offset;

                if (fetch
                    && !loading
                    && event.target.scrollTop > 0
                    && (event.target.offsetHeight + event.target.scrollTop + _offset) >= (event.target.scrollHeight - Env.PAGE_OFFSET)) {
                    const p = page + 1;
                    setPage(p);
                    _fetch(p, keyword);
                }
            };
        }
    }, [props.containerClassName, offset, fetch, loading, page, keyword]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        _fetch(1, '');
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const handleDelete = (e) => {
        const locationId = e.currentTarget.getAttribute('data-id');
        const locationIndex = e.currentTarget.getAttribute('data-index');

        LocationService.check(locationId)
            .then(status => {
                if (status === 204) {
                    setOpenDeleteDialog(true);
                    setLocationId(locationId);
                    setLocationIndex(locationIndex);
                } else if (status === 200) {
                    setOpenInfoDialog(true);
                } else {
                    Helper.error();
                }
            })
            .catch(() => {
                UserService.signout();
            });
    };

    const handleCloseInfo = () => {
        setOpenInfoDialog(false);
    };

    const handleConfirmDelete = () => {
        if (locationId !== '' && locationIndex > -1) {
            setLoading(true);
            setOpenDeleteDialog(false);

            LocationService.deleteLocation(locationId)
                .then(status => {
                    if (status === 200) {
                        const _rowCount = rowCount - 1;

                        rows.splice(locationIndex, 1);

                        setRows(rows);
                        setRowCount(_rowCount);
                        setLocationId('');
                        setLocationIndex(-1);
                        setLoading(false);

                        if (props.onDelete) {
                            props.onDelete(_rowCount);
                        }
                    } else {
                        Helper.error();
                        setLocationId('');
                        setLocationIndex(-1);
                        setLoading(false);
                    }
                }).catch(() => {
                    UserService.signout();
                });
        } else {
            Helper.error();
            setOpenDeleteDialog(false);
            setLocationId('');
            setLocationIndex(-1);
        }
    };

    const handleCancelDelete = () => {
        setOpenDeleteDialog(false);
        setLocationId('');
        setLocationIndex(-1);
    };

    return (
        <section className='location-list'>
            {rows.length === 0 ?
                !loading &&
                <Card variant="outlined" className="empty-list">
                    <CardContent>
                        <Typography color="textSecondary">{strings.EMPTY_LIST}</Typography>
                    </CardContent>
                </Card>
                : <List>
                    {rows.map((location, index) =>
                    (
                        <ListItem
                            className='location-list-item'
                            key={location._id}
                            secondaryAction={
                                <div>
                                    <Tooltip title={commonStrings.UPDATE}>
                                        <IconButton edge="end" href={`/update-location?l=${location._id}`}>
                                            <EditIcon />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title={commonStrings.DELETE}>
                                        <IconButton edge="end" data-id={location._id} data-index={index} onClick={handleDelete}>
                                            <DeleteIcon />
                                        </IconButton>
                                    </Tooltip>
                                </div>
                            }
                        >
                            <ListItemAvatar>
                                <Avatar>
                                    <LocationIcon />
                                </Avatar>
                            </ListItemAvatar>
                            <ListItemText
                                primary={
                                    <Typography className='location-title'>{location.name}</Typography>
                                }
                            />
                        </ListItem>
                    ))}
                </List>}
            <Dialog
                disableEscapeKeyDown
                maxWidth="xs"
                open={openInfoDialog}
            >
                <DialogTitle className='dialog-header'>{commonStrings.INFO}</DialogTitle>
                <DialogContent>{strings.CANNOT_DELETE_LOCATION}</DialogContent>
                <DialogActions className='dialog-actions'>
                    <Button onClick={handleCloseInfo} variant='contained' className='btn-secondary'>{commonStrings.CLOSE}</Button>
                </DialogActions>
            </Dialog>

            <Dialog
                disableEscapeKeyDown
                maxWidth="xs"
                open={openDeleteDialog}
            >
                <DialogTitle className='dialog-header'>{commonStrings.CONFIRM_TITLE}</DialogTitle>
                <DialogContent>{strings.DELETE_LOCATION}</DialogContent>
                <DialogActions className='dialog-actions'>
                    <Button onClick={handleCancelDelete} variant='contained' className='btn-secondary'>{commonStrings.CANCEL}</Button>
                    <Button onClick={handleConfirmDelete} variant='contained' color='error'>{commonStrings.DELETE}</Button>
                </DialogActions>
            </Dialog>

            {loading && <Backdrop text={commonStrings.LOADING} />}
        </section>
    );
};

export default LocationList;