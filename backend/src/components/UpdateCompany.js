import React, { useState } from 'react';
import Master from '../elements/Master';
import Env from '../config/env.config';
import { strings as commonStrings } from '../lang/common';
import { strings as ccStrings } from '../lang/create-company';
import * as CompanyService from '../services/CompanyService';
import * as UserService from '../services/UserService';
import * as Helper from '../common/Helper';
import Error from '../elements/Error';
import Backdrop from '../elements/SimpleBackdrop';
import NoMatch from './NoMatch';
import Avatar from '../elements/Avatar';
import {
    Input,
    InputLabel,
    FormControl,
    FormHelperText,
    Button,
    Paper,
    Link,
    FormControlLabel,
    Switch
} from '@mui/material';
import { Info as InfoIcon } from '@mui/icons-material';
import validator from 'validator';

import '../assets/css/update-company.css';

const UpdateCompany = () => {
    const [user, setUser] = useState();
    const [company, setCompany] = useState('');
    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [location, setLocation] = useState('');
    const [bio, setBio] = useState('');
    const [error, setError] = useState(false);
    const [visible, setVisible] = useState(false);
    const [loading, setLoading] = useState(false);
    const [fullNameError, setFullNameError] = useState(false);
    const [noMatch, setNoMatch] = useState(false);
    const [avatar, setAvatar] = useState();
    const [avatarError, setAvatarError] = useState(false);
    const [email, setEmail] = useState('');
    const [phoneValid, setPhoneValid] = useState(true);
    const [payLater, setPayLater] = useState(true);


    const handleOnChangeFullName = (e) => {
        setFullName(e.target.value);

        if (!e.target.value) {
            setFullNameError(false);
        }
    };

    const validateFullName = async (fullName) => {
        if (fullName) {
            if (company.fullName !== fullName) {
                try {
                    const status = await CompanyService.validate({ fullName });

                    if (status === 200) {
                        setFullNameError(false);
                        return true;
                    } else {
                        setFullNameError(true);
                        setAvatarError(false);
                        setError(false);
                        return false;
                    }
                }
                catch (err) {
                    UserService.signout();
                }
            } else {
                setFullNameError(false);
                setAvatarError(false);
                setError(false);
                return true;
            }
        } else {
            setFullNameError(true);
            setAvatarError(false);
            setError(false);
            return false;
        }
    };

    const handleFullNameOnBlur = async (e) => {
        await validateFullName(e.target.value);
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
        const _company = Helper.clone(company);
        _company.avatar = avatar;

        if (user._id === company._id) {
            const _user = Helper.clone(user);
            _user.avatar = avatar;
            setUser(_user);
        }

        setLoading(false);
        setCompany(_company);

        if (avatar) {
            setAvatarError(false);
        }
    };

    const handleResendActivationLink = () => {
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

    const onLoad = (user) => {
        if (user && user.verified) {
            setLoading(true);
            setUser(user);

            const params = new URLSearchParams(window.location.search);
            if (params.has('c')) {
                const id = params.get('c');
                if (id && id !== '') {
                    CompanyService.getCompany(id)
                        .then(company => {
                            if (company) {
                                setCompany(company);
                                setEmail(company.email);
                                setAvatar(company.avatar);
                                setFullName(company.fullName);
                                setPhone(company.phone);
                                setLocation(company.location);
                                setBio(company.bio);
                                setPayLater(company.payLater);
                                setVisible(true);
                                setLoading(false);
                            } else {
                                setLoading(false);
                                setNoMatch(true);
                            }
                        })
                        .catch(() => {
                            setLoading(false);
                            setError(true);
                            setVisible(false);
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

        const fullNameValid = await validateFullName(fullName);
        if (!fullNameValid) {
            return;
        }

        const phoneValid = validatePhone(phone);
        if (!phoneValid) {
            return;
        }

        if (!avatar) {
            setAvatarError(true);
            setError(false);
            return;
        }

        const data = {
            _id: company._id,
            fullName,
            phone,
            location,
            bio,
            payLater
        };

        CompanyService.update(data)
            .then(status => {
                if (status === 200) {
                    company.fullName = fullName;
                    setCompany(Helper.clone(company));
                    Helper.info(commonStrings.UPDATED);
                } else {
                    Helper.error();
                }
            })
            .catch(() => {
                UserService.signout();
            });
    };

    const admin = Helper.admin(user);

    return (
        <Master onLoad={onLoad} strict={true} user={user}>
            {visible &&
                <div className='update-company'>
                    <Paper className="company-form-update company-form-wrapper" elevation={10}>
                        <form onSubmit={handleSubmit}>
                            <Avatar
                                type={Env.RECORD_TYPE.COMPANY}
                                mode='update'
                                record={company}
                                size='large'
                                readonly={false}
                                hideDelete={true}
                                onBeforeUpload={onBeforeUpload}
                                onChange={onAvatarChange}
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

                            <FormControl component="fieldset" style={{ marginTop: 15 }}>
                                <FormControlLabel
                                    control={<Switch checked={payLater} onChange={(e) => {
                                        setPayLater(e.target.checked);
                                    }} color="primary" />}
                                    label={commonStrings.PAY_LATER}
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
                            {admin &&
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
                                    href="/suppliers"
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

export default UpdateCompany;