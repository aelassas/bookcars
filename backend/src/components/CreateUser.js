import React, { Component } from 'react';
import Master from '../elements/Master';
import Env from '../config/env.config';
import { strings as commonStrings } from '../lang/common';
import { strings as ccStrings } from '../lang/create-company';
import { strings } from '../lang/create-user';
import Helper from '../common/Helper';
import UserService from '../services/UserService';
import Error from '../elements/Error';
import Backdrop from '../elements/SimpleBackdrop';
import { Avatar } from '../elements/Avatar';
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

import '../assets/css/create-user.css';
import CompanyService from '../services/CompanyService';

export default class CreateUser extends Component {

    constructor(props) {
        super(props);
        this.state = {
            user: null,
            fullName: '',
            email: '',
            phone: '',
            location: '',
            bio: '',
            password: '',
            confirmPassword: '',
            error: false,
            passwordError: false,
            passwordsDontMatch: false,
            emailError: false,
            visible: false,
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

        if (this.state.password.length < 6) {
            return this.setState({
                passwordError: true,
                passwordsDontMatch: false,
                error: false,
                avatarError: false
            });
        }

        if (this.state.password !== this.state.confirmPassword) {
            return this.setState({
                passwordsDontMatch: true,
                passwordError: false,
                error: false,
                avatarError: false
            });
        }

        if (!this.state.avatar && this.state.type === Env.RECORD_TYPE.COMPANY) {
            return this.setState({
                avatarError: true,
                passwordsDontMatch: false,
                passwordError: false,
                error: false
            });
        }

        this.setState({ loading: true });

        const data = {
            email: this.state.email,
            phone: this.state.phone,
            location: this.state.location,
            bio: this.state.bio,
            password: this.state.password,
            fullName: this.state.fullName,
            language: UserService.getLanguage(),
            type: this.state.type,
            avatar: this.state.avatar
        };

        UserService.signup(data)
            .then(status => {
                if (status === 200) {
                    if (this.state.type === Env.RECORD_TYPE.COMPANY) window.location = '/companies';
                    else window.location = '/users';
                } else
                    this.setState({
                        error: true,
                        passwordError: false,
                        passwordsDontMatch: false,
                        loading: false
                    });
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

    onLoad = (user) => {
        this.setState({ user: user, visible: true });
    }

    componentDidMount() {
    }

    render() {
        const {
            user,
            type,
            error,
            passwordError,
            passwordsDontMatch,
            emailError,
            fullNameError,
            avatarError,
            visible,
            loading,
            fixFullNameError,
            fixEmailError } = this.state, company = type === Env.RECORD_TYPE.COMPANY;

        return (
            <Master onLoad={this.onLoad} strict={true} admin={true}>
                {user && <div className='create-user'>
                    <Paper className="user-form user-form-wrapper" elevation={10} style={visible ? null : { display: 'none' }}>
                        <h1 className="user-form-title"> {strings.CREATE_COMPANY_HEADING} </h1>
                        <form onSubmit={this.handleSubmit}>
                            <Avatar
                                type={type}
                                mode='create'
                                record={null}
                                size='large'
                                readonly={false}
                                onBeforeUpload={this.onBeforeUpload}
                                onChange={this.onAvatarChange}
                                color='disabled'
                                className='avatar-ctn'
                            />

                            {company && <div className='info'>
                                <InfoIcon />
                                <label>
                                    {ccStrings.RECOMMENDED_IMAGE_SIZE}
                                </label>
                            </div>}

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
                                />
                                <FormHelperText error={emailError}>
                                    {emailError ? commonStrings.INVALID_EMAIL : ''}
                                </FormHelperText>
                            </FormControl>

                            <FormControl fullWidth margin="dense">
                                <InputLabel className='required'>{commonStrings.PASSWORD}</InputLabel>
                                <Input
                                    id="password"
                                    onChange={this.handleOnChangePassword}
                                    required
                                    type="password"
                                    inputProps={{
                                        autoComplete: 'new-password',
                                        form: {
                                            autoComplete: 'off',
                                        },
                                    }}
                                />
                            </FormControl>

                            <FormControl fullWidth margin="dense">
                                <InputLabel className='required'>{commonStrings.CONFIRM_PASSWORD}</InputLabel>
                                <Input
                                    id="confirm-password"
                                    onChange={this.handleOnChangeConfirmPassword}
                                    required
                                    type="password"
                                    inputProps={{
                                        autoComplete: 'new-password',
                                        form: {
                                            autoComplete: 'off',
                                        },
                                    }}
                                />
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
                                />
                            </FormControl>

                            <FormControl fullWidth margin="dense">
                                <InputLabel>{commonStrings.LOCATION}</InputLabel>
                                <Input
                                    id="location"
                                    type="text"
                                    onChange={this.handleOnChangeLocation}
                                    autoComplete="off"
                                />
                            </FormControl>

                            <FormControl fullWidth margin="dense">
                                <InputLabel>{commonStrings.BIO}</InputLabel>
                                <Input
                                    id="bio"
                                    type="text"
                                    onChange={this.handleOnChangeBio}
                                    autoComplete="off"
                                />
                            </FormControl>

                            <div className="buttons">
                                <Button
                                    type="submit"
                                    variant="contained"
                                    className='btn-primary btn-margin-bottom'
                                    size="small"
                                    disabled={emailError || fullNameError}
                                >
                                    {commonStrings.CREATE}
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
                                {passwordError && <Error message={commonStrings.ERROR_IN_PASSWORD} />}
                                {passwordsDontMatch && <Error message={commonStrings.PASSWORDS_DONT_MATCH} />}
                                {error && <Error message={commonStrings.GENERIC_ERROR} />}
                                {avatarError && <Error message={commonStrings.IMAGE_REQUIRED} />}
                                {(fixFullNameError || fixEmailError) && <Error message={commonStrings.FIX_ERRORS} />}
                            </div>
                        </form>

                    </Paper>
                </div>}
                {loading && <Backdrop text={commonStrings.PLEASE_WAIT} />}
            </Master>
        );
    }
}