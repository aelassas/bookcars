import React, { Component } from 'react';
import Master from '../elements/Master';
import { strings as commonStrings } from '../lang/common';
import { strings } from '../lang/settings';
import UserService from '../services/UserService';
import Helper from '../common/Helper';
import Error from '../elements/Error';
import Backdrop from '../elements/SimpleBackdrop';
import { toast } from 'react-toastify';
import { Avatar } from '../elements/Avatar';
import {
    Input,
    InputLabel,
    FormControl,
    FormControlLabel,
    FormHelperText,
    Switch,
    Button,
    Paper
} from '@mui/material';
import validator from 'validator';

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
            phoneValid: true
        };
    }

    handleOnChangeFullName = e => {
        this.setState({
            fullName: e.target.value,
        });
    };

    handlePhoneChange = (e) => {
        this.setState({ phone: e.target.value });

        if (!e.target.value) {
            this.setState({ phoneValid: true });
        }
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

    handlePhoneBlur = (e) => {
        this.validatePhone(e.target.value);
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

    handleSubmit = e => {
        e.preventDefault();

        const { phone } = this.state;

        const phoneValid = this.validatePhone(phone);
        if (!phoneValid) {
            return;
        }

        const { user, fullName, location, bio } = this.state;

        const data = {
            _id: user._id,
            fullName,
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

    onAvatarChange = (avatar) => {
        const { user } = this.state;
        user.avatar = avatar;
        this.setState({ loading: false, user });
    };

    onLoad = (user) => {
        this.setState({
            user,
            fullName: user.fullName,
            phone: user.phone || '',
            location: user.location || '',
            bio: user.bio || '',
            loading: false,
            visible: true
        });
    };

    onError = () => {
        this.setState({ loading: false });
    }

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
            phoneValid
        } = this.state, admin = Helper.admin(user);

        return (
            <Master onLoad={this.onLoad} onError={this.onError} strict={true} user={user}>
                {visible &&
                    <div className='settings'>
                        <Paper className="settings-form settings-form-wrapper" elevation={10}>
                            <form onSubmit={this.handleSubmit}>
                                <Avatar
                                    type={user.type}
                                    mode='update'
                                    record={user}
                                    size='large'
                                    readonly={false}
                                    onBeforeUpload={this.onBeforeUpload}
                                    onChange={this.onAvatarChange}
                                    hideDelete={!admin}
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
                                    <InputLabel>{commonStrings.PHONE}</InputLabel>
                                    <Input
                                        id="phone"
                                        type="text"
                                        onChange={this.handlePhoneChange}
                                        onBlur={this.handlePhoneBlur}
                                        autoComplete="off"
                                        value={phone}
                                        error={!phoneValid}
                                    />
                                    <FormHelperText error={!phoneValid}>
                                        {(!phoneValid && commonStrings.PHONE_NOT_VALID) || ''}
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
                                        href={`/change-password?u=${user._id}`}
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
                                    control={<Switch checked={user.enableEmailNotifications} onChange={this.handleEmailNotificationsChange} color="primary" />}
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