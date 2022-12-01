import React from "react";
import { StyleSheet, View, Text } from 'react-native';

const Error = (props) => (
    <View style={props.style}>
        <Text style={styles.text}>{props.message}</Text>
    </View>
);

const styles = StyleSheet.create({
    text: {
        color: '#d32f2f'
    }
});

export default Error;