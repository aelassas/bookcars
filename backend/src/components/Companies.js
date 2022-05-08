import React, { Component } from 'react';
import Master from '../elements/Master';
import Env from '../config/env.config';
import { strings } from '../config/app.config';
import Helper from '../common/Helper';
import CompanyService from '../services/CompanyService';
import Backdrop from '../elements/SimpleBackdrop';
import { toast } from 'react-toastify';
import { Avatar } from '../elements/Avatar';
import {
    Input,
    IconButton,
    Button,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
} from '@mui/material';
import {
    Search as SearchIcon,
    Visibility as ViewIcon,
    Edit as EditIcon,
    Mail as MailIcon,
    Delete as DeleteIcon
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

    handleSearch = (e) => {
        document.querySelector('.col-2').scrollTo(0, 0);
        this.fetch();
    };

    fetch = _ => {
        this.setState({ isLoading: true });
        CompanyService.getCompanies(this.state.keyword)
            .then(companies => {
                this.setState({ companies, isLoading: false });
            })
            .catch(_ => toast(strings.GENERIC_ERROR, { type: 'error' }));
    }

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
            }).catch(_ => {
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
        this.setState({ user }, _ => {
            this.fetch();
        });
    }

    componentDidMount() {
    }

    render() {
        const { user, companies, isLoading, openDeleteDialog } = this.state;
        const isAdmin = Helper.isAdmin(user);

        return (
            <Master onLoad={this.onLoad} strict={true}>
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
                        <section className='list'>
                            {companies.map((company, index) => {
                                const canEdit = isAdmin || (user && user._id === company._id);

                                return (
                                    <article key={company._id}>
                                        <div className='company-item'>
                                            <div>
                                                <Avatar
                                                    user={company}
                                                    type={Env.USER_TYPE.COMPANY}
                                                    readonly
                                                    className='company-item-avatar'
                                                />
                                                <span className='company-item-title'>{company.fullName}</span>
                                            </div>
                                        </div>
                                        <div className='company-actions'>
                                            <Tooltip title={strings.VIEW_COMPANY_TOOLTIP}>
                                                <IconButton href={`/company?c=${company._id}`}>
                                                    <ViewIcon />
                                                </IconButton>
                                            </Tooltip>
                                            {canEdit && <Tooltip title={strings.UPDATE_COMPANY_TOOLTIP}>
                                                <IconButton href={`/update-company?c=${company._id}`}>
                                                    <EditIcon />
                                                </IconButton>
                                            </Tooltip>}
                                            {canEdit && <Tooltip title={strings.MESSAGE_COMPANY_TOOLTIP}>
                                                <IconButton>
                                                    <MailIcon />
                                                </IconButton>
                                            </Tooltip>}
                                            {canEdit && <Tooltip title={strings.DELETE_COMPANY_TOOLTIP}>
                                                <IconButton data-id={company._id} data-index={index} onClick={this.handleDelete}>
                                                    <DeleteIcon />
                                                </IconButton>
                                            </Tooltip>}
                                        </div>
                                    </article>
                                );
                            }
                            )}
                        </section>
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