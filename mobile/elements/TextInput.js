import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TextInput as ReactTextInput } from 'react-native';

// export default function TextInput(props) {
const TextInput = React.forwardRef((props, ref) => {
    const [value, setValue] = useState('');

    useEffect(() => {
        setValue(props.value ?? '');
    }, [props.value])

    const onChangeText = (text) => {
        setValue(text);
        if (props.onChangeText) props.onChangeText(text);
    };

    const styles = StyleSheet.create({
        container: {
            maxWidth: 400
        },
        label: {
            backgroundColor: '#fafafa',
            color: 'rgba(0, 0, 0, 0.6)',
            fontSize: 12,
            fontWeight: '400',
            paddingRight: 5,
            paddingLeft: 5,
            marginLeft: 15,
            position: 'absolute',
            top: -9,
            zIndex: 1
        },
        input: {
            height: 55,
            borderWidth: 1,
            borderRadius: 10,
            borderColor: props.error ? '#d32f2f' : 'rgba(0, 0, 0, 0.23)',
            padding: 10,
        },
        helperText: {
            color: props.error ? '#d32f2f' : 'rgba(0, 0, 0, 0.23)',
            fontSize: 12,
            fontWeight: '400',
            paddingLeft: 5,
        }
    });

    return (
        <View style={{ ...props.style, ...styles.container }}>
            {value !== '' && <Text style={styles.label}>{props.label}</Text>}
            <ReactTextInput
                ref={ref}
                style={styles.input}
                secureTextEntry={props.secureTextEntry}
                placeholder={props.label}
                value={value}
                onChangeText={onChangeText}
                onKeyPress={props.onKeyPress}
                onSubmitEditing={props.onSubmitEditing}
                onBlur={props.onBlur}
                autoCapitalize='none'
                editable={!props.readOnly}
            />
            <Text style={styles.helperText}>{props.helperText}</Text>
        </View>
    );
});

export default TextInput;