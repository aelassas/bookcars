import React, { useState, useEffect } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View, Text, Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import moment from 'moment';
import 'moment/locale/fr';

import Env from '../config/env.config';
import i18n from '../lang/i18n';
import Helper from '../common/Helper';
import BookingService from '../services/BookingService';
import BookingStatus from './BookingStatus';
import Switch from './Switch';

export default function BookingList(props) {
    const [loading, setLoading] = useState(true);
    const [fetch, setFetch] = useState(false);
    const [page, setPage] = useState(0);
    const [rows, setRows] = useState([]);

    const fr = props.language === Env.LANGUAGE.FR;
    const format = 'dddd, D MMMM YYYY';
    const iconSize = 24;
    const iconColor = '#000';
    const extraIconColor = '#1f9201';
    const extraIconSize = 16;

    const _fetch = async (reset = false) => {
        try {
            if (props.companies.length > 0 && props.statuses.length > 0) {
                let _page = page;
                if (reset) {
                    _page = 0;
                    setPage(0);
                }
                const payload = { companies: props.companies, statuses: props.statuses, filter: props.filter, user: props.user };
                setLoading(true);
                setFetch(true);
                const data = await BookingService.getBookings(payload, _page, Env.BOOKINGS_PAGE_SIZE);
                const _data = data.length > 0 ? data[0] : {};
                const _rows = _page === 0 ? _data.resultData : [...rows, ..._data.resultData];
                setRows(_rows);
                setFetch(_data.resultData.length > 0);
                setLoading(false);
            } else {
                setRows([]);
                setFetch(false);
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
            _fetch(true);
        } else {
            _fetch();
        }
    }, [props.companies, props.statuses, props.filter]);

    return (
        <View style={styles.container}>
            <FlatList
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
                contentContainerStyle={styles.contentContainer}
                style={styles.flatList}
                data={rows}
                renderItem={({ item: booking, index }) => {
                    const from = new Date(booking.from)
                    const to = new Date(booking.to);
                    const days = Helper.days(from, to);

                    return (
                        <View key={booking._id} style={styles.bookingContainer}>
                            <View style={styles.booking}>
                                <View style={styles.header}>
                                    <MaterialIcons name='directions-car' size={iconSize} color={iconColor} />
                                    <Text style={styles.headerText}>{booking.car.name}</Text>
                                </View>

                                <BookingStatus style={styles.status} status={booking.status} />

                                <Text style={styles.detailTitle}>{i18n.t('DAYS')}</Text>
                                <Text style={styles.detailText}>
                                    {`${Helper.getDaysShort(Helper.days(from, to))} (${Helper.capitalize(moment(from).format(format))} - ${Helper.capitalize(moment(to).format(format))})`}
                                </Text>

                                <Text style={styles.detailTitle}>{i18n.t('PICKUP_LOCATION')}</Text>
                                <Text style={styles.detailText}>{booking.pickupLocation.name}</Text>

                                <Text style={styles.detailTitle}>{i18n.t('DROP_OFF_LOCATION')}</Text>
                                <Text style={styles.detailText}>{booking.dropOffLocation.name}</Text>

                                <Text style={styles.detailTitle}>{i18n.t('CAR')}</Text>
                                <Text style={styles.detailText}>{`${booking.car.name} (${booking.car.price} ${i18n.t('CAR_CURRENCY')})`}</Text>

                                <Text style={styles.detailTitle}>{i18n.t('COMPANY')}</Text>
                                <View style={styles.company}>
                                    <Image style={styles.companyImg} source={{ uri: Helper.joinURL(Env.CDN_USERS, booking.company.avatar) }} />
                                    <Text style={styles.companyText}>{booking.company.fullName}</Text>
                                </View>

                                {(booking.cancellation
                                    || booking.amendments
                                    || booking.collisionDamageWaiver
                                    || booking.theftProtection
                                    || booking.fullInsurance
                                    || booking.additionalDriver) &&
                                    <>
                                        <Text style={styles.detailTitle}>{i18n.t('OPTIONS')}</Text>
                                        <View style={styles.extras}>
                                            {booking.cancellation &&
                                                <View style={styles.extra}>
                                                    <MaterialIcons style={styles.extraIcon} name='check' size={extraIconSize} color={extraIconColor} />
                                                    <Text style={styles.extraTitle}>{i18n.t('CANCELLATION')}</Text>
                                                    <Text style={styles.extraText}>{Helper.getCancellationOption(booking.car.cancellation, fr, true)}</Text>
                                                </View>
                                            }

                                            {booking.amendments &&
                                                <View style={styles.extra}>
                                                    <MaterialIcons style={styles.extraIcon} name='check' size={extraIconSize} color={extraIconColor} />
                                                    <Text style={styles.extraTitle}>{i18n.t('AMENDMENTS')}</Text>
                                                    <Text style={styles.extraText}>{Helper.getAmendmentsOption(booking.car.amendments, fr, true)}</Text>
                                                </View>
                                            }

                                            {booking.collisionDamageWaiver &&
                                                <View style={styles.extra}>
                                                    <MaterialIcons style={styles.extraIcon} name='check' size={extraIconSize} color={extraIconColor} />
                                                    <Text style={styles.extraTitle}>{i18n.t('COLLISION_DAMAGE_WAVER')}</Text>
                                                    <Text style={styles.extraText}>{Helper.getCollisionDamageWaiverOption(booking.car.collisionDamageWaiver, days, fr, true)}</Text>
                                                </View>
                                            }

                                            {booking.theftProtection &&
                                                <View style={styles.extra}>
                                                    <MaterialIcons style={styles.extraIcon} name='check' size={extraIconSize} color={extraIconColor} />
                                                    <Text style={styles.extraTitle}>{i18n.t('THEFT_PROTECTION')}</Text>
                                                    <Text style={styles.extraText}>{Helper.getTheftProtectionOption(booking.car.theftProtection, days, fr, true)}</Text>
                                                </View>
                                            }

                                            {booking.fullInsurance &&
                                                <View style={styles.extra}>
                                                    <MaterialIcons style={styles.extraIcon} name='check' size={extraIconSize} color={extraIconColor} />
                                                    <Text style={styles.extraTitle}>{i18n.t('FULL_INSURANCE')}</Text>
                                                    <Text style={styles.extraText}>{Helper.getFullInsuranceOption(booking.car.fullInsurance, days, fr, true)}</Text>
                                                </View>
                                            }

                                            {booking.additionalDriver &&
                                                <View style={styles.extra}>
                                                    <MaterialIcons style={styles.extraIcon} name='check' size={extraIconSize} color={extraIconColor} />
                                                    <Text style={styles.extraTitle}>{i18n.t('ADDITIONAL_DRIVER')}</Text>
                                                    <Text style={styles.extraText}>{Helper.getAdditionalDriverOption(booking.car.additionalDriver, days, fr, true)}</Text>
                                                </View>
                                            }
                                        </View>
                                    </>
                                }

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
                    <View style={styles.container}>
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
        marginRight: 7,
        marginLeft: 7,
        marginBottom: 10,
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
        marginBottom: 3
    },
    detailText: {
        color: 'rgba(0, 0, 0, 0.35)',
        fontSize: 12,
        marginBottom: 10,
        flex: 1,
        flexWrap: 'wrap'
    },
    detailTextBold: {
        fontSize: 15,
        fontWeight: '700'
    },
    status: {
        marginBottom: 10
    },
    extras: {
        marginBottom: 10
    },
    extra: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 3
    },
    extraIcon: {
        marginRight: 4
    },
    extraTitle: {
        fontWeight: '600',
        fontSize: 12,
        marginRight: 5,
    },
    extraText: {
        color: 'rgba(0, 0, 0, 0.35)',
        fontSize: 11,
        flex: 1,
        flexWrap: 'wrap'
    },
    company: {
        flexDirection: 'row',
        marginBottom: 10,
        alignItems: 'center'
    },
    companyImg: {
        width: Env.COMPANY_IMAGE_WIDTH,
        height: Env.COMPANY_IMAGE_HEIGHT,
    },
    companyText: {
        color: '#a1a1a1',
        fontSize: 10,
        marginLeft: 5
    },
});