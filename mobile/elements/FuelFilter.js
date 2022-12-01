import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import * as Helper from '../common/Helper';
import Env from '../config/env.config';
import i18n from '../lang/i18n';
import Accordion from './Accordion';
import Link from './Link';
import Switch from './Switch';

const FuelFilter = (props) => {
    const [diesel, setDiesel] = useState(true);
    const [gasoline, setGasoline] = useState(true);
    const [values, setValues] = useState([Env.CAR_TYPE.DIESEL, Env.CAR_TYPE.GASOLINE]);
    const [allChecked, setAllChecked] = useState(true);

    const onValueChangeDiesel = (checked) => {
        if (checked) {
            values.push(Env.CAR_TYPE.DIESEL);

            if (values.length === 2) {
                setAllChecked(true);
            }
        } else {
            values.splice(values.findIndex(v => v === Env.CAR_TYPE.DIESEL), 1);

            if (values.length === 0) {
                setAllChecked(false);
            }
        }

        setDiesel(checked);
        setValues(values);
        if (props.onChange) props.onChange(Helper.clone(values));
    };

    const onValueChangeGasoline = (checked) => {
        if (checked) {
            values.push(Env.CAR_TYPE.GASOLINE);

            if (values.length === 2) {
                setAllChecked(true);
            }
        } else {
            values.splice(values.findIndex(v => v === Env.CAR_TYPE.GASOLINE), 1);

            if (values.length === 0) {
                setAllChecked(false);
            }
        }

        setGasoline(checked);
        setValues(values);
        if (props.onChange) props.onChange(Helper.clone(values));
    };

    return (
        props.visible &&
        <View style={{ ...styles.container, ...props.style }}>
            <Accordion style={styles.accordion} title={i18n.t('ENGINE')}>
                <View style={styles.contentContainer}>
                    <Switch style={styles.component} textStyle={styles.text} value={diesel} label={i18n.t('DIESEL')} onValueChange={onValueChangeDiesel} />
                    <Switch style={styles.component} textStyle={styles.text} value={gasoline} label={i18n.t('GASOLINE')} onValueChange={onValueChangeGasoline} />
                </View>
                <Link style={styles.link} textStyle={styles.linkText} label={allChecked ? i18n.t('UNCHECK_ALL') : i18n.t('CHECK_ALL')} onPress={() => {
                    if (allChecked) {
                        setDiesel(false);
                        setGasoline(false);
                        setAllChecked(false);
                        setValues([]);
                    } else {
                        const _values = [Env.CAR_TYPE.DIESEL, Env.CAR_TYPE.GASOLINE];
                        setDiesel(true);
                        setGasoline(true);
                        setAllChecked(true);
                        setValues(_values);
                        if (props.onChange) props.onChange(Helper.clone(_values));
                    }
                }} />
            </Accordion>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
    },
    contentContainer: {
        width: '100%',
        alignItems: 'flex-start',
        marginTop: 10
    },
    accordion: {
        width: '100%',
        maxWidth: 480
    },
    component: {
        marginTop: 0
    },
    text: {
        fontSize: 12
    },
    link: {
        marginTop: 10
    },
    linkText: {
        fontSize: 12
    }
});

export default FuelFilter;