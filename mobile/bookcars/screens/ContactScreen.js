import React from 'react';
import { StyleSheet, Text } from 'react-native';
import Master from './Master';

export default function ContactScreen({ navigation }) {

    return (
        <Master style={styles.container}>
            <Text style={{ fontSize: 16 }}>Contact!</Text>
        </Master>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center'
    }
});