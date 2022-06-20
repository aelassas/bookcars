import React, { Component } from 'react';
import Env from '../config/env.config';
import UserService from '../services/UserService';
import Master from '../elements/Master';
import { strings as commonStrings } from '../lang/common';
import { strings as cpStrings } from '../lang/change-password';
import { strings as rpStrings } from '../lang/reset-password';
import Error from './Error';
import NoMatch from './NoMatch';
import {
    Input,
    InputLabel,
    FormControl,
    FormHelperText,
    Button,
    Paper
} from '@mui/material';
import Helper from '../common/Helper';

import '../assets/css/reset-user-password.css';

export default class ResetUserPassword extends Component {

    constructor(props) {
        super(props);
        this.state = {
            userId: null,
            email: null,
            token: null,
            visible: false,
            error: false,
            noMatch: false,
            password: '',
            confirmPassword: '',
            passwordError: false,
            confirmPasswordError: false,
            passwordLengthError: false
        };
    }

    handleNewPasswordChange = (e) => {
        this.setState({ password: e.target.value });
    };

    handleConfirmPasswordChange = (e) => {
        this.setState({ confirmPassword: e.target.value });
    };

    handleOnConfirmPasswordKeyDown = (e) => {
        if (e.key === 'Enter') {
            this.handleSubmit(e);
        }
    };

    handleSubmit = (e) => {
        e.preventDefault();

        if (this.state.password.length < 6) {
            return this.setState({
                passwordLengthError: true,
                confirmPasswordError: false,
                passwordError: false
            });
        } else {
            this.setState({
                passwordLengthError: false,
                passwordError: false
            });
        }

        if (this.state.password !== this.state.confirmPassword) {
            return this.setState({
                confirmPasswordError: true,
                passwordError: false
            });
        } else {
            this.setState({
                confirmPasswordError: false,
                passwordError: false
            });
        }

        const { userId, email, token, password } = this.state;

        const data = { userId, token, password };

        UserService.activate(data)
            .then(status => {
                if (status === 200) {
                    UserService.signin({ email, password })
                        .then(signInResult => {
                            if (signInResult.status === 200) {
                                UserService.deleteTokens(userId)
                                    .then(status => {
                                        if (status === 200) {
                                            window.location.href = '/';
                                        } else {
                                            Helper.error();
                                        }
                                    })
                                    .catch((err) => {
                                        Helper.error(err);
                                    });
                            } else {
                                Helper.error();
                            }
                        })
                        .catch((err) => {
                            Helper.error(err);
                        });
                } else {
                    Helper.error();
                }
            })
            .catch((err) => {
                Helper.error(err);
            });

    };

    handleResend = () => {
        const { email } = this.state;

        UserService.resend(email, false, Env.APP_TYPE)
            .then(status => {
                if (status === 200) {
                    Helper.info(commonStrings.ACTIVATION_EMAIL_SENT);
                } else {
                    Helper.error();
                }
            })
            .catch((err) => {
                Helper.error(err);
            });
    };

    onLoad = (user) => {
        if (user) {
            this.setState({ noMatch: true });
        } else {
            const params = new URLSearchParams(window.location.search);
            if (params.has('u') && params.has('e') && params.has('t')) {
                const userId = params.get('u');
                const email = params.get('e');
                const token = params.get('t');
                if (userId && email && token) {
                    UserService.checkToken(userId, email, token)
                        .then(status => {
                            if (status === 200) {
                                this.setState({ userId, email, token, visible: true });

                                if (params.has('r')) {
                                    const reset = params.get('r') === 'true';
                                    this.setState({ reset });
                                }
                            } else {
                                this.setState({ noMatch: true });
                            }
                        })
                        .catch((err) => {
                            this.setState({ noMatch: true });
                        });
                } else {
                    this.setState({ noMatch: true });
                }
            } else {
                this.setState({ noMatch: true });
            }
        }
    };

    render() {
        const {
            visible,
            error,
            noMatch,
            passwordError,
            confirmPasswordError,
            passwordLengthError,
            password,
            confirmPassword
        } = this.state;

        return (
            <Master onLoad={this.onLoad} strict={false}>
                {visible &&
                    <div className="reset-user-password">
                        <Paper className="reset-user-password-form" elevation={10}>
                            <h1>{rpStrings.RESET_PASSWORD_HEADING}</h1>
                            <form onSubmit={this.handleSubmit}>
                                <FormControl fullWidth margin="dense">
                                    <InputLabel className='required' error={passwordError}>
                                        {cpStrings.NEW_PASSWORD}
                                    </InputLabel>
                                    <Input
                                        id="password-new"
                                        onChange={this.handleNewPasswordChange}
                                        type='password'
                                        value={password}
                                        error={passwordError}
                                        required
                                    />
                                    <FormHelperText
                                        error={passwordError}
                                    >
                                        {(passwordError && cpStrings.NEW_PASSWORD_ERROR) || ''}
                                    </FormHelperText>
                                </FormControl>
                                <FormControl fullWidth margin="dense" error={confirmPasswordError}>
                                    <InputLabel error={confirmPasswordError} className='required'>
                                        {commonStrings.CONFIRM_PASSWORD}
                                    </InputLabel>
                                    <Input
                                        id="password-confirm"
                                        onChange={this.handleConfirmPasswordChange}
                                        onKeyDown={this.handleOnConfirmPasswordKeyDown}
                                        error={confirmPasswordError || passwordLengthError}
                                        type='password'
                                        value={confirmPassword}
                                        required
                                    />
                                    <FormHelperText
                                        error={confirmPasswordError || passwordLengthError}
                                    >
                                        {confirmPasswordError
                                            ? commonStrings.PASSWORDS_DONT_MATCH
                                            : (passwordLengthError ? commonStrings.PASSWORD_ERROR : '')}
                                    </FormHelperText>
                                </FormControl>
                                <div className='buttons'>
                                    <Button
                                        type="submit"
                                        className='btn-primary btn-margin btn-margin-bottom'
                                        size="small"
                                        variant='contained'
                                    >
                                        {commonStrings.UPDATE}
                                    </Button>
                                    <Button
                                        className='btn-secondary btn-margin-bottom'
                                        size="small"
                                        variant='contained'
                                        href="/"
                                    >
                                        {commonStrings.CANCEL}
                                    </Button>
                                </div>
                            </form>
                        </Paper>
                    </div>
                }
                {error && <Error />}
                {noMatch && <NoMatch hideHeader />}
            </Master>
        );
    }
}