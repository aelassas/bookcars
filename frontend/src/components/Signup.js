import React, { Component } from 'react';
import Env from '../config/env.config';
import { strings as commonStrings } from '../lang/common';
import { strings } from '../lang/sign-up';
import UserService from '../services/UserService';
import Master from '../elements/Master';
import ReCAPTCHA from 'react-google-recaptcha';
import Error from '../elements/Error';
import Backdrop from '../elements/SimpleBackdrop';
import DatePicker from '../elements/DatePicker';
import {
    OutlinedInput,
    InputLabel,
    FormControl,
    FormHelperText,
    Button,
    Paper,
    Checkbox,
    Link
} from '@mui/material';
import validator from 'validator';
import { intervalToDuration } from 'date-fns';
import Helper from '../common/Helper';

import '../assets/css/signup.css';

export default class SignUp extends Component {

    constructor(props) {
        super(props);
        this.state = {
            user: null,
            language: Env.DEFAULT_LANGUAGE,
            fullName: '',
            email: '',
            birthDate: null,
            password: '',
            confirmPassword: '',
            reCaptchaToken: '',
            error: false,
            recaptchaError: false,
            passwordError: false,
            passwordsDontMatch: false,
            emailError: false,
            visible: false,
            loading: false,
            emailValid: true,
            tosChecked: false,
            tosError: false,
            phoneValid: true,
            phone: '',
            birthDateValid: true
        };
    }

    handleOnChangeFullName = (e) => {
        this.setState({
            fullName: e.target.value,
        });
    };

    handleEmailChange = (e) => {
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
                        this.setState({ emailError: true, emailValid: true, error: false });
                        return false;
                    }
                } catch (err) {
                    Helper.error(err);
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

    handleEmailBlur = async (e) => {
        await this.validateEmail(e.target.value);
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

    handlePhoneChange = (e) => {
        this.setState({ phone: e.target.value });

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

    handleOnChangePassword = (e) => {
        this.setState({
            password: e.target.value,
        });
    };

    handleOnChangeConfirmPassword = (e) => {
        this.setState({
            confirmPassword: e.target.value,
        });
    };

    handleOnRecaptchaVerify = (token) => {
        this.setState({ reCaptchaToken: token, recaptchaError: !token });
    };

    handleMouseDownPassword = (event) => {
        event.preventDefault();
    };

    handleMouseDownConfirmPassword = (event) => {
        event.preventDefault();
    };

    handleTosChange = (event) => {
        this.setState({ tosChecked: event.target.checked });

        if (event.target.checked) {
            this.setState({ tosError: false });
        }
    };

    handleSubmit = async (e) => {
        e.preventDefault();

        const { email, phone, birthDate } = this.state;

        const emailValid = await this.validateEmail(email);
        if (!emailValid) {
            return;
        }

        const phoneValid = this.validatePhone(phone);
        if (!phoneValid) {
            return;
        }

        const birthDateValid = this.validateBirthDate(birthDate);
        if (!birthDateValid) {
            return;
        }

        if (this.state.password.length < 6) {
            this.setState({
                passwordError: true,
                recaptchaError: false,
                passwordsDontMatch: false,
                error: false,
                register: false,
                tosError: false
            });
            return;
        }

        if (this.state.password !== this.state.confirmPassword) {
            this.setState({
                passwordsDontMatch: true,
                recaptchaError: false,
                passwordError: false,
                error: false,
                register: false,
                tosError: false
            });
            return;
        }

        if (!this.state.reCaptchaToken) {
            this.setState({
                recaptchaError: true,
                passwordsDontMatch: false,
                passwordError: false,
                error: false,
                register: false,
                tosError: false
            });
            return;
        }

        if (!this.state.tosChecked) {
            this.setState({
                tosError: true,
                recaptchaError: false,
                passwordsDontMatch: false,
                passwordError: false,
                error: false,
                register: false
            });
            return;
        }

        this.setState({ loading: true });

        const data = {
            email: this.state.email,
            phone: this.state.phone,
            password: this.state.password,
            fullName: this.state.fullName,
            birthDate: this.state.birthDate,
            language: UserService.getLanguage()
        };

        UserService.signup(data)
            .then(status => {
                if (status === 200) {
                    UserService.signin({ email: this.state.email, password: this.state.password })
                        .then(signInResult => {
                            if (signInResult.status === 200) {
                                window.location.href = '/' + window.location.search;
                            } else {
                                this.setState({
                                    error: true,
                                    passwordError: false,
                                    passwordsDontMatch: false,
                                    register: false,
                                    loading: false,
                                    recaptchaError: false
                                });
                            }
                        }).catch(err => {
                            this.setState({
                                error: true,
                                passwordError: false,
                                passwordsDontMatch: false,
                                register: false,
                                loading: false,
                                recaptchaError: false
                            });
                        });
                } else
                    this.setState({
                        error: true,
                        passwordError: false,
                        passwordsDontMatch: false,
                        register: false,
                        loading: false,
                        recaptchaError: false
                    });
            })
            .catch(err => {
                this.setState({
                    error: true,
                    passwordError: false,
                    passwordsDontMatch: false,
                    register: false,
                    loading: false,
                    recaptchaError: false
                });
            });

    };

    handleChange = (e) => {
        e.preventDefault();
    };

    onLoad = (user) => {
        if (user) {
            window.location.href = '/';
        } else {
            this.setState({ visible: true, language: UserService.getLanguage() });
        }
    };

    render() {
        const {
            error,
            language,
            passwordError,
            passwordsDontMatch,
            emailError,
            recaptchaError,
            visible,
            loading,
            emailValid,
            birthDate,
            tosChecked,
            tosError,
            phoneValid,
            birthDateValid
        } = this.state;


        return (
            <Master strict={false} onLoad={this.onLoad}>
                {visible &&
                    <div className="signup">
                        <Paper className="signup-form" elevation={10}>
                            <h1 className="signup-form-title"> {strings.SIGN_UP_HEADING} </h1>
                            <form onSubmit={this.handleSubmit}>
                                <div>
                                    <FormControl fullWidth margin="dense">
                                        <InputLabel className='required'>{commonStrings.FULL_NAME}</InputLabel>
                                        <OutlinedInput
                                            type="text"
                                            label={commonStrings.FULL_NAME}
                                            value={this.state.fullName}
                                            required
                                            onChange={this.handleOnChangeFullName}
                                            autoComplete="off"
                                        />
                                    </FormControl>
                                    <FormControl fullWidth margin="dense">
                                        <InputLabel className='required'>{commonStrings.EMAIL}</InputLabel>
                                        <OutlinedInput
                                            type="text"
                                            label={commonStrings.EMAIL}
                                            error={!emailValid || emailError}
                                            value={this.state.email}
                                            onBlur={this.handleEmailBlur}
                                            onChange={this.handleEmailChange}
                                            required
                                            autoComplete="off"
                                        />
                                        <FormHelperText error={!emailValid || emailError}>
                                            {(!emailValid && commonStrings.EMAIL_NOT_VALID) || ''}
                                            {(emailError && commonStrings.EMAIL_ALREADY_REGISTERED) || ''}
                                        </FormHelperText>
                                    </FormControl>
                                    <FormControl fullWidth margin="dense">
                                        <InputLabel className='required'>{commonStrings.PHONE}</InputLabel>
                                        <OutlinedInput
                                            type="text"
                                            label={commonStrings.PHONE}
                                            error={!phoneValid}
                                            value={this.state.phone}
                                            onBlur={this.handlePhoneBlur}
                                            onChange={this.handlePhoneChange}
                                            required
                                            autoComplete="off"
                                        />
                                        <FormHelperText error={!phoneValid}>
                                            {(!phoneValid && commonStrings.PHONE_NOT_VALID) || ''}
                                        </FormHelperText>
                                    </FormControl>
                                    <FormControl fullWidth margin="dense">
                                        <DatePicker
                                            label={commonStrings.BIRTH_DATE}
                                            value={birthDate}
                                            variant='outlined'
                                            error={!birthDateValid}
                                            required
                                            onChange={(birthDate) => {
                                                const birthDateValid = this.validateBirthDate(birthDate);

                                                this.setState({ birthDate, birthDateValid });
                                            }}
                                            language={language}
                                        />
                                        <FormHelperText error={!birthDateValid}>
                                            {(!birthDateValid && commonStrings.BIRTH_DATE_NOT_VALID) || ''}
                                        </FormHelperText>
                                    </FormControl>
                                    <FormControl fullWidth margin="dense">
                                        <InputLabel className='required'>{commonStrings.PASSWORD}</InputLabel>
                                        <OutlinedInput
                                            label={commonStrings.PASSWORD}
                                            value={this.state.password}
                                            onChange={this.handleOnChangePassword}
                                            required
                                            type="password"
                                            inputProps={{
                                                autoComplete: 'new-password',
                                                form: {
                                                    autoComplete: 'off',
                                                },
                                            }}
                                        />
                                    </FormControl>
                                    <FormControl fullWidth margin="dense">
                                        <InputLabel className='required'>{commonStrings.CONFIRM_PASSWORD}</InputLabel>
                                        <OutlinedInput
                                            label={commonStrings.CONFIRM_PASSWORD}
                                            value={this.state.confirmPassword}
                                            onChange={this.handleOnChangeConfirmPassword}
                                            required
                                            type="password"
                                            inputProps={{
                                                autoComplete: 'new-password',
                                                form: {
                                                    autoComplete: 'off',
                                                },
                                            }}
                                        />
                                    </FormControl>
                                    <div className="recaptcha">
                                        <ReCAPTCHA
                                            sitekey={Env.RECAPTCHA_SITE_KEY}
                                            hl={language}
                                            onChange={this.handleOnRecaptchaVerify}
                                        />
                                    </div>
                                    <div className="signup-tos">
                                        <table>
                                            <tbody>
                                                <tr>
                                                    <td>
                                                        <Checkbox
                                                            checked={tosChecked}
                                                            onChange={this.handleTosChange}
                                                            color="primary"
                                                        />
                                                    </td>
                                                    <td>
                                                        <Link href="/tos" target="_blank" rel="noreferrer">{commonStrings.TOS}</Link>
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="buttons">
                                        <Button
                                            type="submit"
                                            variant="contained"
                                            className='btn-primary btn-margin-bottom'
                                            size="small"
                                        >
                                            {strings.SIGN_UP}
                                        </Button>
                                        <Button
                                            variant="contained"
                                            className='btn-secondary btn-margin-bottom'
                                            size="small"
                                            href="/"> {commonStrings.CANCEL}
                                        </Button>
                                    </div>
                                </div>
                                <div className="form-error">
                                    {passwordError && <Error message={commonStrings.PASSWORD_ERROR} />}
                                    {passwordsDontMatch && <Error message={commonStrings.PASSWORDS_DONT_MATCH} />}
                                    {recaptchaError && <Error message={commonStrings.RECAPTCHA_ERROR} />}
                                    {tosError && <Error message={commonStrings.TOS_ERROR} />}
                                    {error && <Error message={strings.SIGN_UP_ERROR} />}
                                </div>
                            </form>
                        </Paper>
                    </div>}
                {loading && <Backdrop text={commonStrings.PLEASE_WAIT} />}
            </Master>
        );
    }
}