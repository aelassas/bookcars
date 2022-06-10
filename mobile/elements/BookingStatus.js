import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Helper from '../common/Helper';
import Env from '../config/env.config';

export default function BookingStatus(props) {

    return (
        <View style={{
            ...styles.container,
            ...props.style,
            backgroundColor:
                props.status === Env.BOOKING_STATUS.VOID ? '#999'
                    : props.status === Env.BOOKING_STATUS.PENDING ? '#e98003'
                        : props.status === Env.BOOKING_STATUS.DEPOSIT ? '#22bba7'
                            : props.status === Env.BOOKING_STATUS.PAID ? '#77bc23'
                                : props.status === Env.BOOKING_STATUS.RESERVED ? '#188ace'
                                    : props.status === Env.BOOKING_STATUS.CANCELLED ? '#bc2143'
                                        : 'transparent'
        }}>
            <Text style={styles.text}>{Helper.getBookingStatus(props.status)}</Text>
        </View>
    );
}

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