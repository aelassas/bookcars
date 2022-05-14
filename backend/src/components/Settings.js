import React, { Component } from 'react';
import Master from '../elements/Master';
import { strings as commonStrings } from '../lang/common';
import { strings } from '../lang/settings';
import UserService from '../services/UserService';
import Error from '../elements/Error';
import Backdrop from '../elements/SimpleBackdrop';
import { toast } from 'react-toastify';
import { Avatar } from '../elements/Avatar';
import {
    Input,
    InputLabel,
    FormControl,
    FormControlLabel,
    Switch,
    Button,
    Paper
} from '@mui/material';

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
            isLoading: false
        };
    }

    handleOnChangeFullName = e => {
        this.setState({
            fullName: e.target.value,
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

    preventDefault = (event) => event.preventDefault();

    handleSubmit = e => {
        e.preventDefault();

        const { user, fullName, phone, location, bio } = this.state;

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
                toast(commonStrings.GENERIC_ERROR, { type: 'error' });
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
                toast(commonStrings.GENERIC_ERROR, { type: 'error' });
            });
    };

    handleChange = (e) => {
        e.preventDefault();
    };

    onBeforeUpload = () => {
        this.setState({ isLoading: true });
    };

    onAvatarChange = (user) => {
        this.setState({ isLoading: false, user });
    };

    onLoad = (user) => {
        this.setState({
            user,
            fullName: user.fullName,
            phone: user.phone,
            location: user.location,
            bio: user.bio,
            isLoading: false,
            visible: true
        });
    };

    onError = () => {
        this.setState({ isLoading: false });
    }

    componentDidMount() {
        this.setState({ isLoading: true });
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
            isLoading
        } = this.state;

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
                                        onChange={this.handleOnChangePhone}
                                        inputProps={{
                                            autoComplete: 'new-phone',
                                            form: {
                                                autoComplete: 'off',
                                            },
                                        }}
                                        value={phone}
                                    />
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
                                        href={`/reset-password?u=${user._id}`}
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
                {isLoading && <Backdrop text={commonStrings.PLEASE_WAIT} />}
                {error && <Error message={commonStrings.GENERIC_ERROR} style={{ marginTop: '25px' }} />}
            </Master>
        );
    }
}