import React from 'react';
import { StyleSheet, Text, Pressable } from 'react-native';

export default function Button(props) {
    const small = props.size === 'small';

    const onPress = () => {
        if (props.onPress) props.onPress();
    };

    const styles = StyleSheet.create({
        button: {
            height: small ? 37 : 55,
            borderRadius: 10,
            backgroundColor: props.type === 'secondary' ? '#999' : '#f37022',
            alignItems: 'center',
            justifyContent: 'center',
            maxWidth: 480
        },
        text: {
            color: '#fff',
            textTransform: 'uppercase',
            fontSize: small ? 14 : 17,
            fontWeight: '600'
        },
    });

    return (
        <Pressable style={{ ...props.style, ...styles.button }} onPress={onPress} >
            <Text style={styles.text}>{props.label}</Text>
        </Pressable>
    );
}