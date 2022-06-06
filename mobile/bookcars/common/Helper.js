
import { Platform } from 'react-native';
import Toast from 'react-native-root-toast';
import i18n from '../lang/i18n';

const ANDROID = Platform.OS === 'android';

export default class Helper {

    static android() {
        return ANDROID;
    }

    static arrayEqual(a, b) {
        if (a === b) return true;
        if (a == null || b == null) return false;
        if (a.length !== b.length) return false;

        // If you don't care about the order of the elements inside
        // the array, you should sort both arrays here.
        // Please note that calling sort on an array will modify that array.
        // you might want to clone your array first.

        for (let i = 0; i < a.length; i++) {
            if (a[i] !== b[i]) return false;
        }
        return true;
    }

    static capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    static toast(message) {
        Toast.show(message, {
            duration: Toast.durations.LONG,
        });
    }

    static dateTime(date, time) {
        const dateTime = new Date(date);
        dateTime.setHours(time.getHours());
        dateTime.setMinutes(time.getMinutes());
        dateTime.setSeconds(time.getSeconds());
        dateTime.setMilliseconds(time.getMilliseconds());
        return dateTime;
    };

    static error(err) {
        if (err) console.log(err);
        Helper.toast(i18n.t('GENERIC_ERROR'));
    }
}