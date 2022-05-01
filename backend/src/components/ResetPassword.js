import React, { Component } from 'react';
import Master from '../elements/Master';
import { strings } from '../config/app.config';
import UserService from '../services/UserService';
import Backdrop from '../elements/SimpleBackdrop';
import NoMatch from './NoMatch';
import Error from '../elements/Error';
import { toast } from 'react-toastify';
import {
    Paper,
    Input,
    InputLabel,
    FormControl,
    FormHelperText,
    Button
} from '@mui/material';

import '../assets/css/reset-password.css';

export default class ResetPassword extends Component {

    constructor(props) {
        super(props);
        this.state = {
            user: null,
            userId: '',
            newPassword: '',
            confirmPassword: '',
            confirmPasswordError: false,
            passwordLengthError: false,
            unhandledError: false,
            isLoading: false,
            noMatch: false
        };
    }

    handleNewPasswordChange = (e) => {
        this.setState({ newPassword: e.target.value });
    };

    handleConfirmPasswordChange = (e) => {
        this.setState({ confirmPassword: e.target.value });
    };

    handleOnConfirmPasswordKeyDown = (e) => {
        if (e.key === 'Enter') {
            this.handleSubmit(e);
        }
    }

    handleSubmit = (e) => {
        e.preventDefault();
        console.log('submit')
        // TODO

        if (this.state.newPassword.length < 6) {
            this.setState({
                passwordLengthError: true,
                confirmPasswordError: false
            });
            return;
        } else {
            this.setState({
                passwordLengthError: false
            });
        }

        if (this.state.newPassword !== this.state.confirmPassword) {
            this.setState({
                confirmPasswordError: true
            });
            return;
        } else {
            this.setState({
                confirmPasswordError: false
            });
        }



        const { userId, password, newPassword } = this.state;
        const data = {
            _id: userId,
            password,
            newPassword
        };

        UserService.resetPassword(data)
            .then(status => {
                if (status === 200) {
                    toast(strings.PASSWORD_UPDATE, { type: 'info' });
                } else {
                    toast(strings.PASSWORD_UPDATE_ERROR, { type: 'error' });
                }
            })
            .catch(_ => {
                toast(strings.PASSWORD_UPDATE_ERROR, { type: 'error' });
            });
    };

    onLoad = (user) => {
        this.setState({ user });

        const params = new URLSearchParams(window.location.search);
        if (params.has('u')) {
            const id = params.get('u');
            if (id && id !== '') {
                UserService.getUser(id)
                    .then(_user => {
                        this.setState({ userId: _user._id, visible: true, isLoading: false });
                    })
                    .catch(err => {
                        this.setState({ isLoading: false, unhandledError: true, visible: false });
                    });
            } else {
                this.setState({ isLoading: false, noMatch: true });
            }
        } else {
            this.setState({ isLoading: false, noMatch: true });
        }
    }

    componentDidMount() {
        this.setState({ isLoading: true, visible: false });
    }

    render() {
        const { visible, confirmPasswordError, passwordLengthError, error, isLoading, unhandledError, noMatch } = this.state;

        return (
            <Master onLoad={this.onLoad} strict={true}>
                <div className="password-reset" style={visible ? null : { display: 'none' }}>
                    <Paper className="password-reset-form password-reset-form-wrapper" elevation={10}>
                        <h1 className="password-reset-form-title"> {strings.PASSWORD_RESET_HEADING} </h1>
                        <form className="form" onSubmit={this.handleSubmit}>
                            <FormControl
                                fullWidth
                                margin="dense"
                            >
                                <InputLabel>
                                    {strings.NEW_PASSWORD}
                                </InputLabel>
                                <Input
                                    id="password-new"
                                    onChange={this.handleNewPasswordChange}
                                    type='password'
                                    required
                                />
                            </FormControl>
                            <FormControl
                                fullWidth
                                margin="dense"
                                error={confirmPasswordError}
                            >
                                <InputLabel
                                    error={confirmPasswordError}
                                >
                                    {strings.CONFIRM_PASSWORD}
                                </InputLabel>
                                <Input
                                    id="password-confirm"
                                    onChange={this.handleConfirmPasswordChange}
                                    onKeyDown={this.handleOnConfirmPasswordKeyDown}
                                    error={confirmPasswordError || passwordLengthError}
                                    type='password'
                                    required
                                />
                                <FormHelperText
                                    error={confirmPasswordError || passwordLengthError}
                                >
                                    {confirmPasswordError
                                        ? strings.PASSWORDS_DONT_MATCH
                                        : (passwordLengthError ? strings.ERROR_IN_PASSWORD : '')}
                                </FormHelperText>
                            </FormControl>
                            <div className='buttons'>
                                <Button
                                    type="submit"
                                    className='btn-primary btn-margin'
                                    size="small"
                                >
                                    {strings.RESET_PASSWORD}
                                </Button>
                                <Button
                                    className='btn-secondary'
                                    size="small"
                                    href="/"
                                >
                                    {strings.CANCEL}
                                </Button>
                            </div>
                            <div className="form-error">
                                {error && <Error message={strings.PASSWORD_UPDATE_ERROR} />}
                            </div>
                        </form>
                    </Paper>
                </div>
                {isLoading && <Backdrop text={strings.PLEASE_WAIT} />}
                {unhandledError && <Error message={strings.GENERIC_ERROR} style={{ marginTop: '25px' }} />}
                {noMatch && <NoMatch style={{ marginTop: '-65px' }} />}
            </Master>
        );
    }
}