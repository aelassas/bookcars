import ReactAsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '../lang/i18n';
import Helper from './Helper';

const error = (err) => {
    console.log(err);
    Helper.toast(i18n.t('GENERIC_ERROR'));
};

export default class AsyncStorage {

    static async storeString(key, value) {
        try {
            await ReactAsyncStorage.setItem(key, value);
        } catch (err) {
            error(err);
        }
    }

    static async getString(key) {
        try {
            const value = await ReactAsyncStorage.getItem(key);
            return value;
        } catch (err) {
            error('test');
        }
    }

    static async storeObject(key, value) {
        try {
            const jsonValue = JSON.stringify(value);
            await ReactAsyncStorage.setItem(key, jsonValue);
        } catch (err) {
            error('test');
        }
    }

    static async getObject(key) {
        try {
            const value = await ReactAsyncStorage.getItem(key);
            const jsonValue = value != null ? JSON.parse(value) : null;
            return jsonValue;
        } catch (err) {
            error('test');
        }
    }

    static async removeItem(key) {
        try {
            await ReactAsyncStorage.removeItem(key);
        } catch (err) {
            error('test');
        }
    }
}