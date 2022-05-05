import React, { Component } from 'react';
import Master from '../elements/Master';
import Env from '../config/env.config';
import { strings } from '../config/app.config';
import CompanyService from '../services/CompanyService';
import Error from './Error';
import Backdrop from '../elements/SimpleBackdrop';
import { toast } from 'react-toastify';
import NoMatch from './NoMatch';
import { Avatar } from '../elements/Avatar';
import {
    Input,
    InputLabel,
    FormControl,
    FormHelperText,
    Button,
    Paper
} from '@mui/material';

import '../assets/css/create-company.css';
import '../assets/css/update-company.css';

export default class UpdateCompany extends Component {

    constructor(props) {
        super(props);
        this.state = {
            company: null,
            fullName: '',
            phone: '',
            location: '',
            bio: '',
            error: false,
            visible: false,
            isLoading: false,
            fullNameError: false,
            noMatch: false
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

    preventDefault = (event) => event.preventDefault();

    handleSubmit = e => {
        e.preventDefault();

        const { company, fullName, phone, location, bio } = this.state;

        const data = {
            _id: company._id,
            fullName,
            phone,
            location,
            bio
        };

        CompanyService.update(data)
            .then(status => {
                if (status === 200) {
                    toast(strings.UPDATED, { type: 'info' });
                } else {
                    toast(strings.GENERIC_ERROR, { type: 'error' });
                }
            })
            .catch(_ => {
                toast(strings.GENERIC_ERROR, { type: 'error' });
            });
    };

    handleChange = (e) => {
        e.preventDefault();
    };

    onBeforeUpload = () => {
        this.setState({ isLoading: true });
    };

    onAvatarChange = _ => {
        this.setState({ isLoading: false });
    };

    onLoad = (user) => {
        this.setState({ isLoading: true }, _ => {
            const params = new URLSearchParams(window.location.search);
            if (params.has('c')) {
                const id = params.get('c');
                if (id && id !== '') {
                    CompanyService.getCompany(id)
                        .then(company => {
                            if (company) {
                                this.setState({
                                    company,
                                    fullName: company.fullName,
                                    phone: company.phone,
                                    location: company.location,
                                    bio: company.bio,
                                    isLoading: false,
                                    visible: true
                                });
                            } else {
                                this.setState({ isLoading: false, noMatch: true });
                            }
                        })
                        .catch(_ => {
                            this.setState({ isLoading: false, error: true, visible: false });
                        });
                } else {
                    this.setState({ isLoading: false, noMatch: true });
                }
            } else {
                this.setState({ isLoading: false, noMatch: true });
            }
        });
    }

    componentDidMount() {
    }

    render() {
        const {
            company,
            fullName,
            phone,
            location,
            bio,
            error,
            fullNameError,
            visible,
            isLoading,
            noMatch
        } = this.state;

        return (
            <Master onLoad={this.onLoad} strict={true} admin={true}>
                {visible &&
                    <div className='update-company'>
                        <Paper className="company-form-update company-form-wrapper" elevation={10}>
                            <form onSubmit={this.handleSubmit}>
                                <Avatar
                                    type={Env.USER_TYPE.COMPANY}
                                    mode='update'
                                    user={company}
                                    size='large'
                                    readonly={false}
                                    onBeforeUpload={this.onBeforeUpload}
                                    onChange={this.onAvatarChange}
                                    color='disabled'
                                    className='avatar-ctn' />
                                <FormControl fullWidth margin="dense">
                                    <InputLabel className='required'>{strings.FULL_NAME}</InputLabel>
                                    <Input
                                        id="full-name"
                                        type="text"
                                        error={fullNameError}
                                        required
                                        onBlur={this.handleFullNameOnBlur}
                                        onChange={this.handleOnChangeFullName}
                                        autoComplete="off"
                                        value={fullName}
                                    />
                                    <FormHelperText error={fullNameError}>
                                        {fullNameError ? strings.INVALID_FULL_NAME : ''}
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
                                        value={phone}
                                    />
                                </FormControl>
                                <FormControl fullWidth margin="dense">
                                    <InputLabel>{strings.LOCATION}</InputLabel>
                                    <Input
                                        id="location"
                                        type="text"
                                        onChange={this.handleOnChangeLocation}
                                        autoComplete="off"
                                        value={location}
                                    />
                                </FormControl>
                                <FormControl fullWidth margin="dense">
                                    <InputLabel>{strings.BIO}</InputLabel>
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
                                        href={`/reset-password?u=${company._id}`}
                                    >
                                        {strings.RESET_PASSWORD}
                                    </Button>
                                    <Button
                                        type="submit"
                                        variant="contained"
                                        className='btn-primary btn-margin-bottom'
                                        size="small"
                                    >
                                        {strings.SAVE}
                                    </Button>
                                    <Button
                                        variant="contained"
                                        className='btn-secondary btn-margin-bottom'
                                        size="small"
                                        href="/companies"
                                    >
                                        {strings.CANCEL}
                                    </Button>
                                </div>
                            </form>
                        </Paper>
                    </div>}
                {isLoading && <Backdrop text={strings.PLEASE_WAIT} />}
                {error && <Error />}
                {noMatch && <NoMatch />}
            </Master>
        );
    }
}