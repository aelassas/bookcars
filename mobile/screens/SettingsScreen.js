import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView, Pressable } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { Avatar, Dialog, Portal, Button as NativeButton, Paragraph, Badge } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import validator from 'validator';
import { intervalToDuration } from 'date-fns';
import Master from './Master';
import i18n from '../lang/i18n';
import * as UserService from '../services/UserService';
import TextInput from '../elements/TextInput';
import DateTimePicker from '../elements/DateTimePicker';
import Switch from '../elements/Switch';
import Button from '../elements/Button';
import * as Helper from '../common/Helper';
import Env from '../config/env.config';

const SettingsScreen = ({ navigation, route }) => {
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
    const [avatar, setAvatar] = useState(null);
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [fullNameRequired, setFullNameRequired] = useState(false);
    const [phoneRequired, setPhoneRequired] = useState(false);
    const [phoneValid, setPhoneValid] = useState(true);
    const [birthDateRequired, setBirthDateRequired] = useState(false);
    const [birthDateValid, setBirthDateValid] = useState(true);

    const _init = async () => {
        try {
            const language = await UserService.getLanguage();
            i18n.locale = language;
            setLanguage(language);

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
            if (user.avatar) {
                setAvatar(Helper.joinURL(Env.CDN_USERS, user.avatar));
            } else {
                setAvatar(null);
            }
            setFullName(user.fullName);
            setEmail(user.email);
            setPhone(user.phone);
            setBirthDate(new Date(user.birthDate))
            setLocation(user.location);
            setBio(user.bio);
            setEnableEmailNotifications(user.enableEmailNotifications);

            setFullNameRequired(false);
            setPhoneRequired(false);
            setPhoneValid(true);
            setBirthDateRequired(false);
            setBirthDateValid(true);

            setVisible(true);
        } catch (err) {
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

    const validateFullName = () => {
        const valid = fullName !== '';
        setFullNameRequired(!valid);
        return valid;
    };

    const onChangeFullName = (text) => {
        setFullName(text);

        if (text) {
            setFullNameRequired(false);
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
        <Master style={styles.master} navigation={navigation} route={route} onLoad={onLoad} reload={reload} avatar={avatar} strict>
            {
                visible && language &&
                <>
                    <ScrollView
                        contentContainerStyle={styles.container}
                        keyboardShouldPersistTaps='handled'
                        nestedScrollEnabled
                    >
                        <View style={styles.contentContainer}>

                            <View style={styles.avatar}>
                                {
                                    avatar ?
                                        <Avatar.Image size={94} source={{ uri: avatar }} />
                                        : <MaterialIcons name='account-circle' size={94} color='#bdbdbd' />
                                }
                                <View style={styles.avatarActions}>
                                    {
                                        avatar &&
                                        <Pressable
                                            style={styles.deleteAvatar}
                                            hitSlop={15}
                                            onPress={() => {
                                                setOpenDeleteDialog(true);
                                            }}>
                                            <Badge style={styles.badge} size={36}>
                                                <MaterialIcons name='broken-image' size={22} color='#373737' />
                                            </Badge>
                                        </Pressable>
                                    }
                                    <Pressable
                                        style={styles.updateAvatar}
                                        hitSlop={15}
                                        onPress={async () => {
                                            try {
                                                let permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

                                                if (permissionResult.granted === false) {
                                                    alert(i18n.t('CAMERA_PERMISSION'));
                                                    return;
                                                }

                                                let pickerResult = await ImagePicker.launchImageLibraryAsync();

                                                if (pickerResult.cancelled === true) {
                                                    return;
                                                }

                                                const uri = pickerResult.uri;
                                                const name = Helper.getFileName(uri);
                                                const type = Helper.getMimeType(name);
                                                const image = { uri, name, type };
                                                const status = await UserService.updateAvatar(user._id, image);

                                                if (status == 200) {
                                                    const _user = await UserService.getUser(user._id);
                                                    setUser(_user);
                                                    setAvatar(Helper.joinURL(Env.CDN_USERS, _user.avatar));
                                                } else {
                                                    Helper.error();
                                                }
                                            }
                                            catch (err) {
                                                await UserService.signout(navigation);
                                            }

                                        }}>
                                        <Badge style={styles.badge} size={36}>
                                            <MaterialIcons name='photo-camera' size={22} color='#373737' />
                                        </Badge>
                                    </Pressable>
                                </View>
                            </View>

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

                            <Button style={styles.component} color='secondary' label={i18n.t('CHANGE_PASSWORD')} onPress={onPressChangePassword} />

                        </View>
                    </ScrollView>

                    <Portal>
                        <Dialog
                            style={styles.dialog}
                            visible={openDeleteDialog}
                            dismissable={false}
                        >
                            <Dialog.Title style={styles.dialogTitleContent}>{i18n.t('CONFIRM_TITLE')}</Dialog.Title>
                            <Dialog.Content style={styles.dialogContent}>
                                <Paragraph>{i18n.t('DELETE_AVATAR')}</Paragraph>
                            </Dialog.Content>
                            <Dialog.Actions style={styles.dialogActions}>
                                <NativeButton
                                    color='#f37022'
                                    onPress={() => {
                                        setOpenDeleteDialog(false);
                                    }}
                                >
                                    {i18n.t('CANCEL')}
                                </NativeButton>
                                <NativeButton
                                    color='#f37022'
                                    onPress={async () => {
                                        try {
                                            const status = await UserService.deleteAvatar(user._id);

                                            if (status === 200) {
                                                setAvatar(null);
                                                setOpenDeleteDialog(false);
                                            } else {
                                                Helper.error();
                                            }
                                        }
                                        catch (err) {
                                            await UserService.signout(navigation);
                                        }
                                    }}
                                >
                                    {i18n.t('DELETE')}
                                </NativeButton>
                            </Dialog.Actions>
                        </Dialog>
                    </Portal>
                </>
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
    avatar: {
        marginTop: 10,
        marginBottom: 10
    },
    avatarActions: {
        flexDirection: 'row',
        marginTop: -26,
    },
    updateAvatar: {
        alignSelf: 'flex-end',
        marginLeft: 'auto',
        padding: 5,
    },
    deleteAvatar: {
        alignSelf: 'flex-start',
        padding: 5
    },
    badge: {
        backgroundColor: '#ddd'
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
    },
    dialogTitleContent: {
        textAlign: 'center',
    },
    dialogContent: {
        alignItems: 'center',
        justifyContent: 'center'
    },
    dialogActions: {
        height: 75
    },
});

export default SettingsScreen;