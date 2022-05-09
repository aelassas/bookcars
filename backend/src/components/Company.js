import React, { Component } from 'react';
import Master from '../elements/Master';
import Env from '../config/env.config';
import { strings as commonStrings } from '../lang/common';
import { strings as companiesStrings } from '../lang/companies';
import CompanyService from '../services/CompanyService';
import Error from './Error';
import Backdrop from '../elements/SimpleBackdrop';
import NoMatch from './NoMatch';
import { Avatar } from '../elements/Avatar';
import { toast } from 'react-toastify';
import {
    List,
    Typography,
    IconButton,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
} from '@mui/material';
import {
    Edit as EditIcon,
    Mail as MailIcon,
    Delete as DeleteIcon
} from '@mui/icons-material';

import '../assets/css/company.css';

export default class Company extends Component {

    constructor(props) {
        super(props);
        this.state = {
            user: null,
            company: null,
            error: false,
            visible: false,
            isLoading: false,
            noMatch: false,
            openDeleteDialog: false
        };
    }

    onBeforeUpload = () => {
        this.setState({ isLoading: true });
    };

    onAvatarChange = _ => {
        this.setState({ isLoading: false });
    };

    handleDelete = _ => {
        this.setState({ openDeleteDialog: true });
    };

    handleConfirmDelete = _ => {
        const { company } = this.state;

        this.setState({ isLoading: true, openDeleteDialog: false }, _ => {
            CompanyService.delete(company._id).then(status => {
                console.log(status);
                if (status === 200) {
                    window.location.href = '/companies';
                } else {
                    toast(commonStrings.GENERIC_ERROR, { type: 'error' });
                    this.setState({ isLoading: false });
                }
            }).catch(_ => {
                toast(commonStrings.GENERIC_ERROR, { type: 'error' })
                this.setState({ isLoading: false });
            });
        });
    };

    handleCancelDelete = _ => {
        this.setState({ openDeleteDialog: false });
    };

    onLoad = (user) => {
        this.setState({ user, isLoading: true }, _ => {
            const params = new URLSearchParams(window.location.search);
            if (params.has('c')) {
                const id = params.get('c');
                if (id && id !== '') {
                    CompanyService.getCompany(id)
                        .then(company => {
                            if (company) {
                                this.setState({
                                    company,
                                    fullName: company.fullName,
                                    phone: company.phone,
                                    location: company.location,
                                    bio: company.bio,
                                    isLoading: false,
                                    visible: true
                                });
                            } else {
                                this.setState({ isLoading: false, noMatch: true });
                            }
                        })
                        .catch(_ => {
                            this.setState({ isLoading: false, error: true, visible: false });
                        });
                } else {
                    this.setState({ isLoading: false, noMatch: true });
                }
            } else {
                this.setState({ isLoading: false, noMatch: true });
            }
        });
    }

    componentDidMount() {
    }

    render() {
        const { visible, isLoading, error, noMatch, user, company, openDeleteDialog } = this.state;
        const edit = (user && company) && (user.type === Env.RECORD_TYPE.ADMIN || user._id === company._id);

        return (
            <Master onLoad={this.onLoad} strict={true} admin={true}>
                {visible &&
                    <div className='company'>
                        <div className='col-1'>
                            <Avatar
                                record={company}
                                type={Env.RECORD_TYPE.COMPANY}
                                mode='update'
                                size='large'
                                onBeforeUpload={this.onBeforeUpload}
                                onChange={this.onAvatarChange}
                                readonly={!edit}
                                color='disabled'
                                className='company-avatar' />
                            <Typography variant="h4" className="company-name">{company.fullName}</Typography>
                            {company.bio && company.bio !== '' && <Typography variant="h6" className="company-info">{company.bio}</Typography>}
                            {company.location && company.location !== '' && <Typography variant="h6" className="company-info">{company.location}</Typography>}
                            {company.phone && company.phone !== '' && <Typography variant="h6" className="company-info">{company.phone}</Typography>}
                            {edit && <div className="company-actions">
                                <IconButton href={`/update-company?c=${company._id}`}>
                                    <EditIcon />
                                </IconButton>
                                {user._id !== company._id && <IconButton>
                                    <MailIcon />
                                </IconButton>}
                                <IconButton data-id={company._id} onClick={this.handleDelete}>
                                    <DeleteIcon />
                                </IconButton>
                            </div>}
                        </div>
                        <div className='col-2'>
                            <List className='cars'>
                            </List>
                        </div>
                    </div>
                }
                <Dialog
                    disableEscapeKeyDown
                    maxWidth="xs"
                    open={openDeleteDialog}
                >
                    <DialogTitle>{commonStrings.CONFIRM_TITLE}</DialogTitle>
                    <DialogContent>{companiesStrings.DELETE_COMPANY}</DialogContent>
                    <DialogActions>
                        <Button onClick={this.handleCancelDelete} variant='contained' className='btn-secondary'>{commonStrings.CANCEL}</Button>
                        <Button onClick={this.handleConfirmDelete} variant='contained' color='error'>{commonStrings.DELETE}</Button>
                    </DialogActions>
                </Dialog>
                {isLoading && <Backdrop text={commonStrings.PLEASE_WAIT} />}
                {error && <Error />}
                {noMatch && <NoMatch />}
            </Master>
        );
    }
}