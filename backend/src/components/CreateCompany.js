import React, { Component } from 'react';
import Master from '../elements/Master';
import Env from '../config/env.config';
import { strings as commonStrings } from '../lang/common';
import { strings } from '../lang/create-company';
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
import { Info as InfoIcon } from '@mui/icons-material';

import '../assets/css/create-company.css';

export default class CreateCompany extends Component {

    constructor(props) {
        super(props);
        this.state = {
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
            loading: false,
            fullNameError: false,
            avatar: null,
            avatarError: false,
            avatarSizeError: false
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
        }).catch(() => {
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
        }).catch(() => {
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
                        avatarError: false,
                        avatarSizeError: false,
                    });
                    return;
                }

                if (this.state.password !== this.state.confirmPassword) {
                    this.setState({
                        passwordsDontMatch: true,
                        passwordError: false,
                        error: false,
                        avatarError: false,
                        avatarSizeError: false,
                    });
                    return;
                }

                if (!this.state.avatar) {
                    this.setState({
                        avatarError: true,
                        avatarSizeError: false,
                        passwordsDontMatch: false,
                        passwordError: false,
                        error: false
                    });
                    return;
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
                    type: Env.RECORD_TYPE.COMPANY,
                    avatar: this.state.avatar
                };

                UserService.signup(data)
                    .then(registerStatus => {
                        if (registerStatus === 200) {
                            window.location = '/companies';
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
            }

        }).catch(() => {
            this.setState({ emailError: true });
        })
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

    onAvatarValidate = (valid) => {
        if (!valid) {
            this.setState({
                avatarSizeError: true,
                avatarError: false,
                passwordsDontMatch: false,
                passwordError: false,
                error: false,
                loading: false,
            });
        } else {
            this.setState({
                avatarSizeError: false,
                avatarError: false,
                passwordsDontMatch: false,
                passwordError: false,
                error: false,
            });
        }
    };

    handleCancel = () => {
        const { avatar } = this.state;

        if (avatar) {
            this.setState({ loading: true });

            UserService.deleteTempAvatar(avatar)
                .then(() => {
                    window.location.href = '/companies';
                })
                .catch(() => {
                    window.location.href = '/companies';
                });
        } else {
            window.location.href = '/companies';
        }
    };

    onLoad = (user) => {
        this.setState({ language: user.language, visible: true });
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
            avatarError,
            avatarSizeError,
            visible,
            loading } = this.state;

        return (
            <Master onLoad={this.onLoad} strict={true} admin={true}>
                <div className='create-company'>
                    <Paper className="company-form company-form-wrapper" elevation={10} style={visible ? null : { display: 'none' }}>
                        <h1 className="company-form-title"> {strings.CREATE_COMPANY_HEADING} </h1>
                        <form onSubmit={this.handleSubmit}>
                            <Avatar
                                type={Env.RECORD_TYPE.COMPANY}
                                mode='create'
                                record={null}
                                size='large'
                                readonly={false}
                                onBeforeUpload={this.onBeforeUpload}
                                onChange={this.onAvatarChange}
                                onValidate={this.onAvatarValidate}
                                color='disabled'
                                className='avatar-ctn'
                            // width={Env.COMPANY_IMAGE_WIDTH}
                            // height={Env.COMPANY_IMAGE_HEIGHT} 
                            />
                            
                            <div className='info'>
                                <InfoIcon />
                                <label>
                                    {strings.RECOMMENDED_IMAGE_SIZE}
                                </label>
                            </div>

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
                                    {fullNameError ? strings.INVALID_COMPANY_NAME : ''}
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
                            <div className="buttons">
                                <Button
                                    type="submit"
                                    variant="contained"
                                    className='btn-primary btn-margin-bottom'
                                    size="small"
                                    disabled={emailError}
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
                                {(passwordError || passwordsDontMatch || error || avatarError || avatarSizeError) ?
                                    <div>
                                        {passwordError && <Error message={commonStrings.ERROR_IN_PASSWORD} />}
                                        {passwordsDontMatch && <Error message={commonStrings.PASSWORDS_DONT_MATCH} />}
                                        {error && <Error message={commonStrings.GENERIC_ERROR} />}
                                        {avatarError && <Error message={commonStrings.IMAGE_REQUIRED} />}
                                        {avatarSizeError && <Error message={strings.COMPANY_IMAGE_SIZE_ERROR} />}
                                    </div>
                                    : null}
                            </div>
                        </form>

                    </Paper>
                </div>
                {loading && <Backdrop text={commonStrings.PLEASE_WAIT} />}
            </Master>
        );
    }
}