import React, { Component } from 'react';
import Master from '../elements/Master';
import Env from '../config/env.config';
import { strings as commonStrings } from '../lang/common';
import { strings as ccStrings } from '../lang/create-company';
import { strings } from '../lang/create-user';
import Helper from '../common/Helper';
import UserService from '../services/UserService';
import CompanyService from '../services/CompanyService';
import NoMatch from './NoMatch';
import Error from '../elements/Error';
import Backdrop from '../elements/SimpleBackdrop';
import { Avatar } from '../elements/Avatar';
import { toast } from 'react-toastify';
import {
    Input,
    InputLabel,
    FormControl,
    FormHelperText,
    Button,
    Paper,
    Select,
    MenuItem
} from '@mui/material';
import { Info as InfoIcon } from '@mui/icons-material';

import '../assets/css/update-user.css';

export default class CreateUser extends Component {

    constructor(props) {
        super(props);
        this.state = {
            loggedUser: null,
            user: null,
            visible: false,
            noMatch: false,
            admin: false,
            fullName: '',
            email: '',
            phone: '',
            location: '',
            bio: '',
            password: '',
            confirmPassword: '',
            error: false,
            emailError: false,
            loading: false,
            fullNameError: false,
            avatar: null,
            avatarError: false,
            type: '',
            fixFullNameError: false,
            fixEmailError: false
        };
    }

    handleUserTypeChange = (e) => {
        this.setState({
            type: e.target.value,
            fullNameError: false
        });
    };

    handleOnChangeFullName = (e) => {
        this.setState({
            fullName: e.target.value,
        });
    };

    handleFullNameOnBlur = (e) => {
        if (this.state.type === Env.RECORD_TYPE.COMPANY) {
            const data = {
                fullName: e.target.value,
            };

            CompanyService.validate(data).then(status => {
                if (status === 204) {
                    this.setState({
                        fullNameError: true,
                        fixFullNameError: true,
                        avatarError: false,
                        passwordsDontMatch: false,
                        passwordError: false,
                        error: false
                    });
                } else {
                    this.setState({ fullNameError: false, fixFullNameError: false });
                }
            }).catch(() => {
                this.setState({ fullNameError: false, fixFullNameError: false });
            });
        } else {
            this.setState({ fullNameError: false, fixFullNameError: false });
        }
    };

    handleOnChangeEmail = (e) => {
        this.setState({
            email: e.target.value,
        });
    };

    handleEmailOnBlur = (e) => {
        const data = {
            email: e.target.value,
        };

        UserService.validateEmail(data).then(status => {
            if (status === 204) {
                this.setState({
                    emailError: true,
                    fixEmailError: true,
                    avatarError: false,
                    passwordsDontMatch: false,
                    passwordError: false,
                    error: false
                });
            } else {
                this.setState({ emailError: false, fixEmailError: false });
            }
        }).catch(() => {
            this.setState({ emailError: false, fixEmailError: false });
        });
    };

    handleOnChangePhone = (e) => {
        this.setState({
            phone: e.target.value,
        });
    };

    handleOnChangeLocation = (e) => {
        this.setState({
            location: e.target.value,
        });
    };

    handleOnChangeBio = (e) => {
        this.setState({
            bio: e.target.value,
        });
    };

    handleOnChangePassword = (e) => {
        this.setState({
            password: e.target.value,
        });
    };

    handleOnChangeConfirmPassword = (e) => {
        this.setState({
            confirmPassword: e.target.value,
        });
    };

    handleMouseDownPassword = (event) => {
        event.preventDefault();
    };

    handleMouseDownConfirmPassword = (event) => {
        event.preventDefault();
    };

    preventDefault = (event) => event.preventDefault();

    handleSubmit = (e) => {
        e.preventDefault();
        console.log('!')

        if (!this.state.avatar && this.state.type === Env.RECORD_TYPE.COMPANY) {
            return this.setState({
                avatarError: true,
                passwordsDontMatch: false,
                passwordError: false,
                error: false
            });
        }

        const { user, phone, location, bio, fullName, type, avatar } = this.state, language = UserService.getLanguage();
        const data = {
            // email: this.state.email,
            _id: user._id,
            phone,
            location,
            bio,
            fullName,
            language,
            type,
            avatar
        };

        UserService.updateUser(data)
            .then(status => {
                if (status === 200) {
                    toast(commonStrings.UPDATED, { type: 'info' });
                } else {
                    toast(commonStrings.GENERIC_ERROR, { type: 'error' });

                    this.setState({
                        error: false,
                        passwordError: false,
                        passwordsDontMatch: false,
                        loading: false
                    });
                }
            }).catch(() => {
                this.setState({
                    error: true,
                    passwordError: false,
                    passwordsDontMatch: false,
                    loading: false
                });
            });

    };

    handleChange = (e) => {
        e.preventDefault();
    };

    onBeforeUpload = () => {
        this.setState({ loading: true });
    };

    onAvatarChange = (avatar) => {
        this.setState({ loading: false, avatar });
        if (avatar !== null) {
            this.setState({ avatarError: false });
        }
    };

    handleCancel = () => {
        const { avatar } = this.state;

        if (avatar) {
            this.setState({ loading: true });

            UserService.deleteTempAvatar(avatar)
                .then(() => {
                    window.location.href = '/users';
                })
                .catch(() => {
                    window.location.href = '/users';
                });
        } else {
            window.location.href = '/users';
        }
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
                                this.setState({
                                    loggedUser,
                                    user,
                                    admin: Helper.admin(loggedUser),
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
        const {
            loggedUser,
            user,
            visible,
            noMatch,
            admin,
            type,
            error,
            emailError,
            fullNameError,
            avatarError,
            loading,
            fixFullNameError,
            fixEmailError,

            fullName,
            email,
            phone,
            location,
            bio,

        } = this.state,
            company = type === Env.RECORD_TYPE.COMPANY;

        return (
            <Master onLoad={this.onLoad} strict={true}>
                {loggedUser && user && visible &&
                    <div className='update-user'>
                        <Paper className="user-form user-form-wrapper" elevation={10}>
                            <h1 className="user-form-title"> {strings.CREATE_COMPANY_HEADING} </h1>
                            <form onSubmit={this.handleSubmit}>
                                <Avatar
                                    type={type}
                                    mode='update'
                                    record={user}
                                    size='large'
                                    readonly={false}
                                    onBeforeUpload={this.onBeforeUpload}
                                    onChange={this.onAvatarChange}
                                    color='disabled'
                                    className='avatar-ctn'
                                    hideDelete={type === Env.RECORD_TYPE.COMPANY}
                                />

                                {company && <div className='info'>
                                    <InfoIcon />
                                    <label>
                                        {ccStrings.RECOMMENDED_IMAGE_SIZE}
                                    </label>
                                </div>}

                                {admin &&
                                    <FormControl fullWidth margin="dense" style={{ marginTop: company ? 0 : 39 }}>
                                        <InputLabel className='required'>{commonStrings.TYPE}</InputLabel>
                                        <Select
                                            label={commonStrings.TYPE}
                                            value={type}
                                            onChange={this.handleUserTypeChange}
                                            variant='standard'
                                            required
                                            fullWidth
                                        >
                                            <MenuItem value={Env.RECORD_TYPE.ADMIN}>{Helper.getUserType(Env.RECORD_TYPE.ADMIN)}</MenuItem>
                                            <MenuItem value={Env.RECORD_TYPE.COMPANY}>{Helper.getUserType(Env.RECORD_TYPE.COMPANY)}</MenuItem>
                                            <MenuItem value={Env.RECORD_TYPE.USER}>{Helper.getUserType(Env.RECORD_TYPE.USER)}</MenuItem>
                                        </Select>
                                    </FormControl>
                                }

                                <FormControl fullWidth margin="dense">
                                    <InputLabel className='required'>{commonStrings.FULL_NAME}</InputLabel>
                                    <Input
                                        id="full-name"
                                        type="text"
                                        error={fullNameError}
                                        required
                                        onBlur={this.handleFullNameOnBlur}
                                        onChange={this.handleOnChangeFullName}
                                        autoComplete="off"
                                        value={fullName}
                                    />
                                    <FormHelperText error={fullNameError}>
                                        {fullNameError ? ccStrings.INVALID_COMPANY_NAME : ''}
                                    </FormHelperText>
                                </FormControl>

                                <FormControl fullWidth margin="dense">
                                    <InputLabel className='required'>{commonStrings.EMAIL}</InputLabel>
                                    <Input
                                        id="email"
                                        type="text"
                                        error={emailError}
                                        onBlur={this.handleEmailOnBlur}
                                        onChange={this.handleOnChangeEmail}
                                        required
                                        inputProps={{
                                            autoComplete: 'new-email',
                                            form: {
                                                autoComplete: 'off',
                                            },
                                        }}
                                        value={email}
                                        disabled
                                    />
                                    <FormHelperText error={emailError}>
                                        {emailError ? commonStrings.INVALID_EMAIL : ''}
                                    </FormHelperText>
                                </FormControl>

                                <div className='info'>
                                    <InfoIcon />
                                    <label>{commonStrings.OPTIONAL}</label>
                                </div>

                                <FormControl fullWidth margin="dense">
                                    <InputLabel>{commonStrings.PHONE}</InputLabel>
                                    <Input
                                        id="phone"
                                        type="text"
                                        onChange={this.handleOnChangePhone}
                                        inputProps={{
                                            autoComplete: 'new-phone',
                                            form: {
                                                autoComplete: 'off',
                                            },
                                        }}
                                        value={phone}
                                    />
                                </FormControl>

                                <FormControl fullWidth margin="dense">
                                    <InputLabel>{commonStrings.LOCATION}</InputLabel>
                                    <Input
                                        id="location"
                                        type="text"
                                        onChange={this.handleOnChangeLocation}
                                        autoComplete="off"
                                        value={location}
                                    />
                                </FormControl>

                                <FormControl fullWidth margin="dense">
                                    <InputLabel>{commonStrings.BIO}</InputLabel>
                                    <Input
                                        id="bio"
                                        type="text"
                                        onChange={this.handleOnChangeBio}
                                        autoComplete="off"
                                        value={bio}
                                    />
                                </FormControl>

                                <div className="buttons">
                                    <Button
                                        type="submit"
                                        variant="contained"
                                        className='btn-primary btn-margin btn-margin-bottom'
                                        size="small"
                                        href={`/reset-password?u=${user._id}`}
                                    >
                                        {commonStrings.RESET_PASSWORD}
                                    </Button>

                                    <Button
                                        type="submit"
                                        variant="contained"
                                        className='btn-primary btn-margin-bottom'
                                        size="small"
                                        disabled={emailError || fullNameError}
                                    >
                                        {commonStrings.UPDATE}
                                    </Button>

                                    <Button
                                        variant="contained"
                                        className='btn-secondary btn-margin-bottom'
                                        size="small"
                                        onClick={this.handleCancel}
                                    >
                                        {commonStrings.CANCEL}
                                    </Button>
                                </div>

                                <div className="form-error">
                                    {error && <Error message={commonStrings.GENERIC_ERROR} />}
                                    {avatarError && <Error message={commonStrings.IMAGE_REQUIRED} />}
                                    {(fixFullNameError || fixEmailError) && <Error message={commonStrings.FIX_ERRORS} />}
                                </div>
                            </form>

                        </Paper>
                    </div>}
                {loading && <Backdrop text={commonStrings.PLEASE_WAIT} />}
                {noMatch && <NoMatch />}
            </Master>
        );
    }
}