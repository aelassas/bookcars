import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Pressable, Text } from 'react-native';
import ReactDateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { enUS, fr } from 'date-fns/locale';

import * as Helper from '../common/Helper';
import Env from '../config/env.config';

const DateTimePicker = (props) => {
    const [label, setLabel] = useState('');
    const [value, setValue] = useState(props.value);
    const [show, setShow] = useState(false);
    const [locale, setLoacle] = useState(props.locale === Env.LANGUAGE.FR ? fr : enUS);
    const _format = props.mode === 'date' ? 'eeee, d LLLL yyyy' : 'kk:mm';
    const now = new Date();
    const small = props.size === 'small';

    useEffect(() => {
        const _locale = props.locale === Env.LANGUAGE.FR ? fr : enUS;
        setLoacle(_locale);
        setLabel((value && Helper.capitalize(format(value, _format, { locale: _locale }))) || props.label);
    }, [props.locale]);

    useEffect(() => {
        setValue(props.value);
        setLabel((value && Helper.capitalize(format(value, _format, { locale }))) || props.label);
    }, [props.value]);

    const styles = StyleSheet.create({
        container: {
            maxWidth: 480
        },
        label: {
            backgroundColor: props.backgroundColor ?? '#fafafa',
            color: 'rgba(0, 0, 0, 0.6)',
            fontSize: 12,
            fontWeight: '400',
            paddingRight: 5,
            paddingLeft: 5,
            marginLeft: 15,
            position: 'absolute',
            top: -10,
            zIndex: 1
        },
        dateContainer: {
            alignSelf: 'stretch',
            height: small ? 37 : 55,
            fontSize: small ? 14 : 16,
            borderWidth: 1,
            borderRadius: 10,
            borderColor: props.error ? '#d32f2f' : 'rgba(0, 0, 0, 0.23)',
            backgroundColor: props.backgroundColor ?? '#fafafa',
        },
        dateButton: {
            height: 55,
            alignSelf: 'stretch',
            flexDirection: 'row',
        },
        dateText: {
            flex: 1,
            fontSize: small ? 14 : 16,
            paddingTop: small ? 8 : 15,
            paddingRight: 15,
            paddingBottom: small ? 8 : 15,
            paddingLeft: 15
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
            {value && <Text style={styles.label}>{props.label}</Text>}
            <View style={styles.dateContainer}>
                <Pressable
                    style={styles.dateButton}
                    onPress={() => {
                        setShow(true);
                        if (props.onPress) props.onPress();
                    }} >
                    <Text style={{
                        ...styles.dateText,
                        color: value ? 'rgba(0, 0, 0, 0.87)' : 'rgba(0, 0, 0, .4)',
                    }}>{label}</Text>
                </Pressable>
                <Text style={styles.helperText}>{props.helperText}</Text>
                {show &&
                    <ReactDateTimePicker mode={props.mode} value={value ?? now} minimumDate={props.minimumDate} onChange={(event, date) => {
                        setShow(false);
                        if (date.getTime() !== now.getTime()) {
                            setValue(date);
                            if (props.onChange) props.onChange(date);
                        }
                    }} />
                }
            </View>
        </View>
    );
};

export default DateTimePicker;