import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import Master from './Master';
import i18n from '../lang/i18n';
import * as UserService from '../services/UserService';
import BookingList from '../elements/BookingList';
import CompanyFilter from '../elements/CompanyFilter';
import Env from '../config/env.config';
import StatusFilter from '../elements/StatusFilter';
import * as BookingService from '../services/BookingService';
import BookingFilter from '../elements/BookingFilter';

const BookingsScreen = ({ navigation, route }) => {
    const isFocused = useIsFocused();
    const [language, setLanguage] = useState(Env.DEFAULT_LANGUAGE);
    const [reload, setReload] = useState(false);
    const [visible, setVisible] = useState(false);
    const [user, setUser] = useState(null);
    const [hasBookings, setHasBookings] = useState(false);
    const [companies, setCompanies] = useState([]);
    const [statuses, setStatuses] = useState([]);
    const [filter, setFilter] = useState(null);

    const _init = async () => {
        try {
            setVisible(false);
            setUser(null);
            setCompanies([]);
            setFilter(null);

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

            const hasBookingsStatus = await BookingService.hasBookings(user._id);
            const hasBookings = hasBookingsStatus === 200;
            setHasBookings(hasBookings);

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
    };

    const onSubmitBookingFilter = (filter) => {
        setFilter(filter);
    };

    return (
        <Master style={styles.master} navigation={navigation} route={route} onLoad={onLoad} reload={reload} strict>
            {visible &&
                <BookingList
                    user={user._id}
                    language={language}
                    companies={companies}
                    statuses={statuses}
                    filter={filter}
                    header={
                        <View>
                            <CompanyFilter style={styles.filter} visible={hasBookings} onLoad={onLoadCompanies} onChange={onChangeCompanies} />
                            <StatusFilter style={styles.filter} visible={hasBookings} onLoad={onLoadStatuses} onChange={onChangeStatuses} />
                            <BookingFilter style={styles.filter} visible={hasBookings} driver={user._id} onSubmit={onSubmitBookingFilter} />
                        </View>
                    }
                />
            }
        </Master>
    );
};

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

export default BookingsScreen;