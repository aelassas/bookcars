import React, { Component } from 'react';
import Master from '../elements/Master';
import Env from '../config/env.config';
import { strings } from '../config/app.config';
import CompanyService from '../services/CompanyService';
import Backdrop from '../elements/SimpleBackdrop';
import { toast } from 'react-toastify'
import {
    List,
    ListItem,
    ListItemText,
    ListItemAvatar,
    Avatar,
    IconButton,
    Link,
    Input,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
} from '@mui/material';
import {
    CorporateFare as CompanyIcon,
    Delete as DeleteIcon,
    Edit as EditIcon,
    Search as SearchIcon
} from '@mui/icons-material';

import '../assets/css/companies.css';

export default class Companies extends Component {

    constructor(props) {
        super(props);
        this.state = {
            user: null,
            companies: [],
            page: 1,
            isLoading: false,
            fetch: false,
            keyword: '',
            openDeleteDialog: false,
            companyId: '',
            companyIndex: -1
        };
    }

    handleSearchChange = (e) => {
        this.setState({ keyword: e.target.value });
    };

    handleSearchKeyDown = (e) => {
        if (e.key === 'Enter') {
            this.handleSearch();
        }
    }

    fetch = _ => {
        const { keyword, page, companies } = this.state;

        this.setState({ isLoading: true });
        CompanyService.getCompanies(keyword, page, Env.PAGE_SIZE)
            .then(data => {
                setTimeout(_ => {
                    const _companies = page === 1 ? data : [...companies, ...data];
                    this.setState({ companies: _companies, isLoading: false, fetch: data.length > 0 });
                }, 1000);
            })
            .catch(() => toast(strings.GENERIC_ERROR, { type: 'error' }));
    }

    handleSearch = (e) => {
        document.querySelector('.col-2').scrollTo(0, 0);
        this.setState({ page: 1 }, () => {
            this.fetch();
        });
    };

    handleDelete = (e) => {
        const companyId = e.currentTarget.getAttribute('data-id');
        const companyIndex = e.currentTarget.getAttribute('data-index');
        this.setState({ openDeleteDialog: true, companyId, companyIndex });
    };

    handleConfirmDelete = _ => {
        const { companyId, companyIndex, companies } = this.state;

        if (companyId !== '' && companyIndex > -1) {
            this.setState({ isLoading: true, openDeleteDialog: false });
            CompanyService.delete(companyId).then(status => {
                if (status === 200) {
                    const _companies = [...companies];
                    _companies.splice(companyIndex, 1);
                    this.setState({ companies: _companies, isLoading: false, companyId: '', companyIndex: -1 });
                } else {
                    toast(strings.GENERIC_ERROR, { type: 'error' });
                    this.setState({ isLoading: false, companyId: '', companyIndex: -1 });
                }
            }).catch(() => {
                toast(strings.GENERIC_ERROR, { type: 'error' })
                this.setState({ isLoading: false, companyId: '', companyIndex: -1 });
            });
        } else {
            toast(strings.GENERIC_ERROR, { type: 'error' });
            this.setState({ openDeleteDialog: false, companyId: '', companyIndex: -1 });
        }
    };

    handleCancelDelete = _ => {
        this.setState({ openDeleteDialog: false, companyId: '' });
    };

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
        const { companies, isLoading, openDeleteDialog } = this.state;

        return (
            <Master onLoad={this.onLoad} strict={true} admin={true}>
                <div className='companies'>
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
                            className='btn-primary new-company'
                            size="small"
                            href='/create-company'
                        >
                            {strings.NEW_COMPANY}
                        </Button>
                    </div>
                    <div className='col-2'>
                        <List className='list'>
                            {companies.map((company, index) =>
                            (
                                <ListItem
                                    key={company._id}
                                    secondaryAction={
                                        <div>
                                            <IconButton edge="end" href={`/update-company?c=${company._id}`}>
                                                <EditIcon />
                                            </IconButton>
                                            <IconButton edge="end" data-id={company._id} data-index={index} onClick={this.handleDelete}>
                                                <DeleteIcon />
                                            </IconButton>
                                        </div>
                                    }
                                >
                                    <ListItemAvatar>
                                        <Avatar>
                                            <CompanyIcon />
                                        </Avatar>
                                    </ListItemAvatar>
                                    <ListItemText
                                        primary={
                                            <Link href={`/company?c=${company._id}`} className='company-title'>{company.fullName}</Link>
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
                    <DialogContent>{strings.DELETE_COMPANY}</DialogContent>
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