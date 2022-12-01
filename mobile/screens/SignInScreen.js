import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, ScrollView, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import validator from 'validator';
import TextInput from '../elements/TextInput';
import Button from '../elements/Button';
import Link from '../elements/Link';
import i18n from '../lang/i18n';
import Error from '../elements/Error';
import * as UserService from '../services/UserService';
import * as Helper from '../common/Helper';
import Switch from '../elements/Switch';
import Header from '../elements/Header';

const SignInScreen = ({ navigation, route }) => {
    const isFocused = useIsFocused();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [stayConnected, setStayConnected] = useState(false);

    const [emailRequired, setEmailRequired] = useState(false);
    const [emailValid, setEmailValid] = useState(true);
    const [emailError, setEmailError] = useState(false);
    const [passwordRequired, setPasswordRequired] = useState(false);
    const [passwordLengthError, setPasswordLengthError] = useState(false);
    const [passwordError, setPasswordError] = useState(false);
    const [blacklisted, setBlacklisted] = useState(false);

    const emailRef = useRef(null);
    const passwordRef = useRef(null);

    const clear = () => {
        setEmail('');
        setPassword('');
        setStayConnected(false);

        setEmailRequired(false);
        setEmailValid(true);
        setEmailError(false);
        setPasswordRequired(false);
        setPasswordLengthError(false);
        setPasswordError(false);
        setBlacklisted(false);

        if (emailRef.current) emailRef.current.clear();
        if (passwordRef.current) passwordRef.current.clear();
    };

    const _init = async () => {
        const language = await UserService.getLanguage();
        i18n.locale = language;

        clear();
    };

    useEffect(() => {
        if (isFocused) {
            _init();
        }
    }, [route.params, isFocused]);

    const validateEmail = async () => {
        if (email) {
            setEmailRequired(false);

            if (validator.isEmail(email)) {
                try {
                    const status = await UserService.validateEmail({ email });
                    if (status === 204) {
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
        setPasswordRequired(false);
        setPasswordLengthError(false);
        setPasswordError(false);
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

        return true;
    };

    const onChangePassword = (text) => {
        setPassword(text);
        setPasswordRequired(false);
        setPasswordLengthError(false);
        setPasswordError(false);
    };

    const onChangeStayConnected = (checked) => {
        setStayConnected(checked);
    };

    const onPressSignIn = async () => {

        const emailValid = await validateEmail();
        if (!emailValid) {
            return;
        }

        const passwordValid = validatePassword();
        if (!passwordValid) {
            return;
        }

        const data = { email, password, stayConnected };

        const res = await UserService.signin(data);

        try {
            if (res.status === 200) {
                if (res.data.blacklisted) {
                    await UserService.signout(navigation, false);
                    setPasswordError(false);
                    setBlacklisted(true);
                } else {
                    await Helper.registerPushToken(res.data.id);

                    setPasswordError(false);
                    setBlacklisted(false);
                    clear();
                    navigation.navigate('Home', { d: new Date().getTime() });
                }
            } else {
                setPasswordError(true);
                setBlacklisted(false);
            }
        }
        catch (err) {
            Helper.error(err);
        }

    };

    const onPressSignUp = () => {
        navigation.navigate('SignUp');
    };

    const onPressForgotPassword = () => {
        navigation.navigate('ForgotPassword');
    };

    return (
        <View style={styles.master}>
            <Header title={i18n.t('SIGN_IN_TITLE')} hideTitle={false} loggedIn={false} notificationCount={0} />

            <ScrollView
                contentContainerStyle={styles.container}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
            >
                <View style={styles.contentContainer}>
                    <TextInput
                        ref={emailRef}
                        style={styles.component}
                        label={i18n.t('EMAIL')}
                        value={email}
                        error={emailRequired || !emailValid || emailError}
                        helperText={
                            ((emailRequired && i18n.t('REQUIRED')) || '')
                            || ((!emailValid && i18n.t('EMAIL_NOT_VALID')) || '')
                            || ((emailError && i18n.t('EMAIL_ERROR')) || '')
                        }
                        onChangeText={onChangeEmail}
                    />

                    <TextInput
                        ref={passwordRef}
                        style={styles.component}
                        secureTextEntry
                        label={i18n.t('PASSWORD')}
                        value={password}
                        error={passwordRequired || passwordLengthError || passwordError}
                        helperText={
                            ((passwordRequired && i18n.t('REQUIRED')) || '')
                            || ((passwordLengthError && i18n.t('PASSWORD_LENGTH_ERROR')) || '')
                            || ((passwordError && i18n.t('PASSWORD_ERROR')) || '')
                        }
                        onChangeText={onChangePassword}
                        onSubmitEditing={onPressSignIn}
                    />

                    <Switch style={styles.stayConnected} textStyle={styles.stayConnectedText} label={i18n.t('STAY_CONNECTED')} value={stayConnected} onValueChange={onChangeStayConnected} />

                    <Button style={styles.component} label={i18n.t('SIGN_IN')} onPress={onPressSignIn} />

                    <Button style={styles.component} color='secondary' label={i18n.t('SIGN_UP')} onPress={onPressSignUp} />

                    <Link style={styles.link} label={i18n.t('FORGOT_PASSWORD')} onPress={onPressForgotPassword} />

                    {blacklisted && <Error style={styles.error} message={i18n.t('IS_BLACKLISTED')} />}
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    master: {
        flex: 1,
    },
    container: {
        justifyContent: 'center',
        alignItems: 'center',
        flexGrow: 1,
        backgroundColor: '#fafafa'
    },
    contentContainer: {
        width: '100%',
        maxWidth: 480,
        alignItems: 'center'
    },
    component: {
        alignSelf: 'stretch',
        margin: 10,
    },
    stayConnected: {
        alignSelf: 'stretch',
        marginLeft: 10,
        marginBottom: 10
    },
    stayConnectedText: {
        fontSize: 12
    },
    link: {
        margin: 10
    },
    error: {
        marginTop: 15
    }
});

export default SignInScreen;