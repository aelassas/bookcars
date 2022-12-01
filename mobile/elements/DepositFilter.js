import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import i18n from '../lang/i18n';
import Accordion from './Accordion';
import RadioButton from './RadioButton';

const DepositFilter = (props) => {
    const [deposit_2500, setDeposit_2500] = useState(false);
    const [deposit_5000, setDeposit_5000] = useState(false);
    const [deposit_7500, setDeposit_7500] = useState(false);
    const [deposit_all, setDeposit_all] = useState(true);

    const onValueChangeDeposit_2500 = (checked) => {
        if (checked) {
            const value = 2500;
            setDeposit_2500(true);
            setDeposit_5000(false);
            setDeposit_7500(false);
            setDeposit_all(false);

            if (props.onChange) props.onChange(value);
        }
    };

    const onValueChangeDeposit_5000 = (checked) => {
        if (checked) {
            const value = 5000;
            setDeposit_2500(false);
            setDeposit_5000(true);
            setDeposit_7500(false);
            setDeposit_all(false);

            if (props.onChange) props.onChange(value);
        }
    };

    const onValueChangeDeposit_7500 = (checked) => {
        if (checked) {
            const value = 7500;
            setDeposit_2500(false);
            setDeposit_5000(false);
            setDeposit_7500(true);
            setDeposit_all(false);

            if (props.onChange) props.onChange(value);
        }
    };

    const onValueChangeDeposit_all = (checked) => {
        if (checked) {
            const value = -1;
            setDeposit_2500(false);
            setDeposit_5000(false);
            setDeposit_7500(false);
            setDeposit_all(true);

            if (props.onChange) props.onChange(value);
        }
    };

    return (
        props.visible &&
        <View style={{ ...styles.container, ...props.style }}>
            <Accordion style={styles.accordion} title={i18n.t('DEPOSIT')}>
                <View style={styles.contentContainer}>
                    <RadioButton style={styles.component} textStyle={styles.text} checked={deposit_2500} label={i18n.t('LESS_THAN_2500')} onValueChange={onValueChangeDeposit_2500} />
                    <RadioButton style={styles.component} textStyle={styles.text} checked={deposit_5000} label={i18n.t('LESS_THAN_5000')} onValueChange={onValueChangeDeposit_5000} />
                    <RadioButton style={styles.component} textStyle={styles.text} checked={deposit_7500} label={i18n.t('LESS_THAN_7500')} onValueChange={onValueChangeDeposit_7500} />
                    <RadioButton style={styles.component} textStyle={styles.text} checked={deposit_all} label={i18n.t('ALL')} onValueChange={onValueChangeDeposit_all} />
                </View>
            </Accordion>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center'
    },
    contentContainer: {
        width: '100%',
        alignItems: 'flex-start',
        marginTop: 10,
        paddingLeft: 10
    },
    accordion: {
        width: '100%',
        maxWidth: 480
    },
    component: {
        marginTop: -3
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

export default DepositFilter;