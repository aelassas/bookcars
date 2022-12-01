
import { Platform } from 'react-native';
import Toast from 'react-native-root-toast';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import i18n from '../lang/i18n';
import Env from '../config/env.config';
import * as UserService from '../services/UserService';
import * as mime from 'mime';

const ANDROID = Platform.OS === 'android';

export const android = () => (
    ANDROID
);

export const getFileName = (path) => (
    path.replace(/^.*[\\\/]/, '')
);

export const getMimeType = (fileName) => (
    mime.getType(fileName)
)

export const registerPushToken = async (userId) => {
    async function registerForPushNotificationsAsync() {
        let token;

        try {
            if (Device.isDevice) {
                const { status: existingStatus } = await Notifications.getPermissionsAsync();
                let finalStatus = existingStatus;
                if (existingStatus !== 'granted') {
                    const { status } = await Notifications.requestPermissionsAsync();
                    finalStatus = status;
                }
                if (finalStatus !== 'granted') {
                    alert('Failed to get push token for push notification!');
                    return;
                }
                token = (await Notifications.getExpoPushTokenAsync()).data;
            } else {
                alert('Must use physical device for Push Notifications');
            }

            if (android()) {
                Notifications.setNotificationChannelAsync('default', {
                    name: 'default',
                    importance: Notifications.AndroidImportance.MAX,
                    vibrationPattern: [0, 250, 250, 250],
                    lightColor: '#FF231F7C',
                });
            }
        } catch (err) {
            error(err, false);
        }

        return token;
    }

    try {
        await UserService.deletePushToken(userId);
        const token = await registerForPushNotificationsAsync();
        const status = await UserService.createPushToken(userId, token);
        if (status !== 200) {
            error();
        }
    } catch (err) {
        error(err, false);
    }
};

export const arrayEqual = (a, b) => {
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
};

export const capitalize = (str) => (
    str.charAt(0).toUpperCase() + str.slice(1)
);

export const toast = (message) => {
    Toast.show(message, {
        duration: Toast.durations.LONG,
    });
};

export const dateTime = (date, time) => {
    const dateTime = new Date(date);
    dateTime.setHours(time.getHours());
    dateTime.setMinutes(time.getMinutes());
    dateTime.setSeconds(time.getSeconds());
    dateTime.setMilliseconds(time.getMilliseconds());
    return dateTime;
};

export const error = (err, toast = true) => {
    if (err) console.log(err);
    if (err && err.request && err.request._response) console.log(err.request._response);
    if (toast) toast(i18n.t('GENERIC_ERROR'));
};

export const joinURL = (part1, part2) => {
    if (part1.charAt(part1.length - 1) === '/') {
        part1 = part1.substr(0, part1.length - 1);
    }
    if (part2.charAt(0) === '/') {
        part2 = part2.substr(1);
    }
    return part1 + '/' + part2;
};

export const getCarTypeShort = (type) => {
    switch (type) {
        case Env.CAR_TYPE.DIESEL:
            return i18n.t('DIESEL_SHORT');

        case Env.CAR_TYPE.GASOLINE:
            return i18n.t('GASOLINE_SHORT');

        default:
            return '';
    }
};

export const getGearboxTypeShort = (type) => {
    switch (type) {
        case Env.GEARBOX_TYPE.MANUAL:
            return i18n.t('GEARBOX_MANUAL_SHORT');

        case Env.GEARBOX_TYPE.AUTOMATIC:
            return i18n.t('GEARBOX_AUTOMATIC_SHORT');

        default:
            return '';
    }
};

export const getMileage = (mileage) => {
    if (mileage === -1) {
        return i18n.t('UNLIMITED');
    } else {
        return `${mileage} ${i18n.t('MILEAGE_UNIT')}`;
    }
};

export const getFuelPolicy = (type) => {
    switch (type) {
        case Env.FUEL_POLICY.LIKE_FOR_LIKE:
            return i18n.t('FUEL_POLICY_LIKE_FOR_LIKE');

        case Env.FUEL_POLICY.FREE_TANK:
            return i18n.t('FUEL_POLICY_FREE_TANK');

        default:
            return '';
    }
};

export const getCancellation = (cancellation, fr) => {
    if (cancellation === -1) {
        return `${i18n.t('CANCELLATION')}${fr ? ' : ' : ': '}${i18n.t('UNAVAILABLE')}`;
    }
    else if (cancellation === 0) {
        return `${i18n.t('CANCELLATION')}${fr ? ' : ' : ': '}${i18n.t('INCLUDED')}${fr ? 'e' : ''}`;
    } else {
        return `${i18n.t('CANCELLATION')}${fr ? ' : ' : ': '}${cancellation} ${i18n.t('CURRENCY')}`;
    }
};

export const getAmendments = (amendments, fr) => {
    if (amendments === -1) {
        return `${i18n.t('AMENDMENTS')}${fr ? ' : ' : ': '}${i18n.t('UNAVAILABLE')}${fr ? 's' : ''}`;
    }
    else if (amendments === 0) {
        return `${i18n.t('AMENDMENTS')}${fr ? ' : ' : ': '}${i18n.t('INCLUDED')}${fr ? 'es' : ''}`;
    } else {
        return `${i18n.t('AMENDMENTS')}${fr ? ' : ' : ': '}${amendments} ${i18n.t('CURRENCY')}`;
    }
};

export const getTheftProtection = (theftProtection, fr) => {
    if (theftProtection === -1) {
        return `${i18n.t('THEFT_PROTECTION')}${fr ? ' : ' : ': '}${i18n.t('UNAVAILABLE')}`;
    }
    else if (theftProtection === 0) {
        return `${i18n.t('THEFT_PROTECTION')}${fr ? ' : ' : ': '}${i18n.t('INCLUDED')}${fr ? 'e' : ''}`;
    } else {
        return `${i18n.t('THEFT_PROTECTION')}${fr ? ' : ' : ': '}${theftProtection} ${i18n.t('CAR_CURRENCY')}`;
    }
};

export const getCollisionDamageWaiver = (collisionDamageWaiver, fr) => {
    if (collisionDamageWaiver === -1) {
        return `${i18n.t('COLLISION_DAMAGE_WAVER')}${fr ? ' : ' : ': '}${i18n.t('UNAVAILABLE')}`;
    }
    else if (collisionDamageWaiver === 0) {
        return `${i18n.t('COLLISION_DAMAGE_WAVER')}${fr ? ' : ' : ': '}${i18n.t('INCLUDED')}${fr ? 'e' : ''}`;
    } else {
        return `${i18n.t('COLLISION_DAMAGE_WAVER')}${fr ? ' : ' : ': '}${collisionDamageWaiver} ${i18n.t('CAR_CURRENCY')}`;
    }
};

export const getFullInsurance = (fullInsurance, fr) => {
    if (fullInsurance === -1) {
        return `${i18n.t('FULL_INSURANCE')}${fr ? ' : ' : ': '}${i18n.t('UNAVAILABLE')}`;
    }
    else if (fullInsurance === 0) {
        return `${i18n.t('FULL_INSURANCE')}${fr ? ' : ' : ': '}${i18n.t('INCLUDED')}${fr ? 'e' : ''}`;
    } else {
        return `${i18n.t('FULL_INSURANCE')}${fr ? ' : ' : ': '}${fullInsurance} ${i18n.t('CAR_CURRENCY')}`;
    }
};

export const getAdditionalDriver = (additionalDriver, fr) => {
    if (additionalDriver === -1) {
        return `${i18n.t('ADDITIONAL_DRIVER')}${fr ? ' : ' : ': '}${i18n.t('UNAVAILABLE')}`;
    }
    else if (additionalDriver === 0) {
        return `${i18n.t('ADDITIONAL_DRIVER')}${fr ? ' : ' : ': '}${i18n.t('INCLUDED')}`;
    } else {
        return `${i18n.t('ADDITIONAL_DRIVER')}${fr ? ' : ' : ': '}${additionalDriver} ${i18n.t('CAR_CURRENCY')}`;
    }
};

export const getDays = (days) => {
    return `${i18n.t('PRICE_DAYS_PART_1')} ${days} ${i18n.t('PRICE_DAYS_PART_2')}${days > 1 ? 's' : ''}`;
};

export const getDaysShort = (days) => {
    return `${days} ${i18n.t('PRICE_DAYS_PART_2')}${days > 1 ? 's' : ''}`;
};

export const days = (from, to) => (
    ((from && to && Math.ceil((to.getTime() - from.getTime()) / (1000 * 3600 * 24))) || 0)
);

export const price = (car, from, to, options) => {
    const _days = days(from, to);

    let price = car.price * _days;
    if (options) {
        if (options.cancellation && car.cancellation > 0) price += car.cancellation;
        if (options.amendments && car.amendments > 0) price += car.amendments;
        if (options.theftProtection && car.theftProtection > 0) price += car.theftProtection * _days;
        if (options.collisionDamageWaiver && car.collisionDamageWaiver > 0) price += car.collisionDamageWaiver * _days;
        if (options.fullInsurance && car.fullInsurance > 0) price += car.fullInsurance * _days;
        if (options.additionalDriver && car.additionalDriver > 0) price += car.additionalDriver * _days;
    }

    return price;
};

export const isCvv = (val) => (
    /^\d{3,4}$/.test(val)
);

export const getCancellationOption = (cancellation, fr, hidePlus) => {
    if (cancellation === -1) {
        return i18n.t('UNAVAILABLE');
    }
    else if (cancellation === 0) {
        return `${i18n.t('INCLUDED')}${fr ? 'e' : ''}`;
    } else {
        return `${hidePlus ? '' : '+ '}${cancellation} ${i18n.t('CURRENCY')}`;
    }
};

export const getAmendmentsOption = (amendments, fr, hidePlus) => {
    if (amendments === -1) {
        return `${i18n.t('UNAVAILABLE')}${fr ? 's' : ''}`;
    }
    else if (amendments === 0) {
        return `${i18n.t('INCLUDED')}${fr ? 'es' : ''}`;
    } else {
        return `${hidePlus ? '' : '+ '}${amendments} ${i18n.t('CURRENCY')}`;
    }
};

export const getCollisionDamageWaiverOption = (collisionDamageWaiver, days, fr, hidePlus) => {
    if (collisionDamageWaiver === -1) {
        return i18n.t('UNAVAILABLE');
    }
    else if (collisionDamageWaiver === 0) {
        return `${i18n.t('INCLUDED')}${fr ? 'e' : ''}`;
    } else {
        return `${hidePlus ? '' : '+ '}${collisionDamageWaiver * days} ${i18n.t('CURRENCY')} (${collisionDamageWaiver} ${i18n.t('CAR_CURRENCY')})`;
    }
};

export const getTheftProtectionOption = (theftProtection, days, fr, hidePlus) => {
    if (theftProtection === -1) {
        return i18n.t('UNAVAILABLE');
    }
    else if (theftProtection === 0) {
        return `${i18n.t('INCLUDED')}${fr ? 'e' : ''}`;
    } else {
        return `${hidePlus ? '' : '+ '}${theftProtection * days} ${i18n.t('CURRENCY')} (${theftProtection} ${i18n.t('CAR_CURRENCY')})`;
    }
};

export const getFullInsuranceOption = (fullInsurance, days, fr, hidePlus) => {
    if (fullInsurance === -1) {
        return i18n.t('UNAVAILABLE');
    }
    else if (fullInsurance === 0) {
        return `${i18n.t('INCLUDED')}${fr ? 'e' : ''}`;
    } else {
        return `${hidePlus ? '' : '+ '}${fullInsurance * days} ${i18n.t('CURRENCY')} (${fullInsurance} ${i18n.t('CAR_CURRENCY')})`;
    }
};

export const getAdditionalDriverOption = (additionalDriver, days, fr, hidePlus) => {
    if (additionalDriver === -1) {
        return i18n.t('UNAVAILABLE');
    }
    else if (additionalDriver === 0) {
        return i18n.t('INCLUDED');
    } else {
        return `${hidePlus ? '' : '+ '}${additionalDriver * days} ${i18n.t('CURRENCY')} (${additionalDriver} ${i18n.t('CAR_CURRENCY')})`;
    }
};

export const getBookingStatuses = () => (
    [
        { value: Env.BOOKING_STATUS.VOID, label: i18n.t('BOOKING_STATUS_VOID') },
        { value: Env.BOOKING_STATUS.PENDING, label: i18n.t('BOOKING_STATUS_PENDING') },
        { value: Env.BOOKING_STATUS.DEPOSIT, label: i18n.t('BOOKING_STATUS_DEPOSIT') },
        { value: Env.BOOKING_STATUS.PAID, label: i18n.t('BOOKING_STATUS_PAID') },
        { value: Env.BOOKING_STATUS.RESERVED, label: i18n.t('BOOKING_STATUS_RESERVED') },
        { value: Env.BOOKING_STATUS.CANCELLED, label: i18n.t('BOOKING_STATUS_CANCELLED') }
    ]
);

export const flattenCompanies = (companies) => (
    companies.map(company => company._id)
);

export const getBookingStatus = (status) => {
    switch (status) {
        case Env.BOOKING_STATUS.VOID:
            return i18n.t('BOOKING_STATUS_VOID');

        case Env.BOOKING_STATUS.PENDING:
            return i18n.t('BOOKING_STATUS_PENDING');

        case Env.BOOKING_STATUS.DEPOSIT:
            return i18n.t('BOOKING_STATUS_DEPOSIT');

        case Env.BOOKING_STATUS.PAID:
            return i18n.t('BOOKING_STATUS_PAID');

        case Env.BOOKING_STATUS.RESERVED:
            return i18n.t('BOOKING_STATUS_RESERVED');

        case Env.BOOKING_STATUS.CANCELLED:
            return i18n.t('BOOKING_STATUS_CANCELLED');

        default:
            return '';
    }
};

export const clone = (obj) => (
    JSON.parse(JSON.stringify(obj))
);

export const getBirthDateError = (minimumAge) => (
    `${i18n.t('BIRTH_DATE_NOT_VALID_PART1')} ${minimumAge} ${i18n.t('BIRTH_DATE_NOT_VALID_PART2')} `
);