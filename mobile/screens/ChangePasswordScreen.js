import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import Master from './Master';
import i18n from '../lang/i18n';
import * as UserService from '../services/UserService';
import * as Helper from '../common/Helper';
import TextInput from '../elements/TextInput';
import Button from '../elements/Button';

const ChangePasswordScreen = ({ navigation, route }) => {
    const isFocused = useIsFocused();
    const [reload, setReload] = useState(false);
    const [visible, setVisible] = useState(false);
    const [user, setUser] = useState(null);
    const [currentPassword, setCurrentPassword] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [currentPasswordRequired, setCurrentPasswordRequired] = useState(false);
    const [currentPasswordError, setCurrentPasswordError] = useState(false);
    const [passwordRequired, setPasswordRequired] = useState(false);
    const [confirmPasswordRequired, setConfirmPasswordRequired] = useState(false);
    const [passwordLengthError, setPasswordLengthError] = useState(false);
    const [confirmPasswordError, setConfirmPasswordError] = useState(false);

    const currentPasswordRef = useRef(null);
    const passwordRef = useRef(null);
    const confirmPasswordRef = useRef(null);

    const clear = () => {
        setCurrentPassword('');
        setPassword('');
        setConfirmPassword('');

        if (currentPasswordRef.current) currentPasswordRef.current.clear();
        if (passwordRef.current) passwordRef.current.clear();
        if (confirmPasswordRef.current) confirmPasswordRef.current.clear();
    };

    const _init = async () => {
        try {
            const language = await UserService.getLanguage();
            i18n.locale = language;

            clear();

            const currentUser = await UserService.getCurrentUser();

            if (!currentUser) {
                await UserService.signout(navigation, false, true);
                return;
            }

            const user = await UserService.getUser(currentUser.id);

            if (!user) {
                await UserService.signout(navigation, false, true);
                return;
            }

            setUser(user);
            setVisible(true);
        }
        catch (err) {
            await UserService.signout(navigation, false, true);
        }
    };

    useEffect(() => {
        if (isFocused) {
            _init();
            setReload(true);
        } else {
            setVisible(false);
        }
    }, [route.params, isFocused]);

    const onLoad = (user) => {
        setReload(false);
    };

    const validatePassword = async () => {

        try {

            if (!currentPassword) {
                setCurrentPasswordRequired(true);
                setCurrentPasswordError(false);
                return false;
            }

            const status = await UserService.checkPassword(user._id, currentPassword);

            if (status !== 200) {
                setCurrentPasswordRequired(false);
                setCurrentPasswordError(true);
                return false;
            }

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
        }
        catch (err) {
            await UserService.signout(navigation, false, true);
        }
    };

    const onChangeCurrentPassword = (text) => {
        setCurrentPassword(text);
        setCurrentPasswordRequired(false);
        setCurrentPasswordError(false);
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

    const onPressUpdate = async () => {
        try {
            const passwordValid = await validatePassword();

            if (!passwordValid) {
                return;
            }

            const data = {
                _id: user._id,
                password: currentPassword,
                newPassword: password,
                strict: true
            };

            const status = await UserService.changePassword(data);

            if (status === 200) {
                clear();
                Helper.toast(i18n.t('PASSWORD_UPDATE'));
            } else {
                Helper.toast(i18n.t('PASSWORD_UPDATE_ERROR'));
            }
        } catch (err) {
            await UserService.signout(navigation, false, true);
        }
    };

    return (
        <Master style={styles.master} navigation={navigation} route={route} onLoad={onLoad} reload={reload} strict>
            {visible &&
                <ScrollView
                    contentContainerStyle={styles.container}
                    keyboardShouldPersistTaps='handled'
                    nestedScrollEnabled
                >
                    <View style={styles.contentContainer}>
                        <TextInput
                            ref={currentPasswordRef}
                            style={styles.component}
                            secureTextEntry
                            label={i18n.t('CURRENT_PASSWORD')}
                            value={currentPassword}
                            error={currentPasswordRequired || currentPasswordError}
                            helperText={
                                ((currentPasswordRequired && i18n.t('REQUIRED')) || '')
                                || ((currentPasswordError && i18n.t('PASSWORD_ERROR')) || '')
                            }
                            onChangeText={onChangeCurrentPassword}
                        />

                        <TextInput
                            ref={passwordRef}
                            style={styles.component}
                            secureTextEntry
                            label={i18n.t('NEW_PASSWORD')}
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

                        <Button style={styles.component} label={i18n.t('UPDATE')} onPress={onPressUpdate} />
                    </View>
                </ScrollView>
            }
        </Master>
    );
};

const styles = StyleSheet.create({
    master: {
        flex: 1,
    },
    container: {
        justifyContent: 'center',
        alignItems: 'center',
        flexGrow: 1
    },
    contentContainer: {
        width: '100%',
        maxWidth: 480,
        alignItems: 'center',
        paddingTop: 8,
        paddingBottom: 20
    },
    component: {
        alignSelf: 'stretch',
        margin: 10
    }
});

export default ChangePasswordScreen;