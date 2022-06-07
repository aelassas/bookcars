import React, { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useIsFocused } from '@react-navigation/native';

import Master from './Master';
import i18n from '../lang/i18n';
import UserService from '../services/UserService';

export default function BookingsScreen({ navigation, route }) {
    const isFocused = useIsFocused();
    const [reload, setReload] = useState(false);
    const [visible, setVisible] = useState(false);

    const _init = async () => {
        const language = await UserService.getLanguage();
        i18n.locale = language;
        setVisible(true);
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

    return (
        <Master style={styles.container} navigation={navigation} onLoad={onLoad} reload={reload} strict>
            {visible &&
                <Text style={{ fontSize: 16 }}>Bookings!</Text>
            }
        </Master>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center'
    }
});