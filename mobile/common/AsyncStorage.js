import ReactAsyncStorage from '@react-native-async-storage/async-storage';
import Helper from './Helper';

export default class AsyncStorage {

    static async storeString(key, value) {
        try {
            await ReactAsyncStorage.setItem(key, value);
        } catch (err) {
            Helper.error(err);
        }
    }

    static async getString(key) {
        try {
            const value = await ReactAsyncStorage.getItem(key);
            return value;
        } catch (err) {
            Helper.error(err);
        }
    }

    static async storeObject(key, value) {
        try {
            const jsonValue = JSON.stringify(value);
            await ReactAsyncStorage.setItem(key, jsonValue);
        } catch (err) {
            Helper.error(err);
        }
    }

    static async getObject(key) {
        try {
            const value = await ReactAsyncStorage.getItem(key);
            const jsonValue = value != null ? JSON.parse(value) : null;
            return jsonValue;
        } catch (err) {
            Helper.error(err);
        }
    }

    static async removeItem(key) {
        try {
            await ReactAsyncStorage.removeItem(key);
        } catch (err) {
            Helper.error(err);
        }
    }
}