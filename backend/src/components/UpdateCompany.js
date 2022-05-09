import React, { Component } from 'react';
import Master from '../elements/Master';
import Env from '../config/env.config';
import { strings as commonStrings } from '../lang/common';
import { strings as ccStrings } from '../lang/create-company';
import CompanyService from '../services/CompanyService';
import Error from '../elements/Error';
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
            noMatch: false,
            avatar: null,
            avatarError: false,
            avatarSizeError: false
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

        if (!this.state.avatar) {
            this.setState({
                avatarError: true,
                avatarSizeError: false,
                error: false
            });
            return;
        }

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
                    toast(commonStrings.UPDATED, { type: 'info' });
                } else {
                    toast(commonStrings.GENERIC_ERROR, { type: 'error' });
                }
            })
            .catch(_ => {
                toast(commonStrings.GENERIC_ERROR, { type: 'error' });
            });
    };

    handleChange = (e) => {
        e.preventDefault();
    };

    onBeforeUpload = () => {
        this.setState({ isLoading: true });
    };

    onAvatarChange = (company) => {
        if (company.avatar) {
            this.setState({ avatarError: false });
        }
        this.setState({ avatar: company.avatar, isLoading: false });
    };

    onAvatarValidate = (valid) => {
        if (!valid) {
            this.setState({
                avatarSizeError: true,
                avatarError: false,
                passwordsDontMatch: false,
                passwordError: false,
                error: false,
                isLoading: false,
            });
        } else {
            this.setState({
                avatarSizeError: false,
                avatarError: false,
                passwordsDontMatch: false,
                passwordError: false,
                error: false,
            });
        }
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
                                    avatar: company.avatar,
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
            noMatch,
            avatarError,
            avatarSizeError
        } = this.state;

        return (
            <Master onLoad={this.onLoad} strict={true} admin={true}>
                {visible &&
                    <div className='update-company'>
                        <Paper className="company-form-update company-form-wrapper" elevation={10}>
                            <form onSubmit={this.handleSubmit}>
                                <Avatar
                                    type={Env.RECORD_TYPE.COMPANY}
                                    mode='update'
                                    record={company}
                                    size='large'
                                    readonly={false}
                                    hideDelete={true}
                                    onBeforeUpload={this.onBeforeUpload}
                                    onChange={this.onAvatarChange}
                                    onValidate={this.onAvatarValidate}
                                    color='disabled'
                                    className='avatar-ctn'
                                    width={Env.COMPANY_IMAGE_WIDTH}
                                    height={Env.COMPANY_IMAGE_HEIGHT} />
                                <FormControl fullWidth margin="dense">
                                    <InputLabel className='required'>{commonStrings.FULL_NAME}</InputLabel>
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
                                        {fullNameError ? commonStrings.INVALID_COMPANY_NAME : ''}
                                    </FormHelperText>
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
                                        href={`/reset-password?u=${company._id}`}
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
                                        href="/companies"
                                    >
                                        {commonStrings.CANCEL}
                                    </Button>
                                </div>

                                <div className="form-error">
                                    {(error || avatarError || avatarSizeError) ?
                                        <div>
                                            {error && <Error message={commonStrings.GENERIC_ERROR} />}
                                            {avatarError && <Error message={commonStrings.IMAGE_REQUIRED} />}
                                            {avatarSizeError && <Error message={ccStrings.COMPANY_IMAGE_SIZE_ERROR} />}
                                        </div>
                                        : null}
                                </div>
                            </form>
                        </Paper>
                    </div>}
                {isLoading && <Backdrop text={commonStrings.PLEASE_WAIT} />}
                {noMatch && <NoMatch />}
            </Master>
        );
    }
}