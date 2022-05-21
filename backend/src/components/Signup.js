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
    Paper,
    Checkbox,
    Link
} from '@mui/material';

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
            tosChecked: false,
            loading: false
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

    handleOnBlur = e => {
        this.setState({
            email: e.target.value,
        });

        const emailData = {
            email: this.state.email,
        };

        UserService.validateEmail(emailData).then(emailStatus => {
            if (emailStatus === 204) {
                this.setState({ emailError: true });
            } else {
                this.setState({ emailError: false });
            }
        }).catch(err => {
            this.setState({ emailError: false });
        });
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

                this.setState({ loading: true });

                const data = {
                    email: this.state.email,
                    password: this.state.password,
                    fullName: this.state.fullName,
                    language: UserService.getLanguage(),
                    type: Env.RECORD_TYPE.ADMIN
                };

                UserService.create(data)
                    .then(data => {
                        if (data && data._id) {
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
            }

        }).catch(err => {
            this.setState({ emailError: true });
        })
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
            tosChecked,
            loading } = this.state;

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
                                        error={emailError}
                                        value={this.state.email}
                                        name="Email"
                                        onBlur={this.handleOnBlur}
                                        onChange={this.handleOnChangeEmail}
                                        required
                                        autoComplete="off"
                                    />
                                    <FormHelperText error={emailError}>
                                        {emailError ? commonStrings.EMAIL_ALREADY_REGISTERED : ''}
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
                                <div className="signup-tos">
                                    <table>
                                        <tbody>
                                            <tr>
                                                <td>
                                                    <Checkbox
                                                        checked={tosChecked}
                                                        onChange={this.handleTosChange}
                                                        name="tosChecked"
                                                        color="primary"
                                                    />
                                                </td>
                                                <td>
                                                    <Link href="/tos">{strings.TOS_SIGN_UP}</Link>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                                <div className="buttons">
                                    <Button
                                        type="submit"
                                        variant="contained"
                                        className='btn-primary btn-margin-bottom'
                                        size="small"
                                        disabled={emailError || !tosChecked}
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
                                {(passwordError || passwordsDontMatch || recaptchaError || error) ?
                                    <div>
                                        {passwordError && <Error message={commonStrings.ERROR_IN_PASSWORD} />}
                                        {passwordsDontMatch && <Error message={commonStrings.PASSWORDS_DONT_MATCH} />}
                                        {recaptchaError && <Error message={strings.ERROR_IN_RECAPTCHA} />}
                                        {error && <Error message={strings.ERROR_IN_SIGN_UP} />}
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