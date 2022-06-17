import React, { Component } from 'react';
import Master from '../elements/Master';
import { strings as commonStrings } from '../lang/common';
import { strings } from '../lang/change-password';
import UserService from '../services/UserService';
import Backdrop from '../elements/SimpleBackdrop';
import NoMatch from '../elements/NoMatch';
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
import Helper from '../common/Helper';

import styles from '../styles/change-password.module.css';

export default class ChangePassword extends Component {

    constructor(props) {
        super(props);
        this.state = {
            user: null,
            userId: '',
            newPassword: '',
            confirmPassword: '',
            newPasswordError: false,
            confirmPasswordError: false,
            passwordLengthError: false,
            error: false,
            loading: false,
            noMatch: false,
            currentPassword: '',
            currentPasswordError: false,
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
    };

    handleCurrentPasswordChange = (e) => {
        this.setState({ currentPassword: e.target.value });
    };

    error = () => {
        toast(strings.PASSWORD_UPDATE_ERROR, { type: 'error' });
    };

    handleSubmit = (e) => {
        e.preventDefault();

        const submit = () => {

            if (this.state.newPassword.length < 6) {
                return this.setState({
                    passwordLengthError: true,
                    confirmPasswordError: false,
                    newPasswordError: false
                });
            } else {
                this.setState({
                    passwordLengthError: false,
                    newPasswordError: false
                });
            }

            if (this.state.newPassword !== this.state.confirmPassword) {
                return this.setState({
                    confirmPasswordError: true,
                    newPasswordError: false
                });
            } else {
                this.setState({
                    confirmPasswordError: false,
                    newPasswordError: false
                });
            }

            const { user, currentPassword, newPassword } = this.state;

            const data = {
                _id: user._id,
                password: currentPassword,
                newPassword,
                strict: true
            };

            UserService.changePassword(data)
                .then(status => {
                    if (status === 200) {
                        UserService.getUser(user._id)
                            .then(_user => {
                                if (_user) {
                                    this.setState({ user: _user, newPasswordError: false, currentPassword: '', newPassword: '', confirmPassword: '' });
                                    toast(strings.PASSWORD_UPDATE, { type: 'info' });
                                } else {
                                    this.error();
                                }
                            })
                            .catch(() => {
                                UserService.signout();
                            });
                    } else {
                        this.error();
                    }
                })
                .catch(() => {
                    UserService.signout();
                });
        };

        const { user, currentPassword } = this.state;

        UserService.checkPassword(user._id, currentPassword)
            .then((status) => {
                this.setState({
                    currentPasswordError: status !== 200,
                    newPasswordError: false,
                    passwordLengthError: false,
                    confirmPasswordError: false
                });

                if (status === 200) {
                    submit();
                }
            })
            .catch(() => UserService.signout());

    };

    onLoad = (user) => {
        this.setState({ user, loading: false, visible: true });
    }

    componentDidMount() {
        Helper.setLanguage(commonStrings);
        Helper.setLanguage(strings);
        this.setState({ loading: true, visible: false });
    }

    render() {
        const { visible, currentPassword, newPassword, confirmPassword,
            currentPasswordError, newPasswordError, confirmPasswordError,
            passwordLengthError, loading, error, noMatch } = this.state;

        return (
            <Master onLoad={this.onLoad} strict={true}>
                {visible &&
                    <div className={styles.passwordReset}>
                        <Paper className={styles.passwordResetForm} elevation={10}>
                            <h1 className={styles.passwordResetFormTitle}> {strings.CHANGE_PASSWORD_HEADING} </h1>
                            <form className="form" onSubmit={this.handleSubmit}>
                                <FormControl fullWidth margin="dense">
                                    <InputLabel
                                        error={currentPasswordError}
                                        className='required'
                                    >
                                        {strings.CURRENT_PASSWORD}
                                    </InputLabel>
                                    <Input
                                        onChange={this.handleCurrentPasswordChange}
                                        value={currentPassword}
                                        error={currentPasswordError}
                                        type='password'
                                        required
                                    />
                                    <FormHelperText
                                        error={currentPasswordError}
                                    >
                                        {(currentPasswordError && strings.CURRENT_PASSWORD_ERROR) || ''}
                                    </FormHelperText>
                                </FormControl>
                                <FormControl
                                    fullWidth
                                    margin="dense"
                                >
                                    <InputLabel className='required' error={newPasswordError}>
                                        {strings.NEW_PASSWORD}
                                    </InputLabel>
                                    <Input
                                        onChange={this.handleNewPasswordChange}
                                        type='password'
                                        value={newPassword}
                                        error={newPasswordError || passwordLengthError}
                                        required
                                    />
                                    <FormHelperText
                                        error={newPasswordError || passwordLengthError}
                                    >
                                        {
                                            ((newPasswordError && strings.NEW_PASSWORD_ERROR) || '')
                                            || (passwordLengthError ? commonStrings.PASSWORD_ERROR : '')
                                        }
                                    </FormHelperText>
                                </FormControl>
                                <FormControl
                                    fullWidth
                                    margin="dense"
                                    error={confirmPasswordError}
                                >
                                    <InputLabel
                                        error={confirmPasswordError}
                                        className='required'
                                    >
                                        {commonStrings.CONFIRM_PASSWORD}
                                    </InputLabel>
                                    <Input
                                        onChange={this.handleConfirmPasswordChange}
                                        onKeyDown={this.handleOnConfirmPasswordKeyDown}
                                        error={confirmPasswordError}
                                        type='password'
                                        value={confirmPassword}
                                        required
                                    />
                                    <FormHelperText
                                        error={confirmPasswordError}
                                    >
                                        {confirmPasswordError && commonStrings.PASSWORDS_DONT_MATCH}
                                    </FormHelperText>
                                </FormControl>
                                <div className='buttons'>
                                    <Button
                                        type="submit"
                                        className='btn-primary btn-margin btn-margin-bottom'
                                        size="small"
                                        variant='contained'
                                    >
                                        {commonStrings.RESET_PASSWORD}
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
                    </div>}
                {loading && <Backdrop text={commonStrings.PLEASE_WAIT} />}
                {error && <Error homeLink />}
                {noMatch && <NoMatch />}
            </Master>
        );
    }
}