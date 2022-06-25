import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import UserService from '../services/UserService';
import Button from '../elements/Button';
import i18n from '../lang/i18n';
import Helper from '../common/Helper';

export default function Master(props) {
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);

    const exit = () => {
        if (props.strict) {
            UserService.signout(props.navigation, false, true);
        } else {
            setLoading(false);
            UserService.signout(props.navigation, false, false);

            if (props.onLoad) {
                props.onLoad();
            }

            if (props.navigation && props.route) {
                props.navigation.navigate(props.route.name, { d: new Date().getTime() });
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
                            exit();
                            return;
                        }

                        setLoading(false);
                        setUser(user);

                        if (props.onLoad) {
                            props.onLoad(user);
                        }
                    } else {
                        exit();
                    }
                } else {
                    exit();
                }

            } else {
                setUser(null);
                exit();
            }
        } catch (err) {
            Helper.error(err, false);
            exit();
        }
    };

    useEffect(() => {
        if (props.reload) _init();
    }, [props.reload]);

    const handleResend = () => {
        const data = { email: user.email };

        UserService.resendLink(data)
            .then(status => {
                if (status === 200) {
                    Helper.toast(i18n.t('VALIDATION_EMAIL_SENT'));
                } else {
                    Helper.toast(i18n.t('VALIDATION_EMAIL_ERROR'));
                }
            }).catch(err => {
                UserService.signout();
            });
    };

    return (
        !loading &&
        <View style={{ ...styles.container, ...props.style }}>
            {((!user && !props.strict) || (user && user.verified))
                ?
                props.children
                :
                <View style={styles.validate}>
                    <Text style={styles.validateText}>{i18n.t('VALIDATE_EMAIL')}</Text>
                    <Button style={styles.validateButton} label={i18n.t('RESEND')} onPress={handleResend} />
                </View>
            }
        </View>
    );
}

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