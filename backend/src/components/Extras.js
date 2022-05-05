import React, { Component } from 'react';
import Master from '../elements/Master';
import Env from '../config/env.config';
import { strings } from '../config/app.config';
import ExtraService from '../services/ExtraService';
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
    AddCircle as ExtraIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Search as SearchIcon
} from '@mui/icons-material';

import '../assets/css/extras.css';

export default class Extras extends Component {

    constructor(props) {
        super(props);
        this.state = {
            isLoading: false,
            keyword: '',
            page: 1,
            extras: [],
            openDeleteDialog: false,
            extraId: '',
            extraIndex: -1
        };
    }

    handleDelete = (e) => {
        const extraId = e.currentTarget.getAttribute('data-id');
        const extraIndex = e.currentTarget.getAttribute('data-index');
        this.setState({ openDeleteDialog: true, extraId, extraIndex });
    };

    handleConfirmDelete = _ => {
        const { extraId, extraIndex, extras } = this.state;

        if (extraId !== '' && extraIndex > -1) {
            this.setState({ isLoading: true, openDeleteDialog: false });
            ExtraService.delete(extraId).then(status => {
                if (status === 200) {
                    const _extras = [...extras];
                    _extras.splice(extraIndex, 1);
                    this.setState({ extras: _extras, isLoading: false, extraId: '', extraIndex: -1 });
                } else {
                    toast(strings.GENERIC_ERROR, { type: 'error' });
                    this.setState({ isLoading: false, extraId: '', extraIndex: -1 });
                }
            }).catch(() => {
                toast(strings.GENERIC_ERROR, { type: 'error' })
                this.setState({ isLoading: false, extraId: '', extraIndex: -1 });
            });
        } else {
            toast(strings.GENERIC_ERROR, { type: 'error' });
            this.setState({ openDeleteDialog: false, extraId: '', extraIndex: -1 });
        }
    };

    handleCancelDelete = _ => {
        this.setState({ openDeleteDialog: false, extraId: '' });
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
        const { keyword, page, extras } = this.state;

        this.setState({ isLoading: true });
        ExtraService.getExtras(keyword, page, Env.PAGE_SIZE)
            .then(data => {
                setTimeout(_ => {
                    const _extras = page === 1 ? data : [...extras, ...data];
                    this.setState({ extras: _extras, isLoading: false, fetch: data.length > 0 });
                }, 1000);
            })
            .catch(_ => toast(strings.GENERIC_ERROR, { type: 'error' }));
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
        const { isLoading, extras, openDeleteDialog } = this.state;

        return (
            <Master onLoad={this.onLoad} strict={true} admin={true}>
                <div className='extras'>
                    <div className='col-1'>
                        <Input
                            type="text"
                            className='search'
                            placeholder={strings.SEARCH_PLACEHOLDER}
                            onKeyDown={this.handleSearchKeyDown}
                            onChange={this.handleSearchChange}
                        />
                        <IconButton onClick={this.handleSearch}>
                            <SearchIcon />
                        </IconButton>
                        <Button
                            type="submit"
                            variant="contained"
                            className='btn-primary new-extra'
                            size="small"
                            href='/create-extra'
                        >
                            {strings.NEW_EXTRA}
                        </Button>
                    </div>
                    <div className='col-2'>
                        <List className='list'>
                            {extras.map((extra, index) =>
                            (
                                <ListItem
                                    key={extra._id}
                                    secondaryAction={
                                        <div>
                                            <IconButton edge="end" href={`/update-extra?c=${extra._id}`}>
                                                <EditIcon />
                                            </IconButton>
                                            <IconButton edge="end" data-id={extra._id} data-index={index} onClick={this.handleDelete}>
                                                <DeleteIcon />
                                            </IconButton>
                                        </div>
                                    }
                                >
                                    <ListItemAvatar>
                                        <Avatar>
                                            <ExtraIcon />
                                        </Avatar>
                                    </ListItemAvatar>
                                    <ListItemText
                                        primary={
                                            <Typography className='extra-title'>{extra.name}</Typography>
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
                    <DialogTitle>{strings.CONFIRM_TITLE}</DialogTitle>
                    <DialogContent>{strings.DELETE_EXTRA}</DialogContent>
                    <DialogActions>
                        <Button onClick={this.handleCancelDelete} variant='contained' className='btn-secondary'>{strings.CANCEL}</Button>
                        <Button onClick={this.handleConfirmDelete} variant='contained' color='error'>{strings.DELETE}</Button>
                    </DialogActions>
                </Dialog>
                {isLoading && <Backdrop text={strings.LOADING} />}
            </Master>
        );
    }
}