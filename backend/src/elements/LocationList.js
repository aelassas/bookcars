import React, { Component } from 'react';
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

class LocationList extends Component {
    constructor(props) {
        super(props);
        this.state = {
            keyword: props.keyword,
            loading: true,
            fetch: false,
            reload: false,
            rows: [],
            rowCount: 0,
            page: 1,
            size: Env.PAGE_SIZE,
            openDeleteDialog: false,
            openInfoDialog: false,
            locationId: '',
            locationIndex: -1,
            offset: 0
        };
    }

    handleDelete = (e) => {
        const locationId = e.currentTarget.getAttribute('data-id');
        const locationIndex = e.currentTarget.getAttribute('data-index');

        LocationService.check(locationId)
            .then(status => {
                if (status === 204) {
                    this.setState({ openDeleteDialog: true, locationId, locationIndex });
                } else if (status === 200) {
                    this.setState({ openInfoDialog: true });
                } else {
                    Helper.error();
                }
            })
            .catch(() => UserService.signout());
    };

    handleCloseInfo = () => {
        this.setState({ openInfoDialog: false });
    };

    handleConfirmDelete = () => {
        const { locationId, locationIndex, rows, rowCount } = this.state;

        if (locationId !== '' && locationIndex > -1) {
            this.setState({ loading: true, openDeleteDialog: false });
            LocationService.deleteLocation(locationId)
                .then(status => {
                    if (status === 200) {
                        rows.splice(locationIndex, 1);
                        this.setState({ rows, rowCount: rowCount - 1, loading: false, locationId: '', locationIndex: -1 }, () => {
                            if (this.props.onDelete) {
                                this.props.onDelete(this.state.rowCount);
                            }
                        });
                    } else {
                        Helper.error();
                        this.setState({ loading: false, locationId: '', locationIndex: -1 });
                    }
                }).catch(() => {
                    UserService.signout();
                });
        } else {
            Helper.error();
            this.setState({ openDeleteDialog: false, locationId: '', locationIndex: -1 });
        }
    };

    handleCancelDelete = () => {
        this.setState({ openDeleteDialog: false, locationId: '' });
    };

    fetch = () => {
        const { keyword, page, rows } = this.state;

        this.setState({ loading: true });
        LocationService.getLocations(keyword, page, Env.PAGE_SIZE)
            .then(data => {
                const _data = data.length > 0 ? data[0] : {};
                if (_data.length === 0) _data.resultData = [];
                const totalRecords = _data.pageInfo.length > 0 ? _data.pageInfo[0].totalRecords : 0;
                const _rows = page === 1 ? _data.resultData : [...rows, ..._data.resultData];
                this.setState({ rows: _rows, rowCount: totalRecords, fetch: _data.resultData.length > 0 }, () => {

                    if (this.props.onLoad) {
                        this.props.onLoad({ rows: _data.resultData, rowCount: totalRecords });
                    }

                    this.setState({ loading: false });
                });
            })
            .catch((err) => Helper.error(err));
    }

    static getDerivedStateFromProps(nextProps, prevState) {
        const { keyword, reload, offset } = prevState;

        if (keyword !== nextProps.keyword) {
            return { keyword: nextProps.keyword };
        }

        if (reload !== nextProps.reload) {
            return { reload: nextProps.reload };
        }

        if (offset !== nextProps.offset) {
            return { offset: nextProps.offset };
        }

        return null;
    }

    componentDidUpdate(prevProps, prevState) {
        const { keyword, reload } = this.state;

        if (keyword !== prevState.keyword) {
            return this.setState({ page: 1 }, () => this.fetch());
        }

        if (reload && !prevState.reload) {
            return this.setState({ page: 1 }, () => this.fetch());
        }
    }

    componentDidMount() {
        const element = document.querySelector(`.${this.props.containerClassName}`);
        if (element) {
            element.onscroll = (event) => {
                const { fetch, loading, page, offset } = this.state;

                let _offset = 0;
                if (Env.isMobile()) _offset = offset;

                if (fetch
                    && !loading
                    && event.target.scrollTop > 0
                    && (event.target.offsetHeight + event.target.scrollTop + _offset) >= (event.target.scrollHeight - Env.PAGE_OFFSET)) {
                    this.setState({ page: page + 1 }, () => {
                        this.fetch();
                    });
                }
            };
        }

        this.fetch();
    }

    render() {
        const { loading, rows, openDeleteDialog, openInfoDialog } = this.state;

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
                                            <IconButton edge="end" data-id={location._id} data-index={index} onClick={this.handleDelete}>
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
                        <Button onClick={this.handleCloseInfo} variant='contained' className='btn-secondary'>{commonStrings.CLOSE}</Button>
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
                        <Button onClick={this.handleCancelDelete} variant='contained' className='btn-secondary'>{commonStrings.CANCEL}</Button>
                        <Button onClick={this.handleConfirmDelete} variant='contained' color='error'>{commonStrings.DELETE}</Button>
                    </DialogActions>
                </Dialog>

                {loading && <Backdrop text={commonStrings.LOADING} />}
            </section>
        );
    }
}

export default LocationList;