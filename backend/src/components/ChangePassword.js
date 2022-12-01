import React, { useState } from 'react';
import Master from '../elements/Master';
import { strings as commonStrings } from '../lang/common';
import { strings } from '../lang/change-password';
import * as UserService from '../services/UserService';
import Backdrop from '../elements/SimpleBackdrop';
import {
    Paper,
    Input,
    InputLabel,
    FormControl,
    FormHelperText,
    Button
} from '@mui/material';
import * as Helper from '../common/Helper';

import '../assets/css/change-password.css';

const ChangePassword = () => {
    const [user, setUser] = useState();
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [newPasswordError, setNewPasswordError] = useState(false);
    const [confirmPasswordError, setConfirmPasswordError] = useState(false);
    const [passwordLengthError, setPasswordLengthError] = useState(false);
    const [loading, setLoading] = useState(true);
    const [visible, setVisible] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [currentPasswordError, setCurrentPasswordError] = useState(false);

    const handleNewPasswordChange = (e) => {
        setNewPassword(e.target.value);
    };

    const handleConfirmPasswordChange = (e) => {
        setConfirmPassword(e.target.value);
    };

    const handleOnConfirmPasswordKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleSubmit(e);
        }
    };

    const handleCurrentPasswordChange = (e) => {
        setCurrentPassword(e.target.value);
    };

    const err = () => {
        Helper.error(null, strings.PASSWORD_UPDATE_ERROR);
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        const submit = () => {

            if (newPassword.length < 6) {
                setPasswordLengthError(true);
                setConfirmPasswordError(false);
                setNewPasswordError(false);
                return;
            } else {
                setPasswordLengthError(false);
                setNewPasswordError(false);
            }

            if (newPassword !== confirmPassword) {
                setConfirmPasswordError(true);
                setNewPasswordError(false);
                return;
            } else {
                setConfirmPasswordError(false);
                setNewPasswordError(false);
            }

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
                                    setUser(_user);
                                    setNewPasswordError(false);
                                    setCurrentPassword('');
                                    setNewPassword('');
                                    setConfirmPassword('');
                                    Helper.info(strings.PASSWORD_UPDATE);
                                } else {
                                    err();
                                }
                            })
                            .catch(() => {
                                UserService.signout();
                            });
                    } else {
                        err();
                    }
                })
                .catch(() => {
                    UserService.signout();
                });
        };

        UserService.checkPassword(user._id, currentPassword)
            .then((status) => {
                setCurrentPasswordError(status !== 200);
                setNewPasswordError(false);
                setPasswordLengthError(false);
                setConfirmPasswordError(false);

                if (status === 200) {
                    submit();
                }
            })
            .catch(() => UserService.signout());
    };

    const onLoad = (user) => {
        setUser(user);
        setLoading(false);
        setVisible(true);
    }

    return (
        <Master onLoad={onLoad} strict={true}>
            <div className="password-reset" style={visible ? null : { display: 'none' }}>
                <Paper className="password-reset-form password-reset-form-wrapper" elevation={10}>
                    <h1 className="password-reset-form-title"> {strings.CHANGE_PASSWORD_HEADING} </h1>
                    <form className="form" onSubmit={handleSubmit}>
                        <FormControl fullWidth margin="dense">
                            <InputLabel
                                error={currentPasswordError}
                                className='required'
                            >
                                {strings.CURRENT_PASSWORD}
                            </InputLabel>
                            <Input
                                id="password-current"
                                onChange={handleCurrentPasswordChange}
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
                                id="password-new"
                                onChange={handleNewPasswordChange}
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
                                id="password-confirm"
                                onChange={handleConfirmPasswordChange}
                                onKeyDown={handleOnConfirmPasswordKeyDown}
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
            </div>
            {loading && <Backdrop text={commonStrings.PLEASE_WAIT} />}
        </Master>
    );
};

export default ChangePassword;