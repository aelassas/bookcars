import React, { Component } from 'react';
import Master from '../elements/Master';
import Env from '../config/env.config';
import { strings as commonStrings } from '../lang/common';
import { strings } from '../lang/companies';
import Helper from '../common/Helper';
import CompanyService from '../services/CompanyService';
import Backdrop from '../elements/SimpleBackdrop';
import Search from '../elements/Search';
import { toast } from 'react-toastify';
import {
    IconButton,
    Button,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
} from '@mui/material';
import {
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

    handleSearch = (keyword) => {
        this.setState({ keyword }, () => {
            document.querySelector('.col-2').scrollTo(0, 0);
            this.fetch();
        });
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
        const admin = Helper.admin(user);

        return (
            <Master onLoad={this.onLoad} strict={true}>
                <div className='companies'>
                    <div className='col-1'>
                        <Search onSubmit={this.handleSearch} />

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
                                const edit = admin || (user && user._id === company._id);
                                const canMessage = admin || (user && user.type === Env.RECORD_TYPE.COMPANY && user._id !== company._id);
                                const canDelete = admin;

                                return (
                                    <article key={company._id}>
                                        <div className='company-item'>
                                            <div>
                                                <img src={Helper.joinURL(Env.CDN_USERS, company.avatar)}
                                                    alt={company.fullName}
                                                    className='company-item-avatar'
                                                    style={{
                                                        width: Env.COMPANY_IMAGE_WIDTH,
                                                    }} />
                                                <span className='company-item-title'>{company.fullName}</span>
                                            </div>
                                        </div>
                                        <div className='company-actions'>
                                            <Tooltip title={strings.VIEW_COMPANY}>
                                                <IconButton href={`/company?c=${company._id}`}>
                                                    <ViewIcon />
                                                </IconButton>
                                            </Tooltip>
                                            {edit &&
                                                <Tooltip title={commonStrings.UPDATE}>
                                                    <IconButton href={`/update-company?c=${company._id}`}>
                                                        <EditIcon />
                                                    </IconButton>
                                                </Tooltip>
                                            }
                                            {canMessage &&
                                                <Tooltip title={commonStrings.SEND_MESSAGE}>
                                                    <IconButton>
                                                        <MailIcon />
                                                    </IconButton>
                                                </Tooltip>
                                            }
                                            {canDelete &&
                                                <Tooltip title={commonStrings.DELETE}>
                                                    <IconButton data-id={company._id} data-index={index} onClick={this.handleDelete}>
                                                        <DeleteIcon />
                                                    </IconButton>
                                                </Tooltip>
                                            }
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