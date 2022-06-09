import React, { useState, useEffect } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View, Text, Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import moment from 'moment';
import 'moment/locale/fr';

import Env from '../config/env.config';
import i18n from '../lang/i18n';
import Helper from '../common/Helper';
import BookingService from '../services/BookingService';

export default function BookingList(props) {
    const [loading, setLoading] = useState(true);
    const [fetch, setFetch] = useState(false);
    const [page, setPage] = useState(0);
    const [rows, setRows] = useState([]);
    const [statuses, setStatuses] = useState(Helper.getBookingStatuses().map(status => status.value));
    const [filter, setFilter] = useState(null);

    const format = 'dddd, D MMMM YYYY';
    const iconSize = 24;
    const iconColor = '#000';

    const _fetch = async () => {
        try {
            if (props.companies.length > 0) {
                const payload = { companies: props.companies, statuses, filter, user: props.user };
                setLoading(true);
                const data = await BookingService.getBookings(payload, page, Env.BOOKINGS_PAGE_SIZE);
                const _data = data.length > 0 ? data[0] : {};
                const _rows = page === 0 ? _data.resultData : [...rows, ..._data.resultData];
                setRows(_rows);
                setFetch(_data.resultData.length > 0);
                setLoading(false);
                console.log('_fetch.page', page);
            } else {
                setRows([]);
            }
        } catch (err) {
            Helper.error(err);
        }
    };

    useEffect(() => {
        if (page > 0) {
            _fetch();
        }
    }, [page]);

    useEffect(() => {
        if (page > 0) {
            setPage(0);
        } else {
            _fetch();
        }
    }, [props.companies]);

    return (
        <View style={styles.container}>
            <FlatList
                contentContainerStyle={styles.contentContainer}
                style={styles.flatList}
                data={rows}
                renderItem={({ item: booking, index }) => {
                    const from = new Date(booking.from)
                    const to = new Date(booking.to);

                    return (
                        <View key={booking._id} style={styles.bookingContainer}>
                            <View style={styles.booking}>
                                <View style={styles.header}>
                                    <MaterialIcons name='directions-car' size={iconSize} color={iconColor} />
                                    <Text style={styles.headerText}>{booking.car.name}</Text>
                                </View>

                                <Text style={styles.detailTitle}>{i18n.t('DAYS')}</Text>
                                <Text style={styles.detailText}>
                                    {`${Helper.getDaysShort(Helper.days(from, to))} (${Helper.capitalize(moment(from).format(format))} - ${Helper.capitalize(moment(to).format(format))})`}
                                </Text>

                                <Text style={styles.detailTitle}>{i18n.t('PICKUP_LOCATION')}</Text>
                                <Text style={styles.detailText}>{booking.pickupLocation.name}</Text>

                                <Text style={styles.detailTitle}>{i18n.t('DROP_OFF_LOCATION')}</Text>
                                <Text style={styles.detailText}>{booking.dropOffLocation.name}</Text>

                                <Text style={styles.detailTitle}>{i18n.t('CAR')}</Text>
                                <Text style={styles.detailText}>{booking.car.name}</Text>

                                <Text style={styles.detailTitle}>{i18n.t('COMPANY')}</Text>
                                <View style={styles.company}>
                                    <View style={styles.companyImgView}>
                                        <View style={styles.companyImgContainer}>
                                            <Image style={styles.companyImg} source={{ uri: Helper.joinURL(Env.CDN_USERS, booking.company.avatar) }} />
                                        </View>
                                    </View>
                                    <Text style={styles.companyText}>{booking.company.fullName}</Text>
                                </View>

                                <Text style={styles.detailTitle}>{i18n.t('COST')}</Text>
                                <Text style={styles.detailTextBold}>{`${booking.price} ${i18n.t('CURRENCY')}`}</Text>
                            </View>
                        </View>
                    );
                }}
                keyExtractor={(item, index) => item._id}
                onEndReached={() => {
                    if (fetch) {
                        setPage(page + 1);
                    }
                }}
                ListHeaderComponent={props.header}
                ListFooterComponent={fetch && <ActivityIndicator size='large' color='#f37022' style={styles.indicator} />}
                ListEmptyComponent={
                    !loading &&
                    <View>
                        <Text style={styles.text}>{i18n.t('EMPTY_BOOKING_LIST')}</Text>
                    </View>
                }
                refreshing={loading}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center'
    },
    text: {
        color: '#333',
        fontSize: 12
    },
    contentContainer: {
        alignSelf: 'stretch',
        paddingTop: 10,
        paddingBottom: 10,
    },
    flatList: {
        alignSelf: 'stretch'
    },
    indicator: {
        margin: 10
    },
    bookingContainer: {
        marginRight: 5,
        marginLeft: 5,
        marginBottom: 5,
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'stretch',
    },
    booking: {
        width: '100%',
        maxWidth: 480,
        backgroundColor: '#fff',
        paddingTop: 20,
        paddingRight: 10,
        paddingBottom: 20,
        paddingLeft: 10,
        borderWidth: 1,
        borderColor: '#d9d8d9',
        borderRadius: 5,
    },
    header: {
        flexDirection: 'row',
        alignSelf: 'stretch',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15
    },
    headerText: {
        color: '#444',
        fontSize: 16,
        fontWeight: '700',
        marginLeft: 5
    },
    detailTitle: {
        alignSelf: 'stretch',
        alignItems: 'center',
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 2
    },
    detailText: {
        color: 'rgba(0, 0, 0, 0.35)',
        fontSize: 12,
        marginBottom: 10
    },
    detailTextBold: {
        fontSize: 15,
        fontWeight: '700'
    },
    company: {
        flexDirection: 'row',
        marginBottom: 10,
        alignItems: 'center'
    },
    companyImgView: {
        height: Env.COMPANY_IMAGE_HEIGHT,
        width: Env.COMPANY_IMAGE_WIDTH,
        alignItems: 'center',
    },
    companyImgContainer: {
        width: Env.COMPANY_IMAGE_WIDTH,
        height: Env.COMPANY_IMAGE_HEIGHT,
    },
    companyImg: {
        flex: 1,
        width: null,
        height: null,
        maxWidth: Env.COMPANY_IMAGE_WIDTH,
        maxHeight: Env.COMPANY_IMAGE_HEIGHT,
        resizeMode: 'contain',
    },
    companyText: {
        color: '#a1a1a1',
        fontSize: 10,
        marginLeft: 5
    },
});