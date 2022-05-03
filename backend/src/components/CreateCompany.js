import React, { Component } from 'react';
import Master from '../elements/Master';
import Env from '../config/env.config';
import { strings } from '../config/app.config';
import UserService from '../services/UserService';
import CompanyService from '../services/CompanyService';
import Error from '../elements/Error';
import Backdrop from '../elements/SimpleBackdrop';
import { Avatar } from '../elements/Avatar';
import {
    Input,
    InputLabel,
    FormControl,
    FormHelperText,
    Button,
    Paper
} from '@mui/material';

import '../assets/css/create-company.css';

export default class CreateCompany extends Component {

    constructor(props) {
        super(props);
        this.state = {
            user: null,
            language: Env.DEFAULT_LANGUAGE,
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
            isLoading: false,
            fullNameError: false,
            avatar: null
        };
    }

    handleOnChangeFullName = e => {
        this.setState({
            fullName: e.target.value,
        });
    };

    handleOnChangeEmail = e => {
        this.setState({
            email: e.target.value,
        });
    };

    handleOnChangePhone = e => {
        this.setState({
            phone: e.target.value,
        });
    };

    handleOnChangeLocation = e => {
        this.setState({
            location: e.target.value,
        });
    };

    handleOnChangeBio = e => {
        this.setState({
            bio: e.target.value,
        });
    };

    handleOnChangePassword = e => {
        this.setState({
            password: e.target.value,
        });
    };

    handleOnChangeConfirmPassword = e => {
        this.setState({
            confirmPassword: e.target.value,
        });
    };

    handleEmailOnBlur = e => {
        const data = {
            email: e.target.value,
        };

        UserService.validateEmail(data).then(status => {
            if (status === 204) {
                this.setState({ emailError: true });
            } else {
                this.setState({ emailError: false });
            }
        }).catch(_ => {
            this.setState({ emailError: false });
        });
    };

    handleFullNameOnBlur = e => {
        const data = {
            fullName: e.target.value,
        };

        CompanyService.validate(data).then(status => {
            if (status === 204) {
                this.setState({ fullNameError: true });
            } else {
                this.setState({ fullNameError: false });
            }
        }).catch(_ => {
            this.setState({ fullNameError: false });
        });
    };

    handleMouseDownPassword = (event) => {
        event.preventDefault();
    };

    handleMouseDownConfirmPassword = (event) => {
        event.preventDefault();
    };

    preventDefault = (event) => event.preventDefault();

    handleSubmit = e => {
        e.preventDefault();

        const emailData = {
            email: this.state.email,
        };

        UserService.validateEmail(emailData).then(emailStatus => {
            if (emailStatus === 204) {
                this.setState({ emailError: true });
            } else {
                this.setState({ emailError: false });

                if (this.state.password.length < 6) {
                    this.setState({
                        passwordError: true,
                        passwordsDontMatch: false,
                        error: false,
                        register: false
                    });
                    return;
                }

                if (this.state.password !== this.state.confirmPassword) {
                    this.setState({
                        passwordsDontMatch: true,
                        passwordError: false,
                        error: false,
                        register: false
                    });
                    return;
                }

                this.setState({ isLoading: true });

                const data = {
                    email: this.state.email,
                    phone: this.state.phone,
                    location: this.state.location,
                    bio: this.state.bio,
                    password: this.state.password,
                    fullName: this.state.fullName,
                    language: UserService.getLanguage(),
                    type: Env.USER_TYPE.COMPANY,
                    avatar: this.state.avatar
                };

                UserService.signup(data).then(registerStatus => {
                    if (registerStatus === 200) {
                        window.location = '/companies' + window.location.search;
                    } else
                        this.setState({
                            error: true,
                            passwordError: false,
                            passwordsDontMatch: false,
                            register: false,
                            isLoading: false
                        });
                }).catch(_ => {
                    this.setState({
                        error: true,
                        passwordError: false,
                        passwordsDontMatch: false,
                        register: false,
                        isLoading: false
                    });
                });
            }

        }).catch(_ => {
            this.setState({ emailError: true });
        })
    };

    handleChange = (e) => {
        e.preventDefault();
    };

    onBeforeUpload = () => {
        this.setState({ isLoading: true });
    };

    onAvatarChange = (avatar) => {
        this.setState({ isLoading: false, avatar });
    };

    handleCancel = _ => {
        const { avatar } = this.state;

        if (avatar) {
            this.setState({ isLoading: true });

            UserService.deleteTempAvatar(avatar)
                .then(_ => {
                    window.location.href = '/companies';
                })
                .catch(_ => {
                    window.location.href = '/companies';
                });
        } else {
            window.location.href = '/companies';
        }
    };

    onLoad = (user) => {
        this.setState({ user, language: user.language, visible: true });
    }

    componentDidMount() {
    }

    render() {
        const {
            error,
            passwordError,
            passwordsDontMatch,
            emailError,
            fullNameError,
            visible,
            isLoading } = this.state;

        return (
            <Master onLoad={this.onLoad} strict={true} admin={true}>
                <div className='create-company'>
                    <Paper className="company-form company-form-wrapper" elevation={10} style={visible ? null : { display: 'none' }}>
                        <h1 className="company-form-title"> {strings.CREATE_COMPANY_HEADING} </h1>
                        <form onSubmit={this.handleSubmit}>
                            <Avatar
                                type={Env.USER_TYPE.COMPANY}
                                mode='create'
                                user={null}
                                size='large'
                                readonly={false}
                                onBeforeUpload={this.onBeforeUpload}
                                onChange={this.onAvatarChange}
                                color='disabled'
                                className='avatar-ctn' />
                            <FormControl fullWidth margin="dense">
                                <InputLabel className='required'>{strings.FULL_NAME}</InputLabel>
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
                                    {fullNameError ? strings.INVALID_FULL_NAME : ''}
                                </FormHelperText>
                            </FormControl>
                            <FormControl fullWidth margin="dense">
                                <InputLabel className='required'>{strings.EMAIL}</InputLabel>
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
                                    {emailError ? strings.INVALID_EMAIL : ''}
                                </FormHelperText>
                            </FormControl>
                            <FormControl fullWidth margin="dense">
                                <InputLabel>{strings.PHONE}</InputLabel>
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
                                <InputLabel>{strings.LOCATION}</InputLabel>
                                <Input
                                    id="location"
                                    type="text"
                                    onChange={this.handleOnChangeLocation}
                                    autoComplete="off"
                                />
                            </FormControl>
                            <FormControl fullWidth margin="dense">
                                <InputLabel>{strings.BIO}</InputLabel>
                                <Input
                                    id="bio"
                                    type="text"
                                    onChange={this.handleOnChangeBio}
                                    autoComplete="off"
                                />
                            </FormControl>
                            <FormControl fullWidth margin="dense">
                                <InputLabel className='required'>{strings.PASSWORD}</InputLabel>
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
                                <InputLabel className='required'>{strings.CONFIRM_PASSWORD}</InputLabel>
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
                            <div className="buttons">
                                <Button
                                    type="submit"
                                    variant="contained"
                                    className='btn-primary'
                                    size="small"
                                    disabled={emailError}
                                >
                                    {strings.CREATE}
                                </Button>
                                <Button
                                    variant="contained"
                                    className='btn-secondary'
                                    size="small"
                                    onClick={this.handleCancel}
                                >
                                    {strings.CANCEL}
                                </Button>
                            </div>

                            <div className="form-error">
                                {(passwordError || passwordsDontMatch || error) ?
                                    <div>
                                        {passwordError && <Error message={strings.ERROR_IN_PASSWORD} />}
                                        {passwordsDontMatch && <Error message={strings.PASSWORDS_DONT_MATCH} />}
                                        {error && <Error message={strings.ERROR_IN_SIGN_UP} />}
                                    </div>
                                    : null}
                            </div>
                        </form>

                    </Paper>
                </div>
                {isLoading && <Backdrop text={strings.PLEASE_WAIT} />}
            </Master>
        );
    }
}