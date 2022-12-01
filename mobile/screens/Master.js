import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import * as UserService from '../services/UserService';
import Button from '../elements/Button';
import i18n from '../lang/i18n';
import * as Helper from '../common/Helper';
import Header from '../elements/Header';
import * as NotificationService from '../services/NotificationService';

const Master = (props) => {
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [loggedIn, setLoggedIn] = useState(false);
    const [notificationCount, setNotificationCount] = useState(0);

    const exit = async (reload = false) => {
        if (props.strict) {
            await UserService.signout(props.navigation, false, true);

            if (props.onLoad) {
                props.onLoad();
            }
        } else {
            await UserService.signout(props.navigation, false, false);
            setLoggedIn(false);

            if (props.onLoad) {
                props.onLoad();
            }

            if (reload) {
                props.navigation.navigate(props.route.name, { d: new Date().getTime() });
            } else {
                setLoading(false);
            }
        }
    };

    const _init = async () => {
        try {
            setLoading(true);

            const language = await UserService.getLanguage();
            i18n.locale = language;

            const currentUser = await UserService.getCurrentUser();

            if (currentUser) {
                const status = await UserService.validateAccessToken();

                if (status === 200) {
                    const user = await UserService.getUser(currentUser.id);

                    if (user) {

                        if (user.blacklisted) {
                            await exit(true);
                            return;
                        }

                        const notificationCounter = await NotificationService.getNotificationCounter(currentUser.id);
                        setNotificationCount(notificationCounter.count);

                        setLoggedIn(true);
                        setUser(user);
                        setLoading(false);

                        if (props.onLoad) {
                            props.onLoad(user);
                        }
                    } else {
                        await exit(true);
                    }
                } else {
                    await exit(true);
                }

            } else {
                setUser(null);
                await exit(false);
            }
        } catch (err) {
            Helper.error(err, false);
            await exit(true);
        }
    };

    useEffect(() => {
        if (props.reload) _init();
    }, [props.reload]);

    useEffect(() => {
        setNotificationCount(props.notificationCount);
    }, [props.notificationCount]);

    const handleResend = () => {
        const data = { email: user.email };

        UserService.resendLink(data)
            .then(status => {
                if (status === 200) {
                    Helper.toast(i18n.t('VALIDATION_EMAIL_SENT'));
                } else {
                    Helper.toast(i18n.t('VALIDATION_EMAIL_ERROR'));
                }
            }).catch(async (err) => {
                Helper.error(err);
                await UserService.signout();
            });
    };

    return (
        <View style={{ ...styles.container, ...props.style }}>
            <Header title={props.title} hideTitle={props.hideTitle} loggedIn={loggedIn} notificationCount={notificationCount} reload={props.reload} _avatar={props.avatar} />
            {!loading &&
                (
                    ((!user && !props.strict) || (user && user.verified))
                        ?
                        props.children
                        :
                        <View style={styles.validate}>
                            <Text style={styles.validateText}>{i18n.t('VALIDATE_EMAIL')}</Text>
                            <Button style={styles.validateButton} label={i18n.t('RESEND')} onPress={handleResend} />
                        </View>
                )
            }
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#fafafa',
    },
    validate: {
        marginTop: 15,
        padding: 15

    },
    validateText: {
        color: 'rgba(0, 0, 0, .7)',
        fontSize: 14,
        lineHeight: 20
    },
    validateButton: {
        marginTop: 15
    }
});

export default Master;