import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';

import Master from './Master';
import i18n from '../lang/i18n';
import UserService from '../services/UserService';
import CarList from '../elements/CarList';
import CompanyFilter from '../elements/CompanyFilter';

export default function CarsScreen({ navigation, route }) {
    const isFocused = useIsFocused();
    const [reload, setReload] = useState(false);
    const [visible, setVisible] = useState(false);
    const [companies, setCompanies] = useState([]);

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

    const onLoadCompanies = (companies) => {
        setCompanies(companies);
    };

    const onChangeCompanies = (companies) => {
        setCompanies(companies);
    }

    return (
        route.params &&
        <Master style={styles.master} onLoad={onLoad} reload={reload}>
            {visible &&
                <CarList
                    navigation={navigation}
                    companies={companies}
                    pickupLocation={route.params.pickupLocation}
                    dropOffLocation={route.params.dropOffLocation}
                    from={new Date(route.params.from)}
                    to={new Date(route.params.to)}
                    header={
                        <View>
                            <CompanyFilter style={styles.filter} visible onLoad={onLoadCompanies} onChange={onChangeCompanies} />
                        </View>
                    }
                />
            }
        </Master>
    );
}

const styles = StyleSheet.create({
    master: {
        flex: 1
    },
    filter: {
        marginRight: 7,
        marginBottom: 10,
        marginLeft: 7
    }
});