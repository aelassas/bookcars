import React, { useState } from 'react';
import Master from '../elements/Master';
import Env from '../config/env.config';
import { strings as commonStrings } from '../lang/common';
import { strings as ccStrings } from '../lang/create-company';
import { strings } from '../lang/create-user';
import * as Helper from '../common/Helper';
import * as UserService from '../services/UserService';
import * as CompanyService from '../services/CompanyService';
import NoMatch from './NoMatch';
import Error from '../elements/Error';
import Backdrop from '../elements/SimpleBackdrop';
import Avatar from '../elements/Avatar';
import DatePicker from '../elements/DatePicker';
import {
    Input,
    InputLabel,
    FormControl,
    FormHelperText,
    Button,
    Paper,
    Select,
    MenuItem,
    Link,
    FormControlLabel,
    Switch
} from '@mui/material';
import { Info as InfoIcon } from '@mui/icons-material';
import { intervalToDuration } from 'date-fns';
import validator from 'validator';

import '../assets/css/update-user.css';

const UpdateUser = () => {
    const [loggedUser, setLoggedUser] = useState();
    const [user, setUser] = useState();
    const [visible, setVisible] = useState(false);
    const [noMatch, setNoMatch] = useState(false);
    const [admin, setAdmin] = useState(false);
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [location, setLocation] = useState('');
    const [bio, setBio] = useState('');
    const [error, setError] = useState(false);
    const [loading, setLoading] = useState(false);
    const [fullNameError, setFullNameError] = useState(false);
    const [avatar, setAvatar] = useState();
    const [avatarError, setAvatarError] = useState(false);
    const [type, setType] = useState('');
    const [birthDate, setBirthDate] = useState();
    const [birthDateValid, setBirthDateValid] = useState(true);
    const [phoneValid, setPhoneValid] = useState(true);
    const [payLater, setPayLater] = useState(true);

    const handleUserTypeChange = async (e) => {
        const type = e.target.value;

        setType(e.target.value);

        if (type === Env.RECORD_TYPE.COMPANY) {
            await validateFullName(fullName)
        } else {
            setFullNameError(false);
        }
    };

    const handleOnChangeFullName = (e) => {
        setFullName(e.target.value);

        if (!e.target.value) {
            setFullNameError(false);
        }
    };


    const validateFullName = async (_fullName) => {
        const __fullName = _fullName || fullName;

        if (__fullName) {
            try {
                const status = await CompanyService.validate({ fullName: __fullName });

                if (status === 200) {
                    setFullNameError(false);
                    setError(false);
                    return true;
                } else {
                    setFullNameError(true);
                    setAvatarError(false);
                    setError(false);
                    return false;
                }
            } catch (err) {
                UserService.signout();
            }
        } else {
            setFullNameError(false);
            return true;
        }
    };

    const handleFullNameOnBlur = async (e) => {
        if (type === Env.RECORD_TYPE.COMPANY) {
            await validateFullName(e.target.value)
        } else {
            setFullNameError(false);
        }
    };

    const handlePhoneChange = (e) => {
        setPhone(e.target.value);

        if (!e.target.value) {
            setPhoneValid(true);
        }
    };

    const validatePhone = (phone) => {
        if (phone) {
            const phoneValid = validator.isMobilePhone(phone);
            setPhoneValid(phoneValid);

            return phoneValid;
        } else {
            setPhoneValid(true);

            return true;
        }
    };

    const handlePhoneBlur = (e) => {
        validatePhone(e.target.value);
    };

    const validateBirthDate = (date) => {
        if (Helper.isDate(date) && type === Env.RECORD_TYPE.USER) {
            const now = new Date();
            const sub = intervalToDuration({ start: date, end: now }).years;
            const birthDateValid = sub >= Env.MINIMUM_AGE;

            setBirthDateValid(birthDateValid);
            return birthDateValid;
        } else {
            setBirthDateValid(true);
            return true;
        }
    };

    const handleOnChangeLocation = (e) => {
        setLocation(e.target.value);
    };

    const handleOnChangeBio = (e) => {
        setBio(e.target.value);
    };


    const onBeforeUpload = () => {
        setLoading(true);
    };

    const onAvatarChange = (avatar) => {
        if (loggedUser._id === user._id) {
            const _loggedUser = Helper.clone(loggedUser);
            _loggedUser.avatar = avatar;

            setLoggedUser(_loggedUser);
        }

        const _user = Helper.clone(user);
        _user.avatar = avatar;

        setLoading(false);
        setUser(_user);
        setAvatar(avatar);

        if (avatar !== null && type === Env.RECORD_TYPE.COMPANY) {
            setAvatarError(false);
        }
    };

    const handleCancel = () => {
        if (avatar) {
            setLoading(true);

            UserService.deleteTempAvatar(avatar)
                .then((status) => {
                    window.location.href = '/users';
                })
                .catch(() => {
                    window.location.href = '/users';
                });
        } else {
            window.location.href = '/users';
        }
    };

    const handleResendActivationLink = () => {
        UserService.resend(email, false, type === Env.RECORD_TYPE.USER ? 'frontend' : 'backend')
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

    const onLoad = (loggedUser) => {
        if (loggedUser && loggedUser.verified) {
            setLoading(true);

            const params = new URLSearchParams(window.location.search);
            if (params.has('u')) {
                const id = params.get('u');
                if (id && id !== '') {
                    UserService.getUser(id)
                        .then(user => {
                            if (user) {
                                setLoggedUser(loggedUser);
                                setUser(user);
                                setAdmin(Helper.admin(loggedUser));
                                setType(user.type);
                                setEmail(user.email);
                                setAvatar(user.avatar);
                                setFullName(user.fullName);
                                setPhone(user.phone);
                                setLocation(user.location || '');
                                setBio(user.bio || '');
                                setBirthDate(user.birthDate ? new Date(user.birthDate) : null);
                                setPayLater(user.payLater);
                                setVisible(true);
                                setLoading(false);
                            } else {
                                setLoading(false);
                                setNoMatch(true);
                            }
                        })
                        .catch((err) => {
                            setLoading(false);
                            setVisible(false);
                            Helper.error(err);
                        });
                } else {
                    setLoading(false);
                    setNoMatch(true);
                }
            } else {
                setLoading(false);
                setNoMatch(true);
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (type === Env.RECORD_TYPE.COMPANY) {
            const fullNameValid = await validateFullName(fullName);

            if (!fullNameValid) {
                return;
            }
        } else {
            setFullNameError(false);
        }

        const phoneValid = validatePhone(phone);
        if (!phoneValid) {
            return;
        }

        const birthDateValid = validateBirthDate(birthDate);
        if (!birthDateValid) {
            return;
        }

        if (type === Env.RECORD_TYPE.COMPANY && !avatar) {
            setAvatarError(true);
            setError(false);
            return;
        }

        const language = UserService.getLanguage();
        const data = {
            _id: user._id,
            phone,
            location,
            bio,
            fullName,
            language,
            type,
            avatar,
            birthDate
        };

        if (type === Env.RECORD_TYPE.COMPANY) data.payLater = payLater;

        UserService.updateUser(data)
            .then(status => {
                if (status === 200) {
                    user.fullName = fullName;
                    user.type = type;
                    setUser(user);
                    Helper.info(commonStrings.UPDATED);
                } else {
                    Helper.error();

                    setError(false);
                }
            }).catch(() => {
                UserService.signout();
            });
    };


    const company = type === Env.RECORD_TYPE.COMPANY;
    const driver = type === Env.RECORD_TYPE.USER;
    const activate = admin
        || (loggedUser && user && loggedUser.type === Env.RECORD_TYPE.COMPANY && user.type === Env.RECORD_TYPE.USER && user.company === loggedUser._id);

    return (
        <Master onLoad={onLoad} user={loggedUser} strict={true}>
            {loggedUser && user && visible &&
                <div className='update-user'>
                    <Paper className="user-form user-form-wrapper" elevation={10}>
                        <h1 className="user-form-title"> {strings.CREATE_COMPANY_HEADING} </h1>
                        <form onSubmit={handleSubmit}>
                            <Avatar
                                type={type}
                                mode='update'
                                record={user}
                                size='large'
                                readonly={false}
                                onBeforeUpload={onBeforeUpload}
                                onChange={onAvatarChange}
                                color='disabled'
                                className='avatar-ctn'
                                hideDelete={type === Env.RECORD_TYPE.COMPANY}
                            />

                            {company && <div className='info'>
                                <InfoIcon />
                                <label>
                                    {ccStrings.RECOMMENDED_IMAGE_SIZE}
                                </label>
                            </div>}

                            {admin &&
                                <FormControl fullWidth margin="dense" style={{ marginTop: company ? 0 : 39 }}>
                                    <InputLabel className='required'>{commonStrings.TYPE}</InputLabel>
                                    <Select
                                        label={commonStrings.TYPE}
                                        value={type}
                                        onChange={handleUserTypeChange}
                                        variant='standard'
                                        required
                                        fullWidth
                                    >
                                        <MenuItem value={Env.RECORD_TYPE.ADMIN}>{Helper.getUserType(Env.RECORD_TYPE.ADMIN)}</MenuItem>
                                        <MenuItem value={Env.RECORD_TYPE.COMPANY}>{Helper.getUserType(Env.RECORD_TYPE.COMPANY)}</MenuItem>
                                        <MenuItem value={Env.RECORD_TYPE.USER}>{Helper.getUserType(Env.RECORD_TYPE.USER)}</MenuItem>
                                    </Select>
                                </FormControl>
                            }

                            <FormControl fullWidth margin="dense">
                                <InputLabel className='required'>{commonStrings.FULL_NAME}</InputLabel>
                                <Input
                                    id="full-name"
                                    type="text"
                                    error={fullNameError}
                                    required
                                    onBlur={handleFullNameOnBlur}
                                    onChange={handleOnChangeFullName}
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

                            {driver &&
                                <FormControl fullWidth margin="dense">
                                    <DatePicker
                                        label={strings.BIRTH_DATE}
                                        value={birthDate}
                                        required
                                        onChange={(birthDate) => {
                                            const birthDateValid = validateBirthDate(birthDate);

                                            setBirthDate(birthDate);
                                            setBirthDateValid(birthDateValid);
                                        }}
                                        language={(user && user.language) || Env.DEFAULT_LANGUAGE}
                                    />
                                    <FormHelperText error={!birthDateValid}>
                                        {(!birthDateValid && commonStrings.BIRTH_DATE_NOT_VALID) || ''}
                                    </FormHelperText>
                                </FormControl>
                            }

                            {
                                company &&
                                <FormControl component="fieldset" style={{ marginTop: 15 }}>
                                    <FormControlLabel
                                        control={<Switch checked={payLater} onChange={(e) => {
                                            setPayLater(e.target.checked);
                                        }} color="primary" />}
                                        label={commonStrings.PAY_LATER}
                                    />
                                </FormControl>
                            }

                            <div className='info'>
                                <InfoIcon />
                                <label>{commonStrings.OPTIONAL}</label>
                            </div>

                            <FormControl fullWidth margin="dense">
                                <InputLabel>{commonStrings.PHONE}</InputLabel>
                                <Input
                                    id="phone"
                                    type="text"
                                    onChange={handlePhoneChange}
                                    onBlur={handlePhoneBlur}
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
                                    onChange={handleOnChangeLocation}
                                    autoComplete="off"
                                    value={location}
                                />
                            </FormControl>

                            <FormControl fullWidth margin="dense">
                                <InputLabel>{commonStrings.BIO}</InputLabel>
                                <Input
                                    id="bio"
                                    type="text"
                                    onChange={handleOnChangeBio}
                                    autoComplete="off"
                                    value={bio}
                                />
                            </FormControl>

                            {activate &&
                                <FormControl fullWidth margin="dense" className='resend-activation-link'>
                                    <Link onClick={handleResendActivationLink}>{commonStrings.RESEND_ACTIVATION_LINK}</Link>
                                </FormControl>
                            }

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
                                    onClick={handleCancel}
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
};

export default UpdateUser;