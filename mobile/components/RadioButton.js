import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from '@expo/vector-icons';

const RadioButton = (props) => {

    const onPress = () => {
        if (props.onValueChange) props.onValueChange(!props.checked);
    };

    return (
        <View style={{ ...styles.container, ...props.style }}>
            <MaterialIcons name={props.checked ? 'radio-button-on' : 'radio-button-off'} size={18} color='#f37022' onPress={onPress} />
            <Pressable style={styles.pressable} onPress={onPress}>
                <Text style={{ ...styles.text, ...props.textStyle }} >{props.label}</Text>
            </Pressable>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        display: 'flex',
        alignItems: 'center',
        maxWidth: 480
    },
    pressable: {
        flexShrink: 1
    },
    text: {
        color: 'rgba(0, 0, 0, .7)',
        padding: 5
    },
});

export default RadioButton;