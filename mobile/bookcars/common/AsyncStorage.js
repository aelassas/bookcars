import ReactAsyncStorage from '@react-native-async-storage/async-storage';

export default class AsyncStorage {

    static async storeString(key, value) {
        try {
            await ReactAsyncStorage.setItem(key, value);
        } catch (e) {
            // saving error
        }
    };

    static async getString(key) {
        try {
            const value = await ReactAsyncStorage.getItem(key)
            return value;
        } catch (e) {
            // error reading value
        }
    };

    static async storeObject(key, value) {
        try {
            const jsonValue = JSON.stringify(value);
            await ReactAsyncStorage.setItem(key, jsonValue);
        } catch (e) {
            // saving error
        }
    };

    static async getObject(key) {
        try {
            const value = await ReactAsyncStorage.getItem(key)
            const jsonValue = value != null ? JSON.parse(value) : null;
            return jsonValue;
        } catch (e) {
            // error reading value
        }
    };

    static async removeItem(key) {
        try {
            await ReactAsyncStorage.removeItem(key);
        } catch (e) {
            // remove error
        }
    };
}