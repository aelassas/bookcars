import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import validator from 'validator';
import moment from 'moment';

import Master from './Master';
import i18n from '../lang/i18n';
import UserService from '../services/UserService';
import TextInput from '../elements/TextInput';
import DateTimePicker from '../elements/DateTimePicker';
import Switch from '../elements/Switch';
import Button from '../elements/Button';
import Helper from '../common/Helper';
import Env from '../config/env.config';

export default function SettingsScreen({ navigation, route }) {
    const isFocused = useIsFocused();
    const [reload, setReload] = useState(false);
    const [visible, setVisible] = useState(false);
    const [language, setLanguage] = useState(null);
    const [user, setUser] = useState(null);
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [birthDate, setBirthDate] = useState(null);
    const [location, setLocation] = useState('');
    const [bio, setBio] = useState('');
    const [enableEmailNotifications, setEnableEmailNotifications] = useState(false);

    const [fullNameRequired, setFullNameError] = useState(false);
    const [phoneValid, setPhoneValid] = useState(true);
    const [phoneRequired, setPhoneRequired] = useState(false);
    const [birthDateRequired, setbirthDateRequired] = useState(false);
    const [birthDateValid, setbirthDateValid] = useState(true);

    const _init = async () => {
        try {
            const language = await UserService.getLanguage();
            i18n.locale = language;
            setLanguage(language);

            const currentUser = await UserService.getCurrentUser();

            if (!currentUser) {
                UserService.signout(navigation, false, true);
            }

            const user = await UserService.getUser(currentUser.id);

            if (!user) {
                UserService.signout(navigation, false, true);
            }

            setUser(user);
            setFullName(user.fullName);
            setEmail(user.email);
            setPhone(user.phone);
            setBirthDate(new Date(user.birthDate))
            setLocation(user.location);
            setBio(user.bio);
            setEnableEmailNotifications(user.enableEmailNotifications);

            setVisible(true);
        } catch (err) {
            UserService.signout(navigation, false, true);
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

    const validateFullName = () => {
        const valid = fullName !== '';
        setFullNameError(!valid);
        return valid;
    };

    const onChangeFullName = (text) => {
        setFullName(text);

        if (text) {
            setFullNameError(false);
        }
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
            setbirthDateRequired(false);

            const sub = moment().diff(birthDate, 'years');
            const birthDateValid = sub >= Env.MINIMUM_AGE;

            setbirthDateValid(birthDateValid);
            return birthDateValid;
        } else {
            setbirthDateRequired(true);
            setbirthDateValid(true);

            return false;
        }
    };

    const onChangeBirthDate = (date) => {
        setBirthDate(date);
        setbirthDateRequired(false);
        setbirthDateValid(true);
    };

    const onChangeLocation = (text) => {
        setLocation(text);
    };

    const onChangeBio = (text) => {
        setBio(text);
    };

    const onChangeEnableEmailNotificationsChecked = (checked) => {
        setEnableEmailNotifications(checked);
    };

    const onPressSave = () => {

        const fullNameValid = validateFullName();
        if (!fullNameValid) {
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

        const data = {
            _id: user._id,
            fullName,
            birthDate,
            phone,
            location,
            bio,
            enableEmailNotifications
        };

        UserService.updateUser(data)
            .then(status => {
                if (status === 200) {
                    Helper.toast(i18n.t('SETTINGS_UPDATED'));
                } else {
                    Helper.error();
                }
            })
            .catch(() => {
                UserService.signout(navigation, false, true);
            });

    };

    const onPressChangePassword = () => {
        navigation.navigate('ChangePassword');
    };

    return (
        visible && language &&
        <Master style={styles.master} navigation={navigation} onLoad={onLoad} reload={reload} strict>
            <ScrollView
                contentContainerStyle={styles.container}
                keyboardShouldPersistTaps='handled'
                nestedScrollEnabled
            >
                <View style={styles.contentContainer}>
                    <TextInput
                        style={styles.component}
                        label={i18n.t('FULL_NAME')}
                        value={fullName}
                        error={fullNameRequired}
                        helperText={(fullNameRequired && i18n.t('REQUIRED')) || ''}
                        onChangeText={onChangeFullName}
                    />

                    <TextInput
                        style={styles.component}
                        label={i18n.t('EMAIL')}
                        value={email}
                        readOnly
                    />

                    <TextInput
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
                        style={styles.component}
                        label={i18n.t('LOCATION')}
                        value={location}
                        onChangeText={onChangeLocation}
                    />

                    <TextInput
                        style={styles.component}
                        label={i18n.t('BIO')}
                        value={bio}
                        onChangeText={onChangeBio}
                    />

                    <Switch
                        style={styles.component}
                        textStyle={styles.enableEmailNotificationsText}
                        label={i18n.t('ENABLE_EMAIL_NOTIFICATIONS')}
                        value={enableEmailNotifications}
                        onValueChange={onChangeEnableEmailNotificationsChecked} />

                    <Button style={styles.component} label={i18n.t('SAVE')} onPress={onPressSave} />

                    <Button style={styles.component} type='secondary' label={i18n.t('CHANGE_PASSWORD')} onPress={onPressChangePassword} />

                </View>
            </ScrollView>
        </Master>
    );
}

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
    },
    date: {
        alignSelf: 'stretch',
        marginTop: 10,
        marginRight: 10,
        marginBottom: 25,
        marginLeft: 10
    },
    enableEmailNotificationsText: {
        fontSize: 12
    }
});
