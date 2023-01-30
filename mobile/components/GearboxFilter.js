import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import * as Helper from '../common/Helper';
import Env from '../config/env.config';
import i18n from '../lang/i18n';
import Accordion from './Accordion';
import Link from './Link';
import Switch from './Switch';

const GearboxFilter = (props) => {
    const [automatic, setAutomatic] = useState(true);
    const [manual, setManual] = useState(true);
    const [values, setValues] = useState([Env.GEARBOX_TYPE.AUTOMATIC, Env.GEARBOX_TYPE.MANUAL]);
    const [allChecked, setAllChecked] = useState(true);

    const onValueChangeAutomatic = (checked) => {
        if (checked) {
            values.push(Env.GEARBOX_TYPE.AUTOMATIC);

            if (values.length === 2) {
                setAllChecked(true);
            }
        } else {
            values.splice(values.findIndex(v => v === Env.GEARBOX_TYPE.AUTOMATIC), 1);

            if (values.length === 0) {
                setAllChecked(false);
            }
        }

        setAutomatic(checked);
        setValues(values);
        if (props.onChange) props.onChange(Helper.clone(values));
    };

    const onValueChangeManual = (checked) => {
        if (checked) {
            values.push(Env.GEARBOX_TYPE.MANUAL);

            if (values.length === 2) {
                setAllChecked(true);
            }
        } else {
            values.splice(values.findIndex(v => v === Env.GEARBOX_TYPE.MANUAL), 1);

            if (values.length === 0) {
                setAllChecked(false);
            }
        }

        setManual(checked);
        setValues(values);
        if (props.onChange) props.onChange(Helper.clone(values));
    };

    return (
        props.visible &&
        <View style={{ ...styles.container, ...props.style }}>
            <Accordion style={styles.accordion} title={i18n.t('GEARBOX')}>
                <View style={styles.contentContainer}>
                    <Switch style={styles.component} textStyle={styles.text} value={automatic} label={i18n.t('GEARBOX_AUTOMATIC')} onValueChange={onValueChangeAutomatic} />
                    <Switch style={styles.component} textStyle={styles.text} value={manual} label={i18n.t('GEARBOX_MANUAL')} onValueChange={onValueChangeManual} />
                </View>
                <Link style={styles.link} textStyle={styles.linkText} label={allChecked ? i18n.t('UNCHECK_ALL') : i18n.t('CHECK_ALL')} onPress={() => {
                    if (allChecked) {
                        setAutomatic(false);
                        setManual(false);
                        setAllChecked(false);
                        setValues([]);
                    } else {
                        const _values = [Env.GEARBOX_TYPE.AUTOMATIC, Env.GEARBOX_TYPE.MANUAL];
                        setAutomatic(true);
                        setManual(true);
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

export default GearboxFilter;