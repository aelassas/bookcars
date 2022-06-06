import React from 'react';
import { StyleSheet, Text } from 'react-native';
import Master from './Master';

export default function BookingsScreen({ navigation, route }) {

    return (
        <Master style={styles.container} navigation={navigation} strict>
            <Text style={{ fontSize: 16 }}>Bookings!</Text>
        </Master>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center'
    }
});