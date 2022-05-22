import React, { Component } from 'react';
import Env from '../config/env.config';
import { strings as commonStrings } from '../lang/common';
import { strings as ulStrings } from '../lang/user-list';
import UserService from '../services/UserService';
import Helper from '../common/Helper';
import Master from '../elements/Master';
import Backdrop from '../elements/SimpleBackdrop';
import { Avatar } from '../elements/Avatar';
import BookingList from '../elements/BookingList';
import Error from './Error';
import NoMatch from './NoMatch';
import { toast } from 'react-toastify';
import {
    Typography,
    IconButton,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Tooltip
} from '@mui/material';
import {
    Edit as EditIcon,
    Mail as MailIcon,
    Delete as DeleteIcon
} from '@mui/icons-material';

import '../assets/css/user.css';
import CompanyService from '../services/CompanyService';

export default class User extends Component {

    constructor(props) {
        super(props);
        this.state = {
            loggedUser: null,
            user: null,
            error: false,
            visible: false,
            loading: true,
            noMatch: false,
            openDeleteDialog: false,
            companies: [],
            statuses: Helper.getBookingStatuses().map(status => status.value),
        };
    }

    onBeforeUpload = () => {
        this.setState({ loading: true });
    };

    onAvatarChange = () => {
        this.setState({ loading: false });
    };

    handleDelete = () => {
        this.setState({ openDeleteDialog: true });
    };

    handleConfirmDelete = () => {
        const { user } = this.state;

        this.setState({ loading: true, openDeleteDialog: false }, () => {
            UserService.delete([user._id]).then(status => {
                if (status === 200) {
                    window.location.href = '/users';
                } else {
                    toast(commonStrings.GENERIC_ERROR, { type: 'error' });
                    this.setState({ loading: false });
                }
            }).catch(() => {
                toast(commonStrings.GENERIC_ERROR, { type: 'error' });
                this.setState({ loading: false });
            });
        });
    };

    handleCancelDelete = () => {
        this.setState({ openDeleteDialog: false });
    };

    onLoad = (loggedUser) => {
        this.setState({ loading: true }, () => {
            const params = new URLSearchParams(window.location.search);
            if (params.has('u')) {
                const id = params.get('u');
                if (id && id !== '') {
                    UserService.getUser(id)
                        .then(user => {
                            if (user) {

                                const setState = (companies) => {
                                    this.setState({
                                        companies,
                                        loggedUser,
                                        user,
                                        type: user.type,
                                        email: user.email,
                                        avatar: user.avatar,
                                        fullName: user.fullName,
                                        phone: user.phone,
                                        location: user.location,
                                        bio: user.bio,
                                        loading: false,
                                        visible: true,
                                    });
                                };

                                const admin = Helper.admin(loggedUser);
                                if (admin) {
                                    CompanyService.getAllCompanies()
                                        .then(companies => {
                                            const companyIds = Helper.flattenCompanies(companies);
                                            setState(companyIds);
                                        })
                                        .catch(() => toast(commonStrings.GENERIC_ERROR, { type: 'error' }));
                                } else if (!admin && (loggedUser._id === user._id || loggedUser._id === user.company)) {
                                    setState([loggedUser._id]);
                                } else {
                                    this.setState({ loading: false, noMatch: true });
                                }
                            } else {
                                this.setState({ loading: false, noMatch: true });
                            }
                        })
                        .catch(() => {
                            this.setState({ loading: false, visible: false }, () => toast(commonStrings.GENERIC_ERROR, { type: 'error' }));
                        });
                } else {
                    this.setState({ loading: false, noMatch: true });
                }
            } else {
                this.setState({ loading: false, noMatch: true });
            }
        });
    }

    componentDidMount() {
    }

    render() {
        const { visible, loading, error, noMatch, loggedUser, user, openDeleteDialog, companies, statuses } = this.state;
        const edit = (loggedUser && user) &&
            (loggedUser.type === Env.RECORD_TYPE.ADMIN
                || loggedUser._id === user._id
                || (loggedUser.type === Env.RECORD_TYPE.COMPANY && loggedUser._id === user.company));
        const company = user && user.type === Env.RECORD_TYPE.COMPANY;

        return (
            <Master onLoad={this.onLoad} strict={true}>
                {loggedUser && user && visible &&
                    <div className='user'>
                        <div className='col-1'>
                            <section className='user-avatar-sec'>
                                <Avatar
                                    record={user}
                                    type={user.type}
                                    mode='update'
                                    size='large'
                                    hideDelete
                                    onBeforeUpload={this.onBeforeUpload}
                                    onChange={this.onAvatarChange}
                                    color='disabled'
                                    className={company ? 'company-avatar' : 'user-avatar'}
                                    readonly
                                    verified
                                />
                            </section>
                            <Typography variant="h4" className="user-name">{user.fullName}</Typography>
                            {user.bio && <Typography variant="h6" className="user-info">{user.bio}</Typography>}
                            {user.location && <Typography variant="h6" className="user-info">{user.location}</Typography>}
                            {user.phone && <Typography variant="h6" className="user-info">{user.phone}</Typography>}
                            <div className="user-actions">
                                {edit &&
                                    <Tooltip title={commonStrings.UPDATE}>
                                        <IconButton href={`/update-user?u=${user._id}`}>
                                            <EditIcon />
                                        </IconButton>
                                    </Tooltip>
                                }
                                {user._id !== loggedUser._id &&
                                    <Tooltip title={commonStrings.SEND_MESSAGE}>
                                        <IconButton>
                                            <MailIcon />
                                        </IconButton>
                                    </Tooltip>
                                }
                                {edit &&
                                    <Tooltip title={commonStrings.DELETE}>
                                        <IconButton data-id={user._id} onClick={this.handleDelete}>
                                            <DeleteIcon />
                                        </IconButton>
                                    </Tooltip>
                                }
                            </div>
                        </div>
                        <div className='col-2'>
                            <BookingList
                                width='100%'
                                height='100%'
                                loggedUser={loggedUser}
                                user={company ? undefined : user}
                                companies={company ? [user._id] : companies}
                                statuses={statuses}
                                hideDates={Env.isMobile()}
                                checkboxSelection={!Env.isMobile()}
                                hideCompanyColumn={company}
                            />
                        </div>
                    </div>
                }
                <Dialog
                    disableEscapeKeyDown
                    maxWidth="xs"
                    open={openDeleteDialog}
                >
                    <DialogTitle className='dialog-header'>{commonStrings.CONFIRM_TITLE}</DialogTitle>
                    <DialogContent>{ulStrings.DELETE_USER}</DialogContent>
                    <DialogActions className='dialog-actions'>
                        <Button onClick={this.handleCancelDelete} variant='contained' className='btn-secondary'>{commonStrings.CANCEL}</Button>
                        <Button onClick={this.handleConfirmDelete} variant='contained' color='error'>{commonStrings.DELETE}</Button>
                    </DialogActions>
                </Dialog>
                {loading && <Backdrop text={commonStrings.LOADING} />}
                {error && <Error />}
                {noMatch && <NoMatch />}
            </Master>
        );
    }
}