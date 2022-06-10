import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';

import Master from './Master';
import i18n from '../lang/i18n';
import UserService from '../services/UserService';
import BookingList from '../elements/BookingList';
import CompanyFilter from '../elements/CompanyFilter';
import Env from '../config/env.config';
import Helper from '../common/Helper';
import StatusFilter from '../elements/StatusFilter';

export default function BookingsScreen({ navigation, route }) {
    const isFocused = useIsFocused();
    const [language, setLanguage] = useState(Env.DEFAULT_LANGUAGE);
    const [reload, setReload] = useState(false);
    const [visible, setVisible] = useState(false);
    const [user, setUser] = useState(null);
    const [companies, setCompanies] = useState([]);
    const [statuses, setStatuses] = useState([]);

    const _init = async () => {
        try {
            setVisible(false);
            setUser(null);
            setCompanies([]);

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

    const onChangeCompanies = (companies) => {
        setCompanies(companies);
    }

    const onLoadStatuses = (statuses) => {
        setStatuses(statuses);
    };

    const onChangeStatuses = (statuses) => {
        setStatuses(statuses);
    }

    return (
        <Master style={styles.master} navigation={navigation} onLoad={onLoad} reload={reload} strict>
            {visible &&
                <BookingList
                    user={user._id}
                    companies={companies}
                    statuses={statuses}
                    language={language}
                    header={
                        <View>
                            <CompanyFilter style={styles.filter} onLoad={onLoadCompanies} onChange={onChangeCompanies} />
                            <StatusFilter style={styles.filter} onLoad={onLoadStatuses} onChange={onChangeStatuses} />
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