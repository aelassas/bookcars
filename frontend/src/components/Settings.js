import React, { Component } from 'react';
import Env from '../config/env.config';
import Master from '../elements/Master';
import { strings as commonStrings } from '../lang/common';
import { strings } from '../lang/settings';
import UserService from '../services/UserService';
import Error from '../elements/Error';
import Backdrop from '../elements/SimpleBackdrop';
import DatePicker from '../elements/DatePicker';
import { toast } from 'react-toastify';
import { Avatar } from '../elements/Avatar';
import {
    Input,
    InputLabel,
    FormHelperText,
    FormControl,
    FormControlLabel,
    Switch,
    Button,
    Paper
} from '@mui/material';
import validator from 'validator';
import { intervalToDuration } from 'date-fns';

import '../assets/css/settings.css';

export default class Settings extends Component {

    constructor(props) {
        super(props);
        this.state = {
            user: null,
            fullName: '',
            phone: '',
            location: '',
            bio: '',
            error: false,
            visible: false,
            loading: false,
            birthDate: null,
            birthDateValid: true,
            phoneValid: true
        };
    }

    handleOnChangeFullName = e => {
        this.setState({
            fullName: e.target.value,
        });
    };

    validatePhone = (phone) => {
        if (phone) {
            const phoneValid = validator.isMobilePhone(phone);
            this.setState({ phoneValid });

            return phoneValid;
        } else {
            this.setState({ phoneValid: true });

            return true;
        }
    };

    handlePhoneChange = e => {
        this.setState({
            phone: e.target.value,
        });

        if (!e.target.value) {
            this.setState({ phoneValid: true });
        }
    };


    handlePhoneBlur = (e) => {
        this.validatePhone(e.target.value);
    };

    validateBirthDate = (date) => {
        if (date) {
            const now = new Date();
            const sub = intervalToDuration({ start: date, end: now }).years;
            const birthDateValid = sub >= Env.MINIMUM_AGE;

            this.setState({ birthDateValid });
            return birthDateValid;
        } else {
            this.setState({ birthDateValid: true });
            return true;
        }
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

    handleEmailNotificationsChange = (e) => {
        const { user } = this.state;
        user.enableEmailNotifications = e.target.checked;
        UserService.updateEmailNotifications(user)
            .then(status => {
                if (status === 200) {
                    this.setState({ user });
                    toast(strings.SETTINGS_UPDATED, { type: 'info' });
                }
            })
            .catch(err => {
                UserService.signout();
            });
    };

    handleChange = (e) => {
        e.preventDefault();
    };

    onBeforeUpload = () => {
        this.setState({ loading: true });
    };

    onAvatarChange = (user) => {
        this.setState({ loading: false, user });
    };

    onError = () => {
        this.setState({ loading: false });
    };

    handleSubmit = e => {
        e.preventDefault();

        const { phone, birthDate } = this.state;

        const phoneValid = this.validatePhone(phone);
        if (!phoneValid) {
            return;
        }

        const birthDateValid = this.validateBirthDate(birthDate);
        if (!birthDateValid) {
            return;
        }

        const { user, fullName, location, bio } = this.state;

        const data = {
            _id: user._id,
            fullName,
            birthDate,
            phone,
            location,
            bio
        };

        UserService.updateUser(data)
            .then(status => {
                if (status === 200) {
                    toast(strings.SETTINGS_UPDATED, { type: 'info' });
                } else {
                    toast(commonStrings.GENERIC_ERROR, { type: 'error' });
                }
            })
            .catch(() => {
                UserService.signout();
            });
    };

    onLoad = (user) => {
        this.setState({
            user,
            fullName: user.fullName,
            phone: user.phone,
            birthDate: new Date(user.birthDate),
            location: user.location,
            bio: user.bio,
            loading: false,
            visible: true
        });
    };

    componentDidMount() {
        this.setState({ loading: true });
    }

    render() {
        const {
            user,
            fullName,
            phone,
            location,
            bio,
            error,
            visible,
            loading,
            birthDate,
            birthDateValid,
            phoneValid
        } = this.state;

        return (
            <Master onLoad={this.onLoad} onError={this.onError} strict={true} user={user}>
                {visible && user &&
                    <div className='settings'>
                        <Paper className="settings-form settings-form-wrapper" elevation={10}>
                            <form onSubmit={this.handleSubmit}>
                                <Avatar
                                    type={user.type}
                                    loggedUser={user}
                                    user={user}
                                    size='large'
                                    readonly={false}
                                    onBeforeUpload={this.onBeforeUpload}
                                    onChange={this.onAvatarChange}
                                    color='disabled'
                                    className='avatar-ctn' />
                                <FormControl fullWidth margin="dense">
                                    <InputLabel className='required'>{commonStrings.FULL_NAME}</InputLabel>
                                    <Input
                                        id="full-name"
                                        type="text"
                                        required
                                        onChange={this.handleOnChangeFullName}
                                        autoComplete="off"
                                        value={fullName}
                                    />
                                </FormControl>
                                <FormControl fullWidth margin="dense">
                                    <InputLabel className='required'>{commonStrings.EMAIL}</InputLabel>
                                    <Input
                                        id="email"
                                        type="text"
                                        value={user.email}
                                        disabled
                                    />
                                </FormControl>
                                <FormControl fullWidth margin="dense">
                                    <InputLabel className='required'>{commonStrings.PHONE}</InputLabel>
                                    <Input
                                        id="phone"
                                        type="text"
                                        required
                                        error={!phoneValid}
                                        onChange={this.handlePhoneChange}
                                        autoComplete="off"
                                        value={phone}
                                    />
                                    <FormHelperText error={!phoneValid}>
                                        {(!phoneValid && commonStrings.PHONE_NOT_VALID) || ''}
                                    </FormHelperText>
                                </FormControl>
                                <FormControl fullWidth margin="dense">
                                    <DatePicker
                                        label={commonStrings.BIRTH_DATE}
                                        value={birthDate}
                                        variant='standard'
                                        error={!birthDateValid}
                                        required
                                        onChange={(birthDate) => {
                                            const birthDateValid = this.validateBirthDate(birthDate);

                                            this.setState({ birthDate, birthDateValid });
                                        }}
                                        language={user.language}
                                    />
                                    <FormHelperText error={!birthDateValid}>
                                        {(!birthDateValid && commonStrings.BIRTH_DATE_NOT_VALID) || ''}
                                    </FormHelperText>
                                </FormControl>
                                <FormControl fullWidth margin="dense">
                                    <InputLabel>{commonStrings.LOCATION}</InputLabel>
                                    <Input
                                        id="location"
                                        type="text"
                                        onChange={this.handleOnChangeLocation}
                                        autoComplete="off"
                                        value={location}
                                    />
                                </FormControl>
                                <FormControl fullWidth margin="dense">
                                    <InputLabel>{commonStrings.BIO}</InputLabel>
                                    <Input
                                        id="bio"
                                        type="text"
                                        onChange={this.handleOnChangeBio}
                                        autoComplete="off"
                                        value={bio}
                                    />
                                </FormControl>
                                <div className="buttons">
                                    <Button
                                        type="submit"
                                        variant="contained"
                                        className='btn-primary btn-margin btn-margin-bottom'
                                        size="small"
                                        href='/change-password'
                                    >
                                        {commonStrings.RESET_PASSWORD}
                                    </Button>
                                    <Button
                                        type="submit"
                                        variant="contained"
                                        className='btn-primary btn-margin-bottom'
                                        size="small"
                                    >
                                        {commonStrings.SAVE}
                                    </Button>
                                    <Button
                                        variant="contained"
                                        className='btn-secondary btn-margin-bottom'
                                        size="small"
                                        href="/"
                                    >
                                        {commonStrings.CANCEL}
                                    </Button>
                                </div>
                            </form>
                        </Paper>
                        <Paper className="settings-net settings-net-wrapper" elevation={10}>
                            <h1 className="settings-form-title"> {strings.NETWORK_SETTINGS} </h1>
                            <FormControl component="fieldset">
                                <FormControlLabel
                                    control={<Switch checked={user.enableEmailNotifications} onChange={this.handleEmailNotificationsChange} />}
                                    label={strings.SETTINGS_EMAIL_NOTIFICATIONS}
                                />
                            </FormControl>
                        </Paper>
                    </div>}
                {loading && <Backdrop text={commonStrings.PLEASE_WAIT} />}
                {error && <Error message={commonStrings.GENERIC_ERROR} style={{ marginTop: '25px' }} />}
            </Master>
        );
    }
}