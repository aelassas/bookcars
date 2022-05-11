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
            isLoading: false,
            keyword: '',
            page: 1,
            locations: [],
            openDeleteDialog: false,
            locationId: '',
            locationIndex: -1
        };
    }

    handleDelete = (e) => {
        const locationId = e.currentTarget.getAttribute('data-id');
        const locationIndex = e.currentTarget.getAttribute('data-index');
        this.setState({ openDeleteDialog: true, locationId, locationIndex });
    };

    handleConfirmDelete = _ => {
        const { locationId, locationIndex, locations } = this.state;

        if (locationId !== '' && locationIndex > -1) {
            this.setState({ isLoading: true, openDeleteDialog: false });
            LocationService.delete(locationId).then(status => {
                if (status === 200) {
                    const _locations = [...locations];
                    _locations.splice(locationIndex, 1);
                    this.setState({ locations: _locations, isLoading: false, locationId: '', locationIndex: -1 });
                } else {
                    toast(commonStrings.GENERIC_ERROR, { type: 'error' });
                    this.setState({ isLoading: false, locationId: '', locationIndex: -1 });
                }
            }).catch(() => {
                toast(commonStrings.GENERIC_ERROR, { type: 'error' })
                this.setState({ isLoading: false, locationId: '', locationIndex: -1 });
            });
        } else {
            toast(commonStrings.GENERIC_ERROR, { type: 'error' });
            this.setState({ openDeleteDialog: false, locationId: '', locationIndex: -1 });
        }
    };

    handleCancelDelete = _ => {
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

    fetch = _ => {
        const { keyword, page, locations } = this.state;

        this.setState({ isLoading: true });
        LocationService.getLocations(keyword, page, Env.PAGE_SIZE)
            .then(data => {
                const _locations = page === 1 ? data : [...locations, ...data];
                this.setState({ locations: _locations, isLoading: false, fetch: data.length > 0 });
            })
            .catch(_ => toast(commonStrings.GENERIC_ERROR, { type: 'error' }));
    }

    onLoad = (user) => {
        this.fetch();

        const div = document.querySelector('.col-2');
        if (div) {
            div.onscroll = (event) => {
                const { fetch, isLoading, page } = this.state;
                if (fetch && !isLoading && (((window.innerHeight - Env.PAGE_TOP_OFFSET) + event.target.scrollTop)) >= (event.target.scrollHeight - Env.PAGE_FETCH_OFFSET)) {
                    this.setState({ page: page + 1 }, _ => {
                        this.fetch();
                    });
                }
            };
        }
    }

    componentDidMount() {
    }

    render() {
        const { isLoading, locations, openDeleteDialog } = this.state;

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
                            type="submit"
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
                    open={openDeleteDialog}
                >
                    <DialogTitle>{commonStrings.CONFIRM_TITLE}</DialogTitle>
                    <DialogContent>{strings.DELETE_LOCATION}</DialogContent>
                    <DialogActions>
                        <Button onClick={this.handleCancelDelete} variant='contained' className='btn-secondary'>{commonStrings.CANCEL}</Button>
                        <Button onClick={this.handleConfirmDelete} variant='contained' color='error'>{commonStrings.DELETE}</Button>
                    </DialogActions>
                </Dialog>
                {isLoading && <Backdrop text={commonStrings.LOADING} />}
            </Master>
        );
    }
}