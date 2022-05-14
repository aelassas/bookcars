import React, { Component } from 'react';
import Master from '../elements/Master';
import Env from '../config/env.config';
import { strings as commonStrings } from '../lang/common';
import { strings } from '../lang/locations';
import LocationService from '../services/LocationService';
import Backdrop from '../elements/SimpleBackdrop';
import { toast } from 'react-toastify';
import {
    List,
    ListItem,
    ListItemText,
    ListItemAvatar,
    Avatar,
    IconButton,
    Typography,
    Input,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
} from '@mui/material';
import {
    LocationOn as LocationIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Search as SearchIcon
} from '@mui/icons-material';

import '../assets/css/locations.css';

export default class Locations extends Component {

    constructor(props) {
        super(props);
        this.state = {
            loading: false,
            keyword: '',
            page: 1,
            locations: [],
            openInfoDialog: false,
            openDeleteDialog: false,
            locationId: '',
            locationIndex: -1
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
                    toast(commonStrings.GENERIC_ERROR, { type: 'error' });
                }
            })
            .catch(() => toast(commonStrings.GENERIC_ERROR, { type: 'error' }));
    };

    handleCloseInfo = () => {
        this.setState({ openInfoDialog: false });
    };

    handleConfirmDelete = () => {
        const { locationId, locationIndex, locations } = this.state;

        if (locationId !== '' && locationIndex > -1) {
            this.setState({ loading: true, openDeleteDialog: false });
            LocationService.delete(locationId).then(status => {
                if (status === 200) {
                    const _locations = [...locations];
                    _locations.splice(locationIndex, 1);
                    this.setState({ locations: _locations, loading: false, locationId: '', locationIndex: -1 });
                } else {
                    toast(commonStrings.GENERIC_ERROR, { type: 'error' });
                    this.setState({ loading: false, locationId: '', locationIndex: -1 });
                }
            }).catch(() => {
                toast(commonStrings.GENERIC_ERROR, { type: 'error' })
                this.setState({ loading: false, locationId: '', locationIndex: -1 });
            });
        } else {
            toast(commonStrings.GENERIC_ERROR, { type: 'error' });
            this.setState({ openDeleteDialog: false, locationId: '', locationIndex: -1 });
        }
    };

    handleCancelDelete = () => {
        this.setState({ openDeleteDialog: false, locationId: '' });
    };

    handleSearchChange = (e) => {
        this.setState({ keyword: e.target.value });
    };

    handleSearchKeyDown = (e) => {
        if (e.key === 'Enter') {
            this.handleSearch();
        }
    }

    handleSearch = (e) => {
        document.querySelector('.col-2').scrollTo(0, 0);
        this.setState({ page: 1 }, () => {
            this.fetch();
        });
    };

    fetch = () => {
        const { keyword, page, locations } = this.state;

        this.setState({ loading: true });
        LocationService.getLocations(keyword, page, Env.PAGE_SIZE)
            .then(data => {
                const _locations = page === 1 ? data : [...locations, ...data];
                this.setState({ locations: _locations, loading: false, fetch: data.length > 0 });
            })
            .catch(() => toast(commonStrings.GENERIC_ERROR, { type: 'error' }));
    }

    onLoad = (user) => {
        this.fetch();

        const div = document.querySelector('.col-2');
        if (div) {
            div.onscroll = (event) => {
                const { fetch, loading, page } = this.state;
                if (fetch && !loading && (((window.innerHeight - Env.PAGE_TOP_OFFSET) + event.target.scrollTop)) >= (event.target.scrollHeight - Env.PAGE_FETCH_OFFSET)) {
                    this.setState({ page: page + 1 }, () => {
                        this.fetch();
                    });
                }
            };
        }
    }

    componentDidMount() {
    }

    render() {
        const { loading, locations, openInfoDialog, openDeleteDialog } = this.state;

        return (
            <Master onLoad={this.onLoad} strict={true}>
                <div className='locations'>
                    <div className='col-1'>
                        <Input
                            type="text"
                            className='search'
                            placeholder={commonStrings.SEARCH_PLACEHOLDER}
                            onKeyDown={this.handleSearchKeyDown}
                            onChange={this.handleSearchChange}
                        />
                        <IconButton onClick={this.handleSearch}>
                            <SearchIcon />
                        </IconButton>
                        <Button
                            variant="contained"
                            className='btn-primary new-location'
                            size="small"
                            href='/create-location'
                        >
                            {strings.NEW_LOCATION}
                        </Button>
                    </div>
                    <div className='col-2'>
                        <List className='list'>
                            {locations.map((location, index) =>
                            (
                                <ListItem
                                    key={location._id}
                                    secondaryAction={
                                        <div>
                                            <IconButton edge="end" href={`/update-location?l=${location._id}`}>
                                                <EditIcon />
                                            </IconButton>
                                            <IconButton edge="end" data-id={location._id} data-index={index} onClick={this.handleDelete}>
                                                <DeleteIcon />
                                            </IconButton>
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
                        </List>
                    </div>
                </div>
                <Dialog
                    disableEscapeKeyDown
                    maxWidth="xs"
                    open={openInfoDialog}
                >
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
            </Master>
        );
    }
}