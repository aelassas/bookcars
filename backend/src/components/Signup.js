import React, { Component } from 'react';
import Env from '../config/env.config';
import { strings as commonStrings } from '../lang/common';
import { strings } from '../lang/sign-up';
import UserService from '../services/UserService';
import Master from '../elements/Master';
import ReCAPTCHA from 'react-google-recaptcha';
import Error from '../elements/Error';
import Backdrop from '../elements/SimpleBackdrop';
import {
    Input,
    InputLabel,
    FormControl,
    FormHelperText,
    Button,
    Paper
} from '@mui/material';
import { toast } from 'react-toastify';
import validator from 'validator';

import '../assets/css/signup.css';

export default class SignUp extends Component {

    constructor(props) {
        super(props);
        this.state = {
            language: Env.DEFAULT_LANGUAGE,
            fullName: '',
            email: '',
            password: '',
            confirmPassword: '',
            reCaptchaToken: '',
            error: false,
            recaptchaError: false,
            passwordError: false,
            passwordsDontMatch: false,
            emailError: false,
            visible: false,
            loading: false,
            emailValid: true
        };
    }

    handleOnChangeFullName = (e) => {
        this.setState({
            fullName: e.target.value,
        });
    };

    handleOnChangeEmail = (e) => {
        this.setState({
            email: e.target.value,
        });

        if (!e.target.value) {
            this.setState({ emailError: false, emailValid: true });
        }
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

    validateEmail = async (email) => {
        if (email) {
            if (validator.isEmail(email)) {
                try {
                    const status = await UserService.validateEmail({ email });
                    if (status === 200) {
                        this.setState({ emailError: false, emailValid: true });
                        return true;
                    } else {
                        this.setState({ emailError: true, emailValid: true, avatarError: false, error: false });
                        return false;
                    }
                } catch (err) {
                    toast(commonStrings.GENERIC_ERROR, { type: 'error' });
                    this.setState({ emailError: false, emailValid: true });
                    return false;
                }
            } else {
                this.setState({ emailError: false, emailValid: false });
                return false;
            }
        } else {
            this.setState({ emailError: false, emailValid: true });
            return false;
        }
    };

    handleOnBlur = async (e) => {
        await this.validateEmail(e.target.value);
    };

    handleOnRecaptchaVerify = (token) => {
        this.setState({ reCaptchaToken: token });
    };

    handleClickShowPassword = () => {
        this.setState({ showPassword: !this.state.showPassword });
    };

    handleMouseDownPassword = (event) => {
        event.preventDefault();
    };

    handleClickShowConfirmPassword = () => {
        this.setState({ showConfirmPassword: !this.state.showConfirmPassword });
    };

    handleMouseDownConfirmPassword = (event) => {
        event.preventDefault();
    };

    handleTosChange = (event) => {
        this.setState({ tosChecked: event.target.checked });
    };

    handleSubmit = async (e) => {
        e.preventDefault();

        const { email } = this.state;

        const emailValid = await this.validateEmail(email);
        if (!emailValid) {
            return;
        }

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

        this.setState({ loading: true });

        const data = {
            email: this.state.email,
            password: this.state.password,
            fullName: this.state.fullName,
            language: UserService.getLanguage(),
            type: Env.RECORD_TYPE.ADMIN
        };

        UserService.signup(data)
            .then(status => {
                if (status === 200) {
                    UserService.signin({ email: this.state.email, password: this.state.password })
                        .then(signInResult => {
                            if (signInResult.status === 200) {
                                window.location.href = '/' + window.location.search;
                            } else {
                                this.setState({
                                    error: true,
                                    passwordError: false,
                                    passwordsDontMatch: false,
                                    register: false,
                                    loading: false
                                });
                            }
                        }).catch(err => {
                            this.setState({
                                error: true,
                                passwordError: false,
                                passwordsDontMatch: false,
                                register: false,
                                loading: false
                            });
                        });
                } else
                    this.setState({
                        error: true,
                        passwordError: false,
                        passwordsDontMatch: false,
                        register: false,
                        loading: false
                    });
            })
            .catch(err => {
                this.setState({
                    error: true,
                    passwordError: false,
                    passwordsDontMatch: false,
                    register: false,
                    loading: false
                });
            });

    };

    handleChange = (e) => {
        e.preventDefault();
    };

    onLoad = (user) => {
        if (user) {
            window.location.href = '/';
        } else {
            this.setState({ visible: true });
        }
    };

    render() {
        const { error,
            language,
            passwordError,
            passwordsDontMatch,
            emailError,
            recaptchaError,
            visible,
            loading,
            emailValid
        } = this.state;


        return (
            <Master strict={false} onLoad={this.onLoad}>
                <div className="signup">
                    <Paper className="signup-form" elevation={10} style={visible ? null : { display: 'none' }}>
                        <h1 className="signup-form-title"> {strings.SIGN_UP_HEADING} </h1>
                        <form onSubmit={this.handleSubmit}>
                            <div>
                                <FormControl fullWidth margin="dense">
                                    <InputLabel htmlFor="full-name">{commonStrings.FULL_NAME}</InputLabel>
                                    <Input
                                        id="full-name"
                                        type="text"
                                        value={this.state.fullName}
                                        name="FullName"
                                        required
                                        onChange={this.handleOnChangeFullName}
                                        autoComplete="off"
                                    />
                                </FormControl>
                                <FormControl fullWidth margin="dense">
                                    <InputLabel htmlFor="email">{commonStrings.EMAIL}</InputLabel>
                                    <Input
                                        id="email"
                                        type="text"
                                        error={!emailValid || emailError}
                                        value={this.state.email}
                                        name="Email"
                                        onBlur={this.handleOnBlur}
                                        onChange={this.handleOnChangeEmail}
                                        required
                                        autoComplete="off"
                                    />
                                    <FormHelperText error={!emailValid || emailError}>
                                        {(!emailValid && commonStrings.EMAIL_NOT_VALID) || ''}
                                        {(emailError && commonStrings.EMAIL_ALREADY_REGISTERED) || ''}
                                    </FormHelperText>
                                </FormControl>
                                <FormControl fullWidth margin="dense">
                                    <InputLabel htmlFor="password">{commonStrings.PASSWORD}</InputLabel>
                                    <Input
                                        id="password"
                                        value={this.state.password}
                                        name="Password"
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
                                    <InputLabel htmlFor="confirm-password">{commonStrings.CONFIRM_PASSWORD}</InputLabel>
                                    <Input
                                        id="confirm-password"
                                        value={this.state.confirmPassword}
                                        name="ConfirmPassword"
                                        onChange={this.handleOnChangeConfirmPassword}
                                        autoComplete="password"
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
                                <div className="buttons">
                                    <Button
                                        type="submit"
                                        variant="contained"
                                        className='btn-primary btn-margin-bottom'
                                        size="small"
                                    >
                                        {strings.SIGN_UP}
                                    </Button>
                                    <Button
                                        variant="contained"
                                        className='btn-secondary btn-margin-bottom'
                                        size="small"
                                        href="/"> {commonStrings.CANCEL}
                                    </Button>
                                </div>
                            </div>
                            <div className="form-error">
                                {passwordError && <Error message={commonStrings.ERROR_IN_PASSWORD} />}
                                {passwordsDontMatch && <Error message={commonStrings.PASSWORDS_DONT_MATCH} />}
                                {recaptchaError && <Error message={strings.ERROR_IN_RECAPTCHA} />}
                                {error && <Error message={strings.ERROR_IN_SIGN_UP} />}
                            </div>
                        </form>
                    </Paper>
                </div>
                {loading && <Backdrop text={commonStrings.PLEASE_WAIT} />}
            </Master>
        );
    }
}