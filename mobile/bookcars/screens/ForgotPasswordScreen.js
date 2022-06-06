import React, { useEffect, useState } from 'react';
import { StyleSheet, ScrollView, View, Text } from 'react-native';
import { useNavigationState } from '@react-navigation/native';

import Master from './Master';
import TextInput from '../elements/TextInput';
import Button from '../elements/Button';
import i18n from '../lang/i18n';
import UserService from '../services/UserService';

export default function ForgotPasswordScreen({ navigation }) {
    const [email, onChangeEmail] = useState('');

    const routes = useNavigationState(state => state && state.routes);

    const _init = async () => {
        const language = await UserService.getLanguage();
        i18n.locale = language;
    };

    useEffect(() => {
        _init();
    }, [routes]);

    const onPressReset = () => {
        console.log('reset!')
    };

    return (
        <Master style={styles.master}>
            <ScrollView
                contentContainerStyle={styles.container}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
            >
                <View style={styles.contentContainer}>
                    <Text style={styles.text}>{i18n.t('RESET_PASSWORD')}</Text>

                    <TextInput style={styles.component} label={i18n.t('EMAIL')} onChangeText={onChangeEmail} />

                    <Button style={styles.component} label={i18n.t('RESET')} onPress={onPressReset} />
                </View>
            </ScrollView>
        </Master>
    );
}

const styles = StyleSheet.create({
    text: {
        color: 'rgba(0, 0, 0, 0.6)',
        fontSize: 15,
        fontWeight: '400',
        alignSelf: 'stretch',
        margin: 10,
        padding: 5
    },
    master: {
        flex: 1,
    },
    container: {
        justifyContent: 'center',
        alignItems: 'center',
        flexGrow: 1
    },
    contentContainer: {
        width: 420,
        alignItems: 'center'
    },
    component: {
        alignSelf: 'stretch',
        margin: 10,
    },
});