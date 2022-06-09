import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';

import Master from './Master';
import i18n from '../lang/i18n';
import UserService from '../services/UserService';
import BookingList from '../elements/BookingList';
import CompanyFilter from '../elements/CompanyFilter';

export default function BookingsScreen({ navigation, route }) {
    const isFocused = useIsFocused();
    const [reload, setReload] = useState(false);
    const [visible, setVisible] = useState(false);
    const [user, setUser] = useState(null);
    const [companies, setCompanies] = useState([]);

    const _init = async () => {
        try {
            setVisible(false);
            setUser(null);
            setCompanies([]);

            const language = await UserService.getLanguage();
            i18n.locale = language;

            const currentUser = await UserService.getCurrentUser();

            if (!currentUser) {
                UserService.signout(navigation, false, true);
            }

            const user = await UserService.getUser(currentUser.id);

            if (!user) {
                UserService.signout(navigation, false, true);
            }

            setUser(user);
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

    const onLoadCompanies = (companies) => {
        setCompanies(companies);
    };

    return (
        <Master style={styles.master} navigation={navigation} onLoad={onLoad} reload={reload} strict>
            {visible &&
                <BookingList
                    user={user._id}
                    companies={companies}
                    header={
                        <View>
                            <CompanyFilter onLoad={onLoadCompanies} />
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
    }
});