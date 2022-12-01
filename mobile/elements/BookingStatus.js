import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import * as Helper from '../common/Helper';
import Env from '../config/env.config';

const BookingStatus = ({ style, status }) => (
    <View style={{
        ...styles.container,
        ...style,
        backgroundColor:
            status === Env.BOOKING_STATUS.VOID ? '#999'
                : status === Env.BOOKING_STATUS.PENDING ? '#e98003'
                    : status === Env.BOOKING_STATUS.DEPOSIT ? '#22bba7'
                        : status === Env.BOOKING_STATUS.PAID ? '#77bc23'
                            : status === Env.BOOKING_STATUS.RESERVED ? '#188ace'
                                : status === Env.BOOKING_STATUS.CANCELLED ? '#bc2143'
                                    : 'transparent'
    }}>
        <Text style={styles.text}>{Helper.getBookingStatus(status)}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: {
        height: 28,
        justifyContent: 'center',
        alignItems: 'center'
    },
    text: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '400'
    }
});

export default BookingStatus;