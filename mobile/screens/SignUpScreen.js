import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, ScrollView, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { intervalToDuration } from 'date-fns';
import i18n from '../lang/i18n';
import TextInput from '../elements/TextInput';
import Button from '../elements/Button';
import Switch from '../elements/Switch';
import validator from 'validator';
import * as UserService from '../services/UserService';
import * as Helper from '../common/Helper';
import DateTimePicker from '../elements/DateTimePicker';
import Env from '../config/env.config';
import Error from '../elements/Error';
import Backdrop from '../elements/Backdrop';
import Header from '../elements/Header';

const SignUpScreen = ({ navigation, route }) => {
    const isFocused = useIsFocused();
    const [language, setLanguage] = useState(null);
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [birthDate, setBirthDate] = useState(null);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [tosChecked, setTosChecked] = useState(false);
    const [loading, setLoading] = useState(false);
    const [fullNameRequired, setFullNameRequired] = useState(false);
    const [emailRequired, setEmailRequired] = useState(false);
    const [emailValid, setEmailValid] = useState(true);
    const [emailError, setEmailError] = useState(false);
    const [phoneValid, setPhoneValid] = useState(true);
    const [phoneRequired, setPhoneRequired] = useState(false);
    const [birthDateRequired, setBirthDateRequired] = useState(false);
    const [birthDateValid, setBirthDateValid] = useState(true);
    const [passwordRequired, setPasswordRequired] = useState(false);
    const [confirmPasswordRequired, setConfirmPasswordRequired] = useState(false);
    const [passwordLengthError, setPasswordLengthError] = useState(false);
    const [confirmPasswordError, setConfirmPasswordError] = useState(false);
    const [tosError, setTosError] = useState(false);

    const fullNameRef = useRef(null);
    const emailRef = useRef(null);
    const phoneRef = useRef(null);
    const passwordRef = useRef(null);
    const confirmPasswordRef = useRef(null);

    const _init = async () => {
        const language = await UserService.getLanguage();
        i18n.locale = language;
        setLanguage(language);

        setFullName('');
        setEmail('');
        setPhone('');
        setBirthDate(null);
        setPassword('');
        setConfirmPassword('');
        setTosChecked(false);

        setFullNameRequired(false);
        setEmailRequired(false);
        setEmailValid(true);
        setEmailError(false);
        setPhoneRequired(false);
        setPhoneValid(true);
        setBirthDateRequired(false);
        setBirthDateValid(true);
        setBirthDateRequired(false);
        setPasswordRequired(false);
        setPasswordLengthError(false);
        setConfirmPasswordRequired(false);
        setConfirmPasswordError(false);
        setTosError(false);

        if (fullNameRef.current) fullNameRef.current.clear();
        if (emailRef.current) emailRef.current.clear();
        if (phoneRef.current) phoneRef.current.clear();
        if (passwordRef.current) passwordRef.current.clear();
        if (confirmPasswordRef.current) confirmPasswordRef.current.clear();
    };

    useEffect(() => {
        if (isFocused) {
            _init();
        }
    }, [route.params, isFocused]);

    const validateFullName = () => {
        const valid = fullName !== '';
        setFullNameRequired(!valid);
        return valid;
    };

    const onChangeFullName = (text) => {
        setFullName(text);
        setFullNameRequired(false);
    };

    const validateEmail = async () => {
        if (email) {
            setEmailRequired(false);

            if (validator.isEmail(email)) {
                try {
                    const status = await UserService.validateEmail({ email });
                    if (status === 200) {
                        setEmailError(false);
                        setEmailValid(true);
                        return true;
                    } else {
                        setEmailError(true);
                        setEmailValid(true);
                        return false;
                    }
                } catch (err) {
                    Helper.error(err);
                    setEmailError(false);
                    setEmailValid(true);
                    return false;
                }
            } else {
                setEmailError(false);
                setEmailValid(false);
                return false;
            }
        } else {
            setEmailError(false);
            setEmailValid(true);
            setEmailRequired(true);
            return false;
        }
    };

    const onChangeEmail = (text) => {
        setEmail(text);
        setEmailRequired(false);
        setEmailValid(true);
        setEmailError(false);
    };

    const validatePhone = () => {
        if (phone) {
            const phoneValid = validator.isMobilePhone(phone);
            setPhoneRequired(false);
            setPhoneValid(phoneValid);

            return phoneValid;
        } else {
            setPhoneRequired(true);
            setPhoneValid(true);

            return false;
        }
    };

    const onChangePhone = (text) => {
        setPhone(text);
        setPhoneRequired(false);
        setPhoneValid(true);
    };

    const validateBirthDate = () => {
        if (birthDate) {
            setBirthDateRequired(false);

            const sub = intervalToDuration({ start: birthDate, end: new Date() }).years;
            const birthDateValid = sub >= Env.MINIMUM_AGE;

            setBirthDateValid(birthDateValid);
            return birthDateValid;
        } else {
            setBirthDateRequired(true);
            setBirthDateValid(true);

            return false;
        }
    };

    const onChangeBirthDate = (date) => {
        setBirthDate(date);
        setBirthDateRequired(false);
        setBirthDateValid(true);
    };

    const validatePassword = () => {
        if (!password) {
            setPasswordRequired(true);
            setPasswordLengthError(false);
            return false;
        }

        if (password.length < 6) {
            setPasswordLengthError(true);
            setPasswordRequired(false);
            return false;
        }

        if (!confirmPassword) {
            setConfirmPasswordRequired(true);
            setConfirmPasswordError(false);
            return false;
        }

        if (password !== confirmPassword) {
            setConfirmPasswordError(true);
            setConfirmPasswordRequired(false);
            return false;
        }

        return true;
    };

    const onChangePassword = (text) => {
        setPassword(text);
        setPasswordRequired(false);
        setPasswordLengthError(false);
    };

    const onChangeConfirmPassword = (text) => {
        setConfirmPassword(text);
        setConfirmPasswordRequired(false);
        setConfirmPasswordError(false);
    };

    const onChangeToS = (checked) => {
        setTosChecked(checked);
        if (checked) setTosError(false);
    };

    const error = (err) => {
        Helper.error(err);
        setLoading(false);
    };

    const onPressSignUp = async () => {

        fullNameRef.current.blur();
        emailRef.current.blur();
        phoneRef.current.blur();
        passwordRef.current.blur();
        confirmPasswordRef.current.blur();

        const fullNameValid = validateFullName();
        if (!fullNameValid) {
            return;
        }

        const emailValid = await validateEmail();
        if (!emailValid) {
            return;
        }

        const phoneValid = validatePhone();
        if (!phoneValid) {
            return;
        }

        const birthDateValid = validateBirthDate();
        if (!birthDateValid) {
            return;
        }

        const passwordValid = validatePassword();
        if (!passwordValid) {
            return;
        }

        if (!tosChecked) {
            return setTosError(true);
        }

        setLoading(true);

        const data = {
            email,
            phone,
            password,
            fullName,
            birthDate,
            language
        };

        UserService.signup(data)
            .then(status => {
                if (status === 200) {
                    UserService.signin({ email, password })
                        .then(res => {
                            if (res.status === 200) {
                                navigation.navigate('Home', { d: new Date().getTime() });
                            } else {
                                error();
                            }
                        }).catch(err => {
                            error(err);
                        });
                } else {
                    error();
                }
            })
            .catch(err => {
                error(err);
            });
    };

    return (
        <View style={styles.master}>
            <Header title={i18n.t('SIGN_UP_TITLE')} hideTitle={false} loggedIn={false} notificationCount={0} />

            {language &&
                <ScrollView
                    contentContainerStyle={styles.container}
                    keyboardShouldPersistTaps='handled'
                    nestedScrollEnabled
                >
                    <View style={styles.contentContainer}>
                        <TextInput
                            ref={fullNameRef}
                            style={styles.component}
                            label={i18n.t('FULL_NAME')}
                            value={fullName}
                            error={fullNameRequired}
                            helperText={(fullNameRequired && i18n.t('REQUIRED')) || ''}
                            onChangeText={onChangeFullName}
                        />

                        <TextInput
                            ref={emailRef}
                            style={styles.component}
                            label={i18n.t('EMAIL')}
                            value={email}
                            error={emailRequired || !emailValid || emailError}
                            helperText={
                                ((emailRequired && i18n.t('REQUIRED')) || '')
                                || ((!emailValid && i18n.t('EMAIL_NOT_VALID')) || '')
                                || ((emailError && i18n.t('EMAIL_ALREADY_REGISTERED')) || '')
                            }
                            onChangeText={onChangeEmail}
                        />

                        <TextInput
                            ref={phoneRef}
                            style={styles.component}
                            label={i18n.t('PHONE')}
                            value={phone}
                            error={phoneRequired || !phoneValid}
                            helperText={
                                ((phoneRequired && i18n.t('REQUIRED')) || '')
                                || ((!phoneValid && i18n.t('PHONE_NOT_VALID')) || '')
                            }
                            onChangeText={onChangePhone}
                        />

                        <DateTimePicker
                            mode='date'
                            locale={language}
                            style={styles.date}
                            label={i18n.t('BIRTH_DATE')}
                            value={birthDate}
                            error={birthDateRequired || !birthDateValid}
                            helperText={
                                ((birthDateRequired && i18n.t('REQUIRED')) || '')
                                || ((!birthDateValid && i18n.t('BIRTH_DATE_NOT_VALID')) || '')
                            }
                            onChange={onChangeBirthDate}
                        />

                        <TextInput
                            ref={passwordRef}
                            style={styles.component}
                            secureTextEntry
                            label={i18n.t('PASSWORD')}
                            value={password}
                            error={passwordRequired || passwordLengthError}
                            helperText={
                                ((passwordRequired && i18n.t('REQUIRED')) || '')
                                || ((passwordLengthError && i18n.t('PASSWORD_LENGTH_ERROR')) || '')
                            }
                            onChangeText={onChangePassword}
                        />

                        <TextInput
                            ref={confirmPasswordRef}
                            style={styles.component}
                            secureTextEntry
                            label={i18n.t('CONFIRM_PASSWORD')}
                            value={confirmPassword}
                            error={confirmPasswordRequired || confirmPasswordError}
                            helperText={
                                ((confirmPasswordRequired && i18n.t('REQUIRED')) || '')
                                || ((confirmPasswordError && i18n.t('PASSWORDS_DONT_MATCH')) || '')
                            }
                            onChangeText={onChangeConfirmPassword}
                        />

                        <Switch style={styles.component} textStyle={styles.tosText} label={i18n.t('ACCEPT_TOS')} value={tosChecked} onValueChange={onChangeToS} />

                        <Button style={styles.component} label={i18n.t('SIGN_UP')} onPress={onPressSignUp} />

                        {tosError && <Error message={i18n.t('TOS_ERROR')} />}
                    </View>
                </ScrollView>
            }

            {loading && <Backdrop message={i18n.t('PLEASE_WAIT')} />}
        </View>
    );
};

const styles = StyleSheet.create({
    master: {
        flex: 1,
        backgroundColor: '#fafafa'
    },
    container: {
        justifyContent: 'center',
        alignItems: 'center',
        flexGrow: 1
    },
    contentContainer: {
        width: '100%',
        maxWidth: 480,
        alignItems: 'center'
    },
    component: {
        alignSelf: 'stretch',
        margin: 10
    },
    date: {
        alignSelf: 'stretch',
        marginTop: 10,
        marginRight: 10,
        marginBottom: 25,
        marginLeft: 10
    },
    tosText: {
        fontSize: 12
    }
});

export default SignUpScreen;