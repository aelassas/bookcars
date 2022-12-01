import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import * as Helper from '../common/Helper';
import Env from '../config/env.config';
import i18n from '../lang/i18n';
import Accordion from './Accordion';
import Link from './Link';
import Switch from './Switch';

const MileageFilter = (props) => {
    const [limited, setLimited] = useState(true);
    const [unlimited, setUnlimited] = useState(true);
    const [values, setValues] = useState([Env.MILEAGE.LIMITED, Env.MILEAGE.UNLIMITED]);
    const [allChecked, setAllChecked] = useState(true);

    const onValueChangeLimited = (checked) => {
        if (checked) {
            values.push(Env.MILEAGE.LIMITED);

            if (values.length === 2) {
                setAllChecked(true);
            }
        } else {
            values.splice(values.findIndex(v => v === Env.MILEAGE.LIMITED), 1);

            if (values.length === 0) {
                setAllChecked(false);
            }
        }

        setLimited(checked);
        setValues(values);
        if (props.onChange) props.onChange(Helper.clone(values));
    };

    const onValueChangeUnlimited = (checked) => {
        if (checked) {
            values.push(Env.MILEAGE.UNLIMITED);

            if (values.length === 2) {
                setAllChecked(true);
            }
        } else {
            values.splice(values.findIndex(v => v === Env.MILEAGE.UNLIMITED), 1);

            if (values.length === 0) {
                setAllChecked(false);
            }
        }

        setUnlimited(checked);
        setValues(values);
        if (props.onChange) props.onChange(Helper.clone(values));
    };

    return (
        props.visible &&
        <View style={{ ...styles.container, ...props.style }}>
            <Accordion style={styles.accordion} title={i18n.t('MILEAGE')}>
                <View style={styles.contentContainer}>
                    <Switch style={styles.component} textStyle={styles.text} value={limited} label={i18n.t('LIMITED')} onValueChange={onValueChangeLimited} />
                    <Switch style={styles.component} textStyle={styles.text} value={unlimited} label={i18n.t('UNLIMITED')} onValueChange={onValueChangeUnlimited} />
                </View>
                <Link style={styles.link} textStyle={styles.linkText} label={allChecked ? i18n.t('UNCHECK_ALL') : i18n.t('CHECK_ALL')} onPress={() => {
                    if (allChecked) {
                        setLimited(false);
                        setUnlimited(false);
                        setAllChecked(false);
                        setValues([]);
                    } else {
                        const _values = [Env.MILEAGE.LIMITED, Env.MILEAGE.UNLIMITED];
                        setLimited(true);
                        setUnlimited(true);
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

export default MileageFilter;