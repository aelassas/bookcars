import ReactAsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-root-toast';

export default class AsyncStorage {

    static error(err) {
        if (err) console.log(err);
        Toast.show(i18n.t('GENERIC_ERROR'), {
            duration: Toast.durations.LONG,
        });
    }

    static async storeString(key, value) {
        try {
            await ReactAsyncStorage.setItem(key, value);
        } catch (err) {
            AsyncStorage.error(err);
        }
    }

    static async getString(key) {
        try {
            const value = await ReactAsyncStorage.getItem(key);
            return value;
        } catch (err) {
            AsyncStorage.error(err);
        }
    }

    static async storeObject(key, value) {
        try {
            const jsonValue = JSON.stringify(value);
            await ReactAsyncStorage.setItem(key, jsonValue);
        } catch (err) {
            AsyncStorage.error(err);
        }
    }

    static async getObject(key) {
        try {
            const value = await ReactAsyncStorage.getItem(key);
            const jsonValue = value != null ? JSON.parse(value) : null;
            return jsonValue;
        } catch (err) {
            AsyncStorage.error(err);
        }
    }

    static async removeItem(key) {
        try {
            await ReactAsyncStorage.removeItem(key);
        } catch (err) {
            AsyncStorage.error(err);
        }
    }
}