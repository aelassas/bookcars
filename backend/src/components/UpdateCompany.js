import React, { Component } from 'react';
import Master from '../elements/Master';
import Env from '../config/env.config';
import { strings as commonStrings } from '../lang/common';
import { strings as ccStrings } from '../lang/create-company';
import CompanyService from '../services/CompanyService';
import UserService from '../services/UserService';
import Helper from '../common/Helper';
import Error from '../elements/Error';
import Backdrop from '../elements/SimpleBackdrop';
import NoMatch from './NoMatch';
import { Avatar } from '../elements/Avatar';
import {
    Input,
    InputLabel,
    FormControl,
    FormHelperText,
    Button,
    Paper,
    Link
} from '@mui/material';
import { Info as InfoIcon } from '@mui/icons-material';
import validator from 'validator';

import '../assets/css/update-company.css';

export default class UpdateCompany extends Component {

    constructor(props) {
        super(props);
        this.state = {
            user: null,
            company: null,
            fullName: '',
            phone: '',
            location: '',
            bio: '',
            error: false,
            visible: false,
            loading: false,
            fullNameError: false,
            noMatch: false,
            avatar: null,
            avatarError: false,
            email: '',
            phoneValid: true
        };
    }

    handleOnChangeFullName = (e) => {
        this.setState({
            fullName: e.target.value,
        });

        if (!e.target.value) {
            this.setState({ fullNameError: false });
        }
    };

    validateFullName = async (fullName) => {
        const { company } = this.state;

        if (fullName) {
            if (company.fullName !== fullName) {
                try {
                    const status = await CompanyService.validate({ fullName });

                    if (status === 200) {
                        this.setState({ fullNameError: false });
                        return true;
                    } else {
                        this.setState({ fullNameError: true, avatarError: false, error: false });
                        return false;
                    }
                }
                catch (err) {
                    UserService.signout();
                }
            } else {
                this.setState({ fullNameError: false, avatarError: false, error: false });
                return true;
            }
        } else {
            this.setState({ fullNameError: false, avatarError: false, error: false });
            return false;
        }
    };

    handleFullNameOnBlur = async (e) => {
        await this.validateFullName(e.target.value);
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

    handleOnChangeLocation = (e) => {
        this.setState({
            location: e.target.value,
        });
    };

    handleOnChangeBio = (e) => {
        this.setState({
            bio: e.target.value,
        });
    };

    onBeforeUpload = () => {
        this.setState({ loading: true });
    };

    onAvatarChange = (avatar) => {
        const { user, company } = this.state;
        const _company = Helper.clone(company);
        _company.avatar = avatar;
        if (user._id === company._id) {
            const _user = Helper.clone(user);
            _user.avatar = avatar;
            this.setState({ user: _user });
        }
        this.setState({ loading: false, company: _company });

        if (avatar) {
            this.setState({ avatarError: false });
        }
    };

    handleResendActivationLink = () => {
        const { company } = this.state;

        UserService.resend(company.email, false, Env.APP_TYPE)
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

    handleSubmit = async (e) => {
        e.preventDefault();

        const { fullName, phone } = this.state;

        const fullNameValid = await this.validateFullName(fullName);
        if (!fullNameValid) {
            return;
        }

        const phoneValid = this.validatePhone(phone);
        if (!phoneValid) {
            return;
        }

        if (!this.state.avatar) {
            this.setState({
                avatarError: true,
                error: false
            });
            return;
        }

        const { company, location, bio } = this.state;

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
                    company.fullName = fullName;
                    this.setState({ company });
                    Helper.info(commonStrings.UPDATED);
                } else {
                    Helper.error();
                }
            })
            .catch(() => {
                UserService.signout();
            });
    };

    onLoad = (user) => {
        this.setState({ user, loading: true }, () => {
            const params = new URLSearchParams(window.location.search);
            if (params.has('c')) {
                const id = params.get('c');
                if (id && id !== '') {
                    CompanyService.getCompany(id)
                        .then(company => {
                            if (company) {
                                this.setState({
                                    company,
                                    email: company.email,
                                    avatar: company.avatar,
                                    fullName: company.fullName,
                                    phone: company.phone,
                                    location: company.location,
                                    bio: company.bio,
                                    loading: false,
                                    visible: true
                                });
                            } else {
                                this.setState({ loading: false, noMatch: true });
                            }
                        })
                        .catch(() => {
                            this.setState({ loading: false, error: true, visible: false });
                        });
                } else {
                    this.setState({ loading: false, noMatch: true });
                }
            } else {
                this.setState({ loading: false, noMatch: true });
            }
        });
    }

    componentDidMount() {
    }

    render() {
        const {
            user,
            company,
            email,
            fullName,
            phone,
            location,
            bio,
            error,
            fullNameError,
            visible,
            loading,
            noMatch,
            avatarError,
            phoneValid
        } = this.state, admin = Helper.admin(user);

        return (
            <Master onLoad={this.onLoad} strict={true} user={user}>
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
                                    color='disabled'
                                    className='avatar-ctn'
                                />

                                <div className='info'>
                                    <InfoIcon />
                                    <label>
                                        {ccStrings.RECOMMENDED_IMAGE_SIZE}
                                    </label>
                                </div>

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
                                        {(fullNameError && ccStrings.INVALID_COMPANY_NAME) || ''}
                                    </FormHelperText>
                                </FormControl>

                                <FormControl fullWidth margin="dense">
                                    <InputLabel className='required'>{commonStrings.EMAIL}</InputLabel>
                                    <Input
                                        id="email"
                                        type="text"
                                        value={email}
                                        disabled
                                    />
                                </FormControl>

                                <div className='info'>
                                    <InfoIcon />
                                    <label>{commonStrings.OPTIONAL}</label>
                                </div>

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
                                {admin &&
                                    <FormControl fullWidth margin="dense" className='resend-activation-link'>
                                        <Link onClick={this.handleResendActivationLink}>{commonStrings.RESEND_ACTIVATION_LINK}</Link>
                                    </FormControl>
                                }
                                <div className="buttons">
                                    <Button
                                        type="submit"
                                        variant="contained"
                                        className='btn-primary btn-margin btn-margin-bottom'
                                        size="small"
                                        href={`/change-password?u=${company._id}`}
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
                                    {error && <Error message={commonStrings.GENERIC_ERROR} />}
                                    {avatarError && <Error message={commonStrings.IMAGE_REQUIRED} />}
                                </div>
                            </form>
                        </Paper>
                    </div>}
                {loading && <Backdrop text={commonStrings.PLEASE_WAIT} />}
                {noMatch && <NoMatch hideHeader />}
            </Master>
        );
    }
}