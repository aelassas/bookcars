import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, ScrollView } from 'react-native';
import { useIsFocused } from '@react-navigation/native';

import i18n from '../lang/i18n';
import UserService from '../services/UserService';

export default function AboutScreen({ navigation, route }) {
    const isFocused = useIsFocused();

    const _init = async () => {
        const language = await UserService.getLanguage();
        i18n.locale = language;
    };

    useEffect(() => {
        if (isFocused) {
            _init();
        }
    }, [route.params, isFocused]);

    return (
        <ScrollView
            contentContainerStyle={styles.container}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
        >
            <Text style={{ fontSize: 16 }}>About!</Text>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        alignItems: 'center'
    }
});