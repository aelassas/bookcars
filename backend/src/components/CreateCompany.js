import React, { Component } from 'react';
import Master from '../elements/Master';
import Env from '../config/env.config';
import { strings as commonStrings } from '../lang/common';
import { strings } from '../lang/create-company';
import UserService from '../services/UserService';
import CompanyService from '../services/CompanyService';
import Error from '../elements/Error';
import Backdrop from '../elements/SimpleBackdrop';
import { Avatar } from '../elements/Avatar';
import {
    Input,
    InputLabel,
    FormControl,
    FormHelperText,
    Button,
    Paper
} from '@mui/material';
import { Info as InfoIcon } from '@mui/icons-material';
import validator from 'validator';
import { toast } from 'react-toastify';

import '../assets/css/create-company.css';

export default class CreateCompany extends Component {

    constructor(props) {
        super(props);
        this.state = {
            language: Env.DEFAULT_LANGUAGE,
            fullName: '',
            email: '',
            phone: '',
            location: '',
            bio: '',
            error: false,
            emailError: false,
            visible: false,
            loading: false,
            fullNameError: false,
            avatar: null,
            avatarError: false,
            emailValid: true
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
        if (fullName) {
            try {
                const status = await CompanyService.validate({ fullName });

                if (status === 200) {
                    this.setState({ fullNameError: false });
                    return true;
                } else {
                    this.setState({ fullNameError: true });
                    return false;
                }
            }
            catch (err) {
                toast(commonStrings.GENERIC_ERROR, { type: 'error' });
                this.setState({ fullNameError: false });
                return false;
            }
        } else {
            this.setState({ fullNameError: false });
            return false;
        }
    };

    handleFullNameOnBlur = async (e) => {
        await this.validateFullName(e.target.value);
    };

    handleOnChangeEmail = (e) => {
        this.setState({
            email: e.target.value,
        });

        if (!e.target.value) {
            this.setState({ emailError: false, emailValid: true });
        }
    };

    validateEmail = async (email) => {
        if (email) {
            if (validator.isEmail(email)) {
                try {
                    const status = await UserService.validateEmail({ email });

                    if (status === 200) {
                        this.setState({ emailError: false, emailValid: true });
                        return true;
                    } else {
                        this.setState({ emailError: true, emailValid: true });
                        return false;
                    }
                }
                catch (err) {
                    toast(commonStrings.GENERIC_ERROR, { type: 'error' });
                    this.setState({ emailError: false, emailValid: true });
                    return false;
                }
            } else {
                this.setState({ emailError: false, emailValid: false });
                return false;
            }
        } else {
            this.setState({ emailError: false, emailValid: true });
            return false;
        }
    };

    handleEmailOnBlur = async (e) => {
        await this.validateEmail(e.target.value);
    };

    handleOnChangePhone = (e) => {
        this.setState({
            phone: e.target.value,
        });
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

    handleMouseDownPassword = (event) => {
        event.preventDefault();
    };

    handleMouseDownConfirmPassword = (event) => {
        event.preventDefault();
    };

    preventDefault = (event) => event.preventDefault();

    handleSubmit = async (e) => {
        e.preventDefault();

        const { email, fullName } = this.state;

        const emailValid = await this.validateEmail(email);
        if (!emailValid) {
            return;
        }

        const fullNameValid = await this.validateFullName(fullName);
        if (!fullNameValid) {
            return;
        }

        if (!this.state.avatar) {
            this.setState({
                avatarError: true,
                passwordsDontMatch: false,
                passwordError: false,
                error: false
            });
            return;
        }

        try {
            const status = await UserService.validateEmail({ email });
            if (status === 204) {
                this.setState({ emailError: true });
                return;
            }

            this.setState({ emailError: false, loading: true });

            const data = {
                email: this.state.email,
                phone: this.state.phone,
                location: this.state.location,
                bio: this.state.bio,
                fullName: this.state.fullName,
                language: UserService.getLanguage(),
                type: Env.RECORD_TYPE.COMPANY,
                avatar: this.state.avatar
            };

            UserService.create(data)
                .then(status => {
                    if (status === 200) {
                        window.location = '/companies';
                    } else
                        this.setState({
                            error: true,
                            passwordError: false,
                            passwordsDontMatch: false,
                            loading: false
                        });
                }).catch(() => {
                    this.setState({
                        error: true,
                        passwordError: false,
                        passwordsDontMatch: false,
                        loading: false
                    });
                });
        } catch (err) {
            toast(commonStrings.GENERIC_ERROR, { type: 'error' });
        }
    };

    handleChange = (e) => {
        e.preventDefault();
    };

    onBeforeUpload = () => {
        this.setState({ loading: true });
    };

    onAvatarChange = (avatar) => {
        this.setState({ loading: false, avatar });
        if (avatar !== null) {
            this.setState({ avatarError: false });
        }
    };

    handleCancel = () => {
        const { avatar } = this.state;

        if (avatar) {
            this.setState({ loading: true });

            UserService.deleteTempAvatar(avatar)
                .then(() => {
                    window.location.href = '/companies';
                })
                .catch(() => {
                    window.location.href = '/companies';
                });
        } else {
            window.location.href = '/companies';
        }
    };

    onLoad = (user) => {
        this.setState({ language: user.language, visible: true });
    }

    componentDidMount() {
    }

    render() {
        const {
            error,
            passwordError,
            passwordsDontMatch,
            emailError,
            fullNameError,
            avatarError,
            visible,
            loading,
            emailValid } = this.state;

        return (
            <Master onLoad={this.onLoad} strict={true} admin={true}>
                <div className='create-company'>
                    <Paper className="company-form company-form-wrapper" elevation={10} style={visible ? null : { display: 'none' }}>
                        <h1 className="company-form-title"> {strings.CREATE_COMPANY_HEADING} </h1>
                        <form onSubmit={this.handleSubmit}>
                            <Avatar
                                type={Env.RECORD_TYPE.COMPANY}
                                mode='create'
                                record={null}
                                size='large'
                                readonly={false}
                                onBeforeUpload={this.onBeforeUpload}
                                onChange={this.onAvatarChange}
                                color='disabled'
                                className='avatar-ctn'
                            />

                            <div className='info'>
                                <InfoIcon />
                                <label>
                                    {strings.RECOMMENDED_IMAGE_SIZE}
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
                                />
                                <FormHelperText error={fullNameError}>
                                    {(fullNameError && strings.INVALID_COMPANY_NAME) || ''}
                                </FormHelperText>
                            </FormControl>

                            <FormControl fullWidth margin="dense">
                                <InputLabel className='required'>{commonStrings.EMAIL}</InputLabel>
                                <Input
                                    id="email"
                                    type="text"
                                    error={!emailValid || emailError}
                                    onBlur={this.handleEmailOnBlur}
                                    onChange={this.handleOnChangeEmail}
                                    autoComplete="off"
                                    required
                                />
                                <FormHelperText error={!emailValid || emailError}>
                                    {(!emailValid && commonStrings.EMAIL_NOT_VALID) || ''}
                                    {(emailError && commonStrings.EMAIL_ALREADY_REGISTERED) || ''}
                                </FormHelperText>
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
                                    onChange={this.handleOnChangePhone}
                                    inputProps={{
                                        autoComplete: 'new-phone',
                                        form: {
                                            autoComplete: 'off',
                                        },
                                    }}
                                />
                            </FormControl>

                            <FormControl fullWidth margin="dense">
                                <InputLabel>{commonStrings.LOCATION}</InputLabel>
                                <Input
                                    id="location"
                                    type="text"
                                    onChange={this.handleOnChangeLocation}
                                    autoComplete="off"
                                />
                            </FormControl>

                            <FormControl fullWidth margin="dense">
                                <InputLabel>{commonStrings.BIO}</InputLabel>
                                <Input
                                    id="bio"
                                    type="text"
                                    onChange={this.handleOnChangeBio}
                                    autoComplete="off"
                                />
                            </FormControl>

                            <div className="buttons">
                                <Button
                                    type="submit"
                                    variant="contained"
                                    className='btn-primary btn-margin-bottom'
                                    size="small"
                                >
                                    {commonStrings.CREATE}
                                </Button>
                                <Button
                                    variant="contained"
                                    className='btn-secondary btn-margin-bottom'
                                    size="small"
                                    onClick={this.handleCancel}
                                >
                                    {commonStrings.CANCEL}
                                </Button>
                            </div>

                            <div className="form-error">
                                {passwordError && <Error message={commonStrings.ERROR_IN_PASSWORD} />}
                                {passwordsDontMatch && <Error message={commonStrings.PASSWORDS_DONT_MATCH} />}
                                {error && <Error message={commonStrings.GENERIC_ERROR} />}
                                {avatarError && <Error message={commonStrings.IMAGE_REQUIRED} />}
                            </div>
                        </form>

                    </Paper>
                </div>
                {loading && <Backdrop text={commonStrings.PLEASE_WAIT} />}
            </Master>
        );
    }
}