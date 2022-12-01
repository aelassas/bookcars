import React, { useState, useEffect } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View, Text, Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Paragraph, Dialog, Portal, Button as NativeButton } from 'react-native-paper';
import { format } from 'date-fns';
import { enUS, fr } from 'date-fns/locale';

import Env from '../config/env.config';
import i18n from '../lang/i18n';
import * as Helper from '../common/Helper';
import * as BookingService from '../services/BookingService';
import BookingStatus from './BookingStatus';
import Button from './Button';

const BookingList = (props) => {
    const [loading, setLoading] = useState(true);
    const [fetch, setFetch] = useState(false);
    const [page, setPage] = useState(0);
    const [rows, setRows] = useState([]);
    const [selectedId, setSelectedId] = useState('');
    const [openCancelDialog, setOpenCancelDialog] = useState(false);
    const [cancelRequestProcessing, setCancelRequestProcessing] = useState(false);
    const [cancelRequestSent, setCancelRequestSent] = useState(false);
    const [deleted, setDeleted] = useState(false);
    const [locale, setLoacle] = useState(fr);

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
        setLoacle(props.language === Env.LANGUAGE.FR ? fr : enUS);
    }, [props.language]);

    useEffect(() => {
        if (page > 0) {
            _fetch();
        }
    }, [page]);

    useEffect(() => {
        if (props.companies) {
            if (page > 0) {
                _fetch(true);
            } else {
                _fetch();
            }
        }
    }, [props.companies, props.statuses, props.filter]);

    useEffect(() => {
        async function init() {
            try {
                setLoading(true);
                setFetch(true);
                const booking = await BookingService.getBooking(props.booking);
                setRows(booking ? [booking] : []);
                if (!booking) setDeleted(true);
                setFetch(false);
                setLoading(false);
            } catch (err) {
                Helper.error(err);
            }
        }

        if (props.booking) init();
    }, [props.booking]);

    const _fr = props.language === Env.LANGUAGE.FR;
    const _format = 'eee d LLLL yyyy kk:mm';
    const iconSize = 24;
    const iconColor = '#000';
    const extraIconColor = '#1f9201';
    const extraIconSize = 16;

    return (
        <View style={styles.container}>
            <FlatList
                keyboardShouldPersistTaps='handled'
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
                                    {`${Helper.getDaysShort(Helper.days(from, to))} (${Helper.capitalize(format(from, _format, { locale }))} - ${Helper.capitalize(format(to, _format, { locale }))})`}
                                </Text>

                                <Text style={styles.detailTitle}>{i18n.t('PICKUP_LOCATION')}</Text>
                                <Text style={styles.detailText}>{booking.pickupLocation.name}</Text>

                                <Text style={styles.detailTitle}>{i18n.t('DROP_OFF_LOCATION')}</Text>
                                <Text style={styles.detailText}>{booking.dropOffLocation.name}</Text>

                                <Text style={styles.detailTitle}>{i18n.t('CAR')}</Text>
                                <Text style={styles.detailText}>{`${booking.car.name} (${booking.car.price} ${i18n.t('CAR_CURRENCY')})`}</Text>

                                <Text style={styles.detailTitle}>{i18n.t('SUPPLIER')}</Text>
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
                                                    <Text style={styles.extraText}>{Helper.getCancellationOption(booking.car.cancellation, _fr, true)}</Text>
                                                </View>
                                            }

                                            {booking.amendments &&
                                                <View style={styles.extra}>
                                                    <MaterialIcons style={styles.extraIcon} name='check' size={extraIconSize} color={extraIconColor} />
                                                    <Text style={styles.extraTitle}>{i18n.t('AMENDMENTS')}</Text>
                                                    <Text style={styles.extraText}>{Helper.getAmendmentsOption(booking.car.amendments, _fr, true)}</Text>
                                                </View>
                                            }

                                            {booking.collisionDamageWaiver &&
                                                <View style={styles.extra}>
                                                    <MaterialIcons style={styles.extraIcon} name='check' size={extraIconSize} color={extraIconColor} />
                                                    <Text style={styles.extraTitle}>{i18n.t('COLLISION_DAMAGE_WAVER')}</Text>
                                                    <Text style={styles.extraText}>{Helper.getCollisionDamageWaiverOption(booking.car.collisionDamageWaiver, days, _fr, true)}</Text>
                                                </View>
                                            }

                                            {booking.theftProtection &&
                                                <View style={styles.extra}>
                                                    <MaterialIcons style={styles.extraIcon} name='check' size={extraIconSize} color={extraIconColor} />
                                                    <Text style={styles.extraTitle}>{i18n.t('THEFT_PROTECTION')}</Text>
                                                    <Text style={styles.extraText}>{Helper.getTheftProtectionOption(booking.car.theftProtection, days, _fr, true)}</Text>
                                                </View>
                                            }

                                            {booking.fullInsurance &&
                                                <View style={styles.extra}>
                                                    <MaterialIcons style={styles.extraIcon} name='check' size={extraIconSize} color={extraIconColor} />
                                                    <Text style={styles.extraTitle}>{i18n.t('FULL_INSURANCE')}</Text>
                                                    <Text style={styles.extraText}>{Helper.getFullInsuranceOption(booking.car.fullInsurance, days, _fr, true)}</Text>
                                                </View>
                                            }

                                            {booking.additionalDriver &&
                                                <View style={styles.extra}>
                                                    <MaterialIcons style={styles.extraIcon} name='check' size={extraIconSize} color={extraIconColor} />
                                                    <Text style={styles.extraTitle}>{i18n.t('ADDITIONAL_DRIVER')}</Text>
                                                    <Text style={styles.extraText}>{Helper.getAdditionalDriverOption(booking.car.additionalDriver, days, _fr, true)}</Text>
                                                </View>
                                            }
                                        </View>
                                    </>
                                }

                                <Text style={styles.detailTitle}>{i18n.t('COST')}</Text>
                                <Text style={styles.detailTextBold}>{`${booking.price} ${i18n.t('CURRENCY')}`}</Text>

                                {booking.cancellation
                                    && !booking.cancelRequest
                                    && booking.status !== Env.BOOKING_STATUS.CANCELLED
                                    && new Date(booking.from) > new Date()
                                    && <Button
                                        size='small'
                                        color='secondary'
                                        style={styles.button}
                                        label={i18n.t('CANCEL_BOOKING_BTN')}
                                        onPress={() => {
                                            setSelectedId(booking._id);
                                            setOpenCancelDialog(true);
                                        }}
                                    />
                                }

                                <Portal>
                                    <Dialog
                                        style={styles.dialog}
                                        visible={openCancelDialog}
                                        dismissable={false}
                                    >
                                        <Dialog.Title style={styles.dialogTitleContent}>
                                            {
                                                ((!cancelRequestSent && !cancelRequestProcessing && i18n.t('CONFIRM_TITLE')) || '')
                                            }
                                        </Dialog.Title>
                                        <Dialog.Content style={styles.dialogContent}>
                                            {
                                                cancelRequestProcessing ?
                                                    <ActivityIndicator size='large' color='#f37022' />
                                                    : cancelRequestSent ? <Paragraph>{i18n.t('CANCEL_BOOKING_REQUEST_SENT')}</Paragraph>
                                                        : <Paragraph>{i18n.t('CANCEL_BOOKING')}</Paragraph>
                                            }
                                        </Dialog.Content>
                                        <Dialog.Actions style={styles.dialogActions}>
                                            {
                                                !cancelRequestProcessing &&
                                                <NativeButton
                                                    color='#f37022'
                                                    onPress={() => {
                                                        setOpenCancelDialog(false);
                                                        if (cancelRequestSent) {
                                                            setTimeout(() => {
                                                                setCancelRequestSent(false);
                                                            }, 500);
                                                        }
                                                    }}
                                                >
                                                    {i18n.t('CLOSE')}
                                                </NativeButton>
                                            }
                                            {
                                                !cancelRequestSent && !cancelRequestProcessing &&
                                                <NativeButton
                                                    color='#f37022'
                                                    onPress={async () => {
                                                        try {
                                                            setCancelRequestProcessing(true);
                                                            const status = await BookingService.cancel(selectedId);

                                                            if (status === 200) {
                                                                const row = rows.find(r => r._id === selectedId);
                                                                row.cancelRequest = true;

                                                                setCancelRequestSent(true);
                                                                setRows(rows);
                                                                setSelectedId('');
                                                                setCancelRequestProcessing(false);
                                                            } else {
                                                                Helper.error();
                                                                setCancelRequestProcessing(false);
                                                                setOpenCancelDialog(false);
                                                            }
                                                        } catch (err) {
                                                            Helper.error(err);
                                                            setCancelRequestProcessing(false);
                                                            setOpenCancelDialog(false);
                                                        }
                                                    }}
                                                >
                                                    {i18n.t('CONFIRM')}
                                                </NativeButton>
                                            }
                                        </Dialog.Actions>
                                    </Dialog>
                                </Portal>
                            </View>
                        </View>
                    );
                }}
                keyExtractor={(item, index) => item._id}
                onEndReached={() => {
                    if (fetch && props.companies) {
                        setPage(page + 1);
                    }
                }}
                ListHeaderComponent={props.header}
                ListFooterComponent={fetch && !openCancelDialog && <ActivityIndicator size='large' color='#f37022' style={styles.indicator} />}
                ListEmptyComponent={
                    !loading &&
                    <View style={styles.container}>
                        <Text style={styles.text}>{deleted ? i18n.t('BOOKING_DELETED') : i18n.t('EMPTY_BOOKING_LIST')}</Text>
                    </View>
                }
                refreshing={loading}
            />
        </View>
    );
};

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
    button: {
        marginTop: 15
    },
    dialog: {
        width: '90%',
        maxWidth: 480,
        alignSelf: 'center'
    },
    dialogTitleContent: {
        textAlign: 'center',
    },
    dialogContent: {
        alignItems: 'center',
        justifyContent: 'center'
    },
    dialogActions: {
        height: 75
    }
});

export default BookingList;