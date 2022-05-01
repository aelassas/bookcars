import React, { Component } from 'react';
import Master from '../elements/Master';
import Env from '../config/env.config';
import { strings } from '../config/app.config';
import UserService from '../services/UserService';
import CompanyService from '../services/CompanyService';
import ReCAPTCHA from 'react-google-recaptcha';
import Error from '../elements/Error';
import Backdrop from '../elements/SimpleBackdrop';
import {
    Input,
    InputLabel,
    FormControl,
    FormHelperText,
    Button,
    Paper,
    Checkbox,
    Link
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
            reCaptchaToken: '',
            error: false,
            recaptchaError: false,
            passwordError: false,
            passwordsDontMatch: false,
            emailError: false,
            visible: false,
            tosChecked: false,
            isLoading: false,
            fullNameError: false
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

    handleOnRecaptchaVerify = (token) => {
        this.setState({ reCaptchaToken: token });
    };

    handleMouseDownPassword = (event) => {
        event.preventDefault();
    };

    handleMouseDownConfirmPassword = (event) => {
        event.preventDefault();
    };

    preventDefault = (event) => event.preventDefault();

    handleTosChange = (event) => {
        this.setState({ tosChecked: event.target.checked });
    };

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
                        recaptchaError: false,
                        passwordsDontMatch: false,
                        error: false,
                        register: false
                    });
                    return;
                }

                if (this.state.password !== this.state.confirmPassword) {
                    this.setState({
                        passwordsDontMatch: true,
                        recaptchaError: false,
                        passwordError: false,
                        error: false,
                        register: false
                    });
                    return;
                }

                if (!this.state.reCaptchaToken) {
                    this.setState({
                        recaptchaError: true,
                        passwordsDontMatch: false,
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
                    type: Env.USER_TYPE.COMPANY
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

    onLoad = (user) => {
        this.setState({ user, language: user.language, visible: true });
    }

    componentDidMount() {
    }

    render() {
        const { error,
            language,
            passwordError,
            passwordsDontMatch,
            emailError,
            fullNameError,
            recaptchaError,
            visible,
            tosChecked,
            isLoading } = this.state;

        return (
            <Master onLoad={this.onLoad} strict={true} admin={true}>
                <Paper className="company-form company-form-wrapper" elevation={10} style={visible ? null : { display: 'none' }}>
                    <div className="company">
                        <h1 className="company-form-title"> {strings.CREATE_COMPANY_HEADING} </h1>
                        <form onSubmit={this.handleSubmit}>
                            <div>
                                <FormControl fullWidth margin="dense">
                                    <InputLabel>{strings.FULL_NAME}</InputLabel>
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
                                    <InputLabel>{strings.EMAIL}</InputLabel>
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
                                    <InputLabel>{strings.PASSWORD}</InputLabel>
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
                                    <InputLabel>{strings.CONFIRM_PASSWORD}</InputLabel>
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
                                <div className="recaptcha">
                                    <ReCAPTCHA
                                        sitekey={process.env.REACT_APP_BC_RECAPTCHA_SITE_KEY}
                                        hl={language}
                                        onChange={this.handleOnRecaptchaVerify}
                                    />
                                </div>
                                <div className="company-tos">
                                    <table>
                                        <tbody>
                                            <tr>
                                                <td>
                                                    <Checkbox
                                                        checked={tosChecked}
                                                        onChange={this.handleTosChange}
                                                        color="primary"
                                                    />
                                                </td>
                                                <td>
                                                    <Link href="/tos" onClick={this.preventDefault}>{strings.TOS_SIGN_UP}</Link>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                                <div className="buttons">
                                    <Button
                                        type="submit"
                                        variant="contained"
                                        className='btn-primary'
                                        size="small"
                                        disabled={emailError || !tosChecked}
                                    >
                                        {strings.CREATE}
                                    </Button>
                                    <Button
                                        variant="contained"
                                        className='btn-secondary'
                                        size="small"
                                        href="/companies"
                                    >
                                        {strings.CANCEL}
                                    </Button>
                                </div>
                            </div>
                            <div className="form-error">
                                {(passwordError || passwordsDontMatch || recaptchaError || error) ?
                                    <div>
                                        {passwordError && <Error message={strings.ERROR_IN_PASSWORD} />}
                                        {passwordsDontMatch && <Error message={strings.PASSWORDS_DONT_MATCH} />}
                                        {recaptchaError && <Error message={strings.ERROR_IN_RECAPTCHA} />}
                                        {error && <Error message={strings.ERROR_IN_SIGN_UP} />}
                                    </div>
                                    : null}
                            </div>
                        </form>
                    </div>
                </Paper>
                {isLoading && <Backdrop text={strings.PLEASE_WAIT} />}
            </Master>
        );
    }
}