import React, { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useIsFocused } from '@react-navigation/native';

import Master from './Master';
import i18n from '../lang/i18n';
import UserService from '../services/UserService';
import CarList from '../elements/CarList';

export default function CarsScreen({ navigation, route }) {
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
        route.params &&
        <Master style={styles.master} onLoad={onLoad} reload={reload}>
            {visible &&
                <CarList
                    pickupLocation={route.params.pickupLocation}
                    dropOffLocation={route.params.dropOffLocation}
                    from={new Date(route.params.from)}
                    to={new Date(route.params.to)}
                />
            }
        </Master>
    );
}

const styles = StyleSheet.create({
    master: {
        flex: 1
    }
});