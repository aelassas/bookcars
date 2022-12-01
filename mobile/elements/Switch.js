import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, Pressable, Switch as ReactSwitch } from 'react-native';

const Switch = (props) => {
    const [value, setValue] = useState(props.value);

    useEffect(() => {
        setValue(props.value);
    }, [props.value])

    const onValueChange = (value) => {
        setValue(value);
        if (props.onValueChange) props.onValueChange(value);
    };

    const onPress = () => {
        if (!props.disabled) onValueChange(!value);
    };

    return (
        <View style={{ ...styles.container, ...props.style }}>
            <ReactSwitch
                trackColor={{ true: '#f7b68f', false: '#9d9d9d' }}
                thumbColor='#f37022'
                value={value}
                onValueChange={onValueChange}
                disabled={props.disabled}
            />
            {typeof props.label !== 'undefined' &&
                <Pressable style={styles.pressable} onPress={onPress}>
                    <Text style={{ ...styles.text, ...props.textStyle }} >{props.label}</Text>
                </Pressable>
            }
            {typeof props.children !== 'undefined' &&
                <Pressable style={styles.children} onPress={onPress}>
                    {props.children}
                </Pressable>
            }
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
    children: {
        marginLeft: 5
    }
});

export default Switch;