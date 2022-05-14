import React, { Component } from 'react';
import Master from '../elements/Master';
import Env from '../config/env.config';
import { strings as commonStrings } from '../lang/common';
import { strings } from '../lang/companies';
import Helper from '../common/Helper';
import CompanyService from '../services/CompanyService';
import Backdrop from '../elements/SimpleBackdrop';
import { toast } from 'react-toastify';
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
            loading: false,
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

    fetch = () => {
        this.setState({ loading: true });
        CompanyService.getCompanies(this.state.keyword)
            .then(companies => {
                this.setState({ companies, loading: false });
            })
            .catch(() => toast(commonStrings.GENERIC_ERROR, { type: 'error' }));
    }

    handleDelete = (e) => {
        const companyId = e.currentTarget.getAttribute('data-id');
        const companyIndex = e.currentTarget.getAttribute('data-index');
        this.setState({ openDeleteDialog: true, companyId, companyIndex });
    };

    handleConfirmDelete = () => {
        const { companyId, companyIndex, companies } = this.state;

        if (companyId !== '' && companyIndex > -1) {
            this.setState({ loading: true, openDeleteDialog: false });
            CompanyService.delete(companyId).then(status => {
                if (status === 200) {
                    const _companies = [...companies];
                    _companies.splice(companyIndex, 1);
                    this.setState({ companies: _companies, loading: false, companyId: '', companyIndex: -1 });
                } else {
                    toast(commonStrings.GENERIC_ERROR, { type: 'error' });
                    this.setState({ loading: false, companyId: '', companyIndex: -1 });
                }
            }).catch(() => {
                toast(commonStrings.GENERIC_ERROR, { type: 'error' })
                this.setState({ loading: false, companyId: '', companyIndex: -1 });
            });
        } else {
            toast(commonStrings.GENERIC_ERROR, { type: 'error' });
            this.setState({ openDeleteDialog: false, companyId: '', companyIndex: -1 });
        }
    };

    handleCancelDelete = () => {
        this.setState({ openDeleteDialog: false, companyId: '' });
    };

    onLoad = (user) => {
        this.setState({ user }, () => {
            this.fetch();
        });
    }

    componentDidMount() {
    }

    render() {
        const { user, companies, loading, openDeleteDialog } = this.state;
        const isAdmin = Helper.isAdmin(user);

        return (
            <Master onLoad={this.onLoad} strict={true}>
                <div className='companies'>
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
                                const canMessage = isAdmin || (user && user.type === Env.RECORD_TYPE.COMPANY && user._id !== company._id);
                                const canDelete = isAdmin;

                                return (
                                    <article key={company._id}>
                                        <div className='company-item'>
                                            <div>
                                                {/* <Avatar
                                                    record={company}
                                                    type={Env.RECORD_TYPE.COMPANY}
                                                    readonly
                                                    className='company-item-avatar'
                                                /> */}
                                                <img src={Helper.joinURL(Env.CDN_USERS, company.avatar)}
                                                    alt={company.fullName}
                                                    className='company-item-avatar'
                                                    style={{
                                                        width: Env.COMPANY_IMAGE_WIDTH,
                                                        // height: Env.COMPANY_IMAGE_HEIGHT
                                                    }} />
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
                                            {canMessage && <Tooltip title={strings.MESSAGE_COMPANY_TOOLTIP}>
                                                <IconButton>
                                                    <MailIcon />
                                                </IconButton>
                                            </Tooltip>}
                                            {canDelete && <Tooltip title={strings.DELETE_COMPANY_TOOLTIP}>
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
                    <DialogTitle className='dialog-header'>{commonStrings.CONFIRM_TITLE}</DialogTitle>
                    <DialogContent>{strings.DELETE_COMPANY}</DialogContent>
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