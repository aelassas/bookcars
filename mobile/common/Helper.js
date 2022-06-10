
import { Platform } from 'react-native';
import Toast from 'react-native-root-toast';
import i18n from '../lang/i18n';
import Env from '../config/env.config';

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

    static joinURL(part1, part2) {
        if (part1.charAt(part1.length - 1) === '/') {
            part1 = part1.substr(0, part1.length - 1);
        }
        if (part2.charAt(0) === '/') {
            part2 = part2.substr(1);
        }
        return part1 + '/' + part2;
    }

    static getCarTypeShort(type) {
        switch (type) {
            case Env.CAR_TYPE.DIESEL:
                return i18n.t('DIESEL_SHORT');

            case Env.CAR_TYPE.GASOLINE:
                return i18n.t('GASOLINE_SHORT');

            default:
                return '';
        }
    }

    static getGearboxTypeShort(type) {
        switch (type) {
            case Env.GEARBOX_TYPE.MANUAL:
                return i18n.t('GEARBOX_MANUAL_SHORT');

            case Env.GEARBOX_TYPE.AUTOMATIC:
                return i18n.t('GEARBOX_AUTOMATIC_SHORT');

            default:
                return '';
        }
    }

    static getMileage(mileage) {
        if (mileage === -1) {
            return i18n.t('UNLIMITED');
        } else {
            return `${mileage} ${i18n.t('MILEAGE_UNIT')}`;
        }
    }

    static getFuelPolicy(type) {
        switch (type) {
            case Env.FUEL_POLICY.LIKE_FOR_LIKE:
                return i18n.t('FUEL_POLICY_LIKE_FOR_LIKE');

            case Env.FUEL_POLICY.FREE_TANK:
                return i18n.t('FUEL_POLICY_FREE_TANK');

            default:
                return '';
        }
    }

    static getCancellation(cancellation, fr) {
        if (cancellation === -1) {
            return `${i18n.t('CANCELLATION')}${fr ? ' : ' : ': '}${i18n.t('UNAVAILABLE')}`;
        }
        else if (cancellation === 0) {
            return `${i18n.t('CANCELLATION')}${fr ? ' : ' : ': '}${i18n.t('INCLUDED')}${fr ? 'e' : ''}`;
        } else {
            return `${i18n.t('CANCELLATION')}${fr ? ' : ' : ': '}${cancellation} ${i18n.t('CURRENCY')}`;
        }
    }


    static getAmendments(amendments, fr) {
        if (amendments === -1) {
            return `${i18n.t('AMENDMENTS')}${fr ? ' : ' : ': '}${i18n.t('UNAVAILABLE')}${fr ? 's' : ''}`;
        }
        else if (amendments === 0) {
            return `${i18n.t('AMENDMENTS')}${fr ? ' : ' : ': '}${i18n.t('INCLUDED')}${fr ? 'es' : ''}`;
        } else {
            return `${i18n.t('AMENDMENTS')}${fr ? ' : ' : ': '}${amendments} ${i18n.t('CURRENCY')}`;
        }
    }

    static getTheftProtection(theftProtection, fr) {
        if (theftProtection === -1) {
            return `${i18n.t('THEFT_PROTECTION')}${fr ? ' : ' : ': '}${i18n.t('UNAVAILABLE')}`;
        }
        else if (theftProtection === 0) {
            return `${i18n.t('THEFT_PROTECTION')}${fr ? ' : ' : ': '}${i18n.t('INCLUDED')}${fr ? 'e' : ''}`;
        } else {
            return `${i18n.t('THEFT_PROTECTION')}${fr ? ' : ' : ': '}${theftProtection} ${i18n.t('CAR_CURRENCY')}`;
        }
    }

    static getCollisionDamageWaiver(collisionDamageWaiver, fr) {
        if (collisionDamageWaiver === -1) {
            return `${i18n.t('COLLISION_DAMAGE_WAVER')}${fr ? ' : ' : ': '}${i18n.t('UNAVAILABLE')}`;
        }
        else if (collisionDamageWaiver === 0) {
            return `${i18n.t('COLLISION_DAMAGE_WAVER')}${fr ? ' : ' : ': '}${i18n.t('INCLUDED')}${fr ? 'e' : ''}`;
        } else {
            return `${i18n.t('COLLISION_DAMAGE_WAVER')}${fr ? ' : ' : ': '}${collisionDamageWaiver} ${i18n.t('CAR_CURRENCY')}`;
        }
    }

    static getFullInsurance(fullInsurance, fr) {
        if (fullInsurance === -1) {
            return `${i18n.t('FULL_INSURANCE')}${fr ? ' : ' : ': '}${i18n.t('UNAVAILABLE')}`;
        }
        else if (fullInsurance === 0) {
            return `${i18n.t('FULL_INSURANCE')}${fr ? ' : ' : ': '}${i18n.t('INCLUDED')}${fr ? 'e' : ''}`;
        } else {
            return `${i18n.t('FULL_INSURANCE')}${fr ? ' : ' : ': '}${fullInsurance} ${i18n.t('CAR_CURRENCY')}`;
        }
    }

    static getAdditionalDriver(additionalDriver, fr) {
        if (additionalDriver === -1) {
            return `${i18n.t('ADDITIONAL_DRIVER')}${fr ? ' : ' : ': '}${i18n.t('UNAVAILABLE')}`;
        }
        else if (additionalDriver === 0) {
            return `${i18n.t('ADDITIONAL_DRIVER')}${fr ? ' : ' : ': '}${i18n.t('INCLUDED')}`;
        } else {
            return `${i18n.t('ADDITIONAL_DRIVER')}${fr ? ' : ' : ': '}${additionalDriver} ${i18n.t('CAR_CURRENCY')}`;
        }
    }

    static getDays(days) {
        return `${i18n.t('PRICE_DAYS_PART_1')} ${days} ${i18n.t('PRICE_DAYS_PART_2')}${days > 1 ? 's' : ''}`;
    }

    static getDaysShort(days) {
        return `${days} ${i18n.t('PRICE_DAYS_PART_2')}${days > 1 ? 's' : ''}`;
    }

    static days(from, to) {
        return ((from && to && Math.ceil((to.getTime() - from.getTime()) / (1000 * 3600 * 24))) || 0);
    }

    static price(car, from, to, options) {
        const days = Helper.days(from, to);

        let price = car.price * days;
        if (options) {
            if (options.cancellation && car.cancellation > 0) price += car.cancellation;
            if (options.amendments && car.amendments > 0) price += car.amendments;
            if (options.theftProtection && car.theftProtection > 0) price += car.theftProtection * days;
            if (options.collisionDamageWaiver && car.collisionDamageWaiver > 0) price += car.collisionDamageWaiver * days;
            if (options.fullInsurance && car.fullInsurance > 0) price += car.fullInsurance * days;
            if (options.additionalDriver && car.additionalDriver > 0) price += car.additionalDriver * days;
        }

        return price;
    }

    static isCvv(val) {
        return /^\d{3,4}$/.test(val);
    }

    static getCancellationOption(cancellation, fr, hidePlus) {
        if (cancellation === -1) {
            return i18n.t('UNAVAILABLE');
        }
        else if (cancellation === 0) {
            return `${i18n.t('INCLUDED')}${fr ? 'e' : ''}`;
        } else {
            return `${hidePlus ? '' : '+ '}${cancellation} ${i18n.t('CURRENCY')}`;
        }
    }

    static getAmendmentsOption(amendments, fr, hidePlus) {
        if (amendments === -1) {
            return `${i18n.t('UNAVAILABLE')}${fr ? 's' : ''}`;
        }
        else if (amendments === 0) {
            return `${i18n.t('INCLUDED')}${fr ? 'es' : ''}`;
        } else {
            return `${hidePlus ? '' : '+ '}${amendments} ${i18n.t('CURRENCY')}`;
        }
    }

    static getCollisionDamageWaiverOption(collisionDamageWaiver, days, fr, hidePlus) {
        if (collisionDamageWaiver === -1) {
            return i18n.t('UNAVAILABLE');
        }
        else if (collisionDamageWaiver === 0) {
            return `${i18n.t('INCLUDED')}${fr ? 'e' : ''}`;
        } else {
            return `${hidePlus ? '' : '+ '}${collisionDamageWaiver * days} ${i18n.t('CURRENCY')} (${collisionDamageWaiver} ${i18n.t('CAR_CURRENCY')})`;
        }
    }

    static getTheftProtectionOption(theftProtection, days, fr, hidePlus) {
        if (theftProtection === -1) {
            return i18n.t('UNAVAILABLE');
        }
        else if (theftProtection === 0) {
            return `${i18n.t('INCLUDED')}${fr ? 'e' : ''}`;
        } else {
            return `${hidePlus ? '' : '+ '}${theftProtection * days} ${i18n.t('CURRENCY')} (${theftProtection} ${i18n.t('CAR_CURRENCY')})`;
        }
    }

    static getFullInsuranceOption(fullInsurance, days, fr, hidePlus) {
        if (fullInsurance === -1) {
            return i18n.t('UNAVAILABLE');
        }
        else if (fullInsurance === 0) {
            return `${i18n.t('INCLUDED')}${fr ? 'e' : ''}`;
        } else {
            return `${hidePlus ? '' : '+ '}${fullInsurance * days} ${i18n.t('CURRENCY')} (${fullInsurance} ${i18n.t('CAR_CURRENCY')})`;
        }
    }

    static getAdditionalDriverOption(additionalDriver, days, fr, hidePlus) {
        if (additionalDriver === -1) {
            return i18n.t('UNAVAILABLE');
        }
        else if (additionalDriver === 0) {
            return i18n.t('INCLUDED');
        } else {
            return `${hidePlus ? '' : '+ '}${additionalDriver * days} ${i18n.t('CURRENCY')} (${additionalDriver} ${i18n.t('CAR_CURRENCY')})`;
        }
    }

    static getBookingStatuses() {
        return [
            { value: Env.BOOKING_STATUS.VOID, label: i18n.t('BOOKING_STATUS_VOID') },
            { value: Env.BOOKING_STATUS.PENDING, label: i18n.t('BOOKING_STATUS_PENDING') },
            { value: Env.BOOKING_STATUS.DEPOSIT, label: i18n.t('BOOKING_STATUS_DEPOSIT') },
            { value: Env.BOOKING_STATUS.PAID, label: i18n.t('BOOKING_STATUS_PAID') },
            { value: Env.BOOKING_STATUS.RESERVED, label: i18n.t('BOOKING_STATUS_RESERVED') },
            { value: Env.BOOKING_STATUS.CANCELLED, label: i18n.t('BOOKING_STATUS_CANCELLED') }
        ];
    }

    static flattenCompanies(companies) {
        return companies.map(company => company._id);
    }

    static getBookingStatus(status) {
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
    }

}