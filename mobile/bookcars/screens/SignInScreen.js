import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, ScrollView, View } from 'react-native';
import { useNavigationState } from '@react-navigation/native';

import TextInput from '../elements/TextInput';
import Button from '../elements/Button';
import Link from '../elements/Link';
import i18n from '../lang/i18n';
import Error from '../elements/Error';
import UserService from '../services/UserService';
import Helper from '../common/Helper';

export default function SignInScreen({ navigation }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const [emailRequired, setEmailRequired] = useState(false);
    const [passwordRequired, setPasswordRequired] = useState(false);
    const [signInError, setSignInError] = useState(false);
    const [blacklisted, setBlacklisted] = useState(false);

    const emailRef = useRef(null);
    const passwordRef = useRef(null);

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            // The screen is focused

            setEmail('');
            setPassword('');

            if (emailRef.current) emailRef.current.clear();
            if (passwordRef.current) passwordRef.current.clear();
        });

        // Return the function to unsubscribe from the event so it gets removed on unmount
        return unsubscribe;
    }, [navigation]);

    const routes = useNavigationState(state => state && state.routes);

    const _init = async () => {
        const language = await UserService.getLanguage();
        i18n.locale = language;
    };

    useEffect(() => {
        _init();
    }, [routes]);

    const onChangeEmail = (text) => {
        setEmail(text);
        setEmailRequired(false);
    };

    const onChangePassword = (text) => {
        setPassword(text);
        setPasswordRequired(false);
    };

    const onPressSignIn = () => {

        if (!email) {
            return setEmailRequired(true);
        }

        if (!password) {
            return setPasswordRequired(true);
        }

        const data = { email, password };

        UserService.signin(data)
            .then(async res => {
                if (res.status === 200) {
                    if (res.data.blacklisted) {
                        await UserService.signout(navigation, false);
                        setSignInError(false);
                        setBlacklisted(true);
                    } else {
                        setSignInError(false);
                        navigation.navigate('Home', { d: new Date().getTime() });
                    }
                } else {
                    setSignInError(true);
                }
            }).catch((err) => {
                Helper.error(err);
            });
    };

    const onPressSignUp = () => {
        navigation.navigate('SignUp');
    };

    const onPressForgotPassword = () => {
        navigation.navigate('ForgotPassword');
    };

    return (
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
                    error={emailRequired}
                    helperText={((emailRequired && i18n.t('REQUIRED')) || '')}
                    onChangeText={onChangeEmail}
                />

                <TextInput
                    ref={passwordRef}
                    style={styles.component}
                    secureTextEntry
                    label={i18n.t('PASSWORD')}
                    value={password}
                    error={passwordRequired}
                    helperText={((passwordRequired && i18n.t('REQUIRED')) || '')}
                    onChangeText={onChangePassword}
                />

                <Button style={styles.component} label={i18n.t('SIGN_IN')} onPress={onPressSignIn} />

                <Button style={styles.component} type='secondary' label={i18n.t('SIGN_UP')} onPress={onPressSignUp} />

                <Link style={styles.link} label={i18n.t('FORGOT_PASSWORD')} onPress={onPressForgotPassword} />

                {signInError && <Error style={styles.error} message={i18n.t('SIGN_IN_ERROR')} />}
                {blacklisted && <Error style={styles.error} message={i18n.t('IS_BLACKLISTED')} />}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
        flexGrow: 1,
        backgroundColor: '#fafafa'
    },
    contentContainer: {
        width: 420,
        alignItems: 'center'
    },
    component: {
        alignSelf: 'stretch',
        margin: 10,
    },
    link: {
        margin: 10
    },
    error: {
        marginTop: 15
    }
});