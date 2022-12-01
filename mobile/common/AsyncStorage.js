import ReactAsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-root-toast';

export const error = (err) => {
    if (err) console.log(err);
    Toast.show(i18n.t('GENERIC_ERROR'), {
        duration: Toast.durations.LONG,
    });
};

export const storeString = async (key, value) => {
    try {
        await ReactAsyncStorage.setItem(key, value);
    } catch (err) {
        error(err);
    }
};

export const getString = async (key) => {
    try {
        const value = await ReactAsyncStorage.getItem(key);
        return value;
    } catch (err) {
        error(err);
    }
};

export const storeObject = async (key, value) => {
    try {
        const jsonValue = JSON.stringify(value);
        await ReactAsyncStorage.setItem(key, jsonValue);
    } catch (err) {
        error(err);
    }
};

export const getObject = async (key) => {
    try {
        const value = await ReactAsyncStorage.getItem(key);
        const jsonValue = value != null ? JSON.parse(value) : null;
        return jsonValue;
    } catch (err) {
        error(err);
    }
};

export const removeItem = async (key) => {
    try {
        await ReactAsyncStorage.removeItem(key);
    } catch (err) {
        error(err);
    }
};