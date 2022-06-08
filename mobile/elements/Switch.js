import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, Pressable, Switch as ReactSwitch } from 'react-native';

export default function Switch(props) {
    const [value, setValue] = useState(props.value);

    useEffect(() => {
        setValue(props.value);
    }, [props.value])

    const onValueChange = (value) => {
        setValue(value);
        if (props.onValueChange) props.onValueChange(value);
    };

    const onPress = () => {
        onValueChange(!value);
    };

    return (
        <View style={{ ...styles.switch, ...props.style }}>
            <ReactSwitch trackColor={{ true: '#f7b68f', false: '#9d9d9d' }} thumbColor='#f37022' value={value} onValueChange={onValueChange} />
            <Pressable style={styles.pressable} onPress={onPress}>
                <Text style={styles.text} >{props.label}</Text>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    switch: {
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
        padding: 5,
        fontSize: 12
    }
});