import React from 'react';
import { StyleSheet, Text, Pressable } from 'react-native';

const Link = (props) => {

    const onPress = () => {
        if (props.onPress) props.onPress();
    };

    return (
        <Pressable style={props.style} onPress={onPress} >
            <Text style={{ ...styles.text, ...props.textStyle }}>{props.label}</Text>
        </Pressable>
    );
};

const styles = StyleSheet.create({
    text: {
        color: '#1976d2',
        textDecorationLine: 'underline'
    }
});

export default Link;