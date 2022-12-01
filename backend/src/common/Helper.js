import Env from "../config/env.config";
import { strings as commonStrings } from "../lang/common";
import { strings } from "../lang/cars";
import * as CarService from "../services/CarService";
import { toast } from 'react-toastify';

export const capitalize = (str) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
};

export const isDate = (date) => {
    return date instanceof Date && !isNaN(date.valueOf());
};

export const info = (message) => {
    toast(message, { type: 'info' });
};

export const error = (err, message) => {
    if (err && console && console.error) console.error(err);
    if (message) {
        toast(message, { type: 'error' });
    } else {
        toast(commonStrings.GENERIC_ERROR, { type: 'error' });
    }
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

export const isNumber = (val) => {
    return /^-?\d+$/.test(val);
};

export const getCarType = (type) => {
    switch (type) {
        case Env.CAR_TYPE.DIESEL:
            return strings.DIESEL;

        case Env.CAR_TYPE.GASOLINE:
            return strings.GASOLINE;

        default:
            return '';
    }
};

export const getCarTypeShort = (type) => {
    switch (type) {
        case Env.CAR_TYPE.DIESEL:
            return strings.DIESEL_SHORT;

        case Env.CAR_TYPE.GASOLINE:
            return strings.GASOLINE_SHORT;

        default:
            return '';
    }
};

export const getGearboxType = (type) => {
    switch (type) {
        case Env.GEARBOX_TYPE.MANUAL:
            return strings.GEARBOX_MANUAL;

        case Env.GEARBOX_TYPE.AUTOMATIC:
            return strings.GEARBOX_AUTOMATIC;

        default:
            return '';
    }
};

export const getGearboxTypeShort = (type) => {
    switch (type) {
        case Env.GEARBOX_TYPE.MANUAL:
            return strings.GEARBOX_MANUAL_SHORT;

        case Env.GEARBOX_TYPE.AUTOMATIC:
            return strings.GEARBOX_AUTOMATIC_SHORT;

        default:
            return '';
    }
};

export const getFuelPolicy = (type) => {
    switch (type) {
        case Env.FUEL_POLICY.LIKE_FOR_LIKE:
            return strings.FUEL_POLICY_LIKE_FOR_LIKE;

        case Env.FUEL_POLICY.FREE_TANK:
            return strings.FUEL_POLICY_FREE_TANK;

        default:
            return '';
    }
};

export const getCarTypeTooltip = (type) => {
    switch (type) {
        case Env.CAR_TYPE.DIESEL:
            return strings.DIESEL_TOOLTIP;

        case Env.CAR_TYPE.GASOLINE:
            return strings.GASOLINE_TOOLTIP;

        default:
            return '';
    }
};

export const getGearboxTooltip = (type) => {
    switch (type) {
        case Env.GEARBOX_TYPE.MANUAL:
            return strings.GEARBOX_MANUAL_TOOLTIP;

        case Env.GEARBOX_TYPE.AUTOMATIC:
            return strings.GEARBOX_AUTOMATIC_TOOLTIP;

        default:
            return '';
    }
};

export const getSeatsTooltip = (seats) => {
    return `${strings.SEATS_TOOLTIP_1}${seats} ${strings.SEATS_TOOLTIP_2}`;
};

export const getDoorsTooltip = (doors) => {
    return `${strings.DOORS_TOOLTIP_1}${doors} ${strings.DOORS_TOOLTIP_2}`;
};

export const getFuelPolicyTooltip = (fuelPolicy) => {
    switch (fuelPolicy) {
        case Env.FUEL_POLICY.LIKE_FOR_LIKE:
            return strings.FUEL_POLICY_LIKE_FOR_LIKE_TOOLTIP;

        case Env.FUEL_POLICY.FREE_TANK:
            return strings.FUEL_POLICY_FREE_TANK_TOOLTIP;

        default:
            return '';
    }
};

export const getMileage = (mileage) => {
    if (mileage === -1) {
        return strings.UNLIMITED;
    } else {
        return `${mileage} ${strings.MILEAGE_UNIT}`;
    }
};

export const getMileageTooltip = (mileage, fr) => {
    if (mileage === -1) {
        return `${strings.MILEAGE} ${strings.UNLIMITED.toLocaleLowerCase()}.`;
    } else {
        return `${strings.MILEAGE}${fr ? ' : ' : ': '}${mileage} ${strings.MILEAGE_UNIT}`;
    }
};

export const getAdditionalDriver = (additionalDriver, fr) => {
    if (additionalDriver === -1) {
        return `${strings.ADDITIONAL_DRIVER}${fr ? ' : ' : ': '}${strings.UNAVAILABLE}`;
    }
    else if (additionalDriver === 0) {
        return `${strings.ADDITIONAL_DRIVER}${fr ? ' : ' : ': '}${strings.INCLUDED}`;
    } else {
        return `${strings.ADDITIONAL_DRIVER}${fr ? ' : ' : ': '}${additionalDriver} ${strings.CAR_CURRENCY}`;
    }
};

export const getFullInsurance = (fullInsurance, fr) => {
    if (fullInsurance === -1) {
        return `${strings.FULL_INSURANCE}${fr ? ' : ' : ': '}${strings.UNAVAILABLE}`;
    }
    else if (fullInsurance === 0) {
        return `${strings.FULL_INSURANCE}${fr ? ' : ' : ': '}${strings.INCLUDED}${fr ? 'e' : ''}`;
    } else {
        return `${strings.FULL_INSURANCE}${fr ? ' : ' : ': '}${fullInsurance} ${strings.CAR_CURRENCY}`;
    }
};

export const getCollisionDamageWaiver = (collisionDamageWaiver, fr) => {
    if (collisionDamageWaiver === -1) {
        return `${strings.COLLISION_DAMAGE_WAVER}${fr ? ' : ' : ': '}${strings.UNAVAILABLE}`;
    }
    else if (collisionDamageWaiver === 0) {
        return `${strings.COLLISION_DAMAGE_WAVER}${fr ? ' : ' : ': '}${strings.INCLUDED}${fr ? 'e' : ''}`;
    } else {
        return `${strings.COLLISION_DAMAGE_WAVER}${fr ? ' : ' : ': '}${collisionDamageWaiver} ${strings.CAR_CURRENCY}`;
    }
};

export const getTheftProtection = (theftProtection, fr) => {
    if (theftProtection === -1) {
        return `${strings.THEFT_PROTECTION}${fr ? ' : ' : ': '}${strings.UNAVAILABLE}`;
    }
    else if (theftProtection === 0) {
        return `${strings.THEFT_PROTECTION}${fr ? ' : ' : ': '}${strings.INCLUDED}${fr ? 'e' : ''}`;
    } else {
        return `${strings.THEFT_PROTECTION}${fr ? ' : ' : ': '}${theftProtection} ${strings.CAR_CURRENCY}`;
    }
};

export const getAmendments = (amendments, fr) => {
    if (amendments === -1) {
        return `${strings.AMENDMENTS}${fr ? ' : ' : ': '}${strings.UNAVAILABLE}${fr ? 's' : ''}`;
    }
    else if (amendments === 0) {
        return `${strings.AMENDMENTS}${fr ? ' : ' : ': '}${strings.INCLUDED}${fr ? 'es' : ''}`;
    } else {
        return `${strings.AMENDMENTS}${fr ? ' : ' : ': '}${amendments} ${commonStrings.CURRENCY}`;
    }
};

export const getCancellation = (cancellation, fr) => {
    if (cancellation === -1) {
        return `${strings.CANCELLATION}${fr ? ' : ' : ': '}${strings.UNAVAILABLE}`;
    }
    else if (cancellation === 0) {
        return `${strings.CANCELLATION}${fr ? ' : ' : ': '}${strings.INCLUDED}${fr ? 'e' : ''}`;
    } else {
        return `${strings.CANCELLATION}${fr ? ' : ' : ': '}${cancellation} ${commonStrings.CURRENCY}`;
    }
};

export const admin = (user) => {
    return user && user.type === Env.RECORD_TYPE.ADMIN;
};

export const getBookingStatus = (status) => {
    switch (status) {
        case Env.BOOKING_STATUS.VOID:
            return commonStrings.BOOKING_STATUS_VOID;

        case Env.BOOKING_STATUS.PENDING:
            return commonStrings.BOOKING_STATUS_PENDING;

        case Env.BOOKING_STATUS.DEPOSIT:
            return commonStrings.BOOKING_STATUS_DEPOSIT;

        case Env.BOOKING_STATUS.PAID:
            return commonStrings.BOOKING_STATUS_PAID;

        case Env.BOOKING_STATUS.RESERVED:
            return commonStrings.BOOKING_STATUS_RESERVED;

        case Env.BOOKING_STATUS.CANCELLED:
            return commonStrings.BOOKING_STATUS_CANCELLED;

        default:
            return '';
    }
};

export const formatNumber = (n) => {
    return n > 9 ? '' + n : '0' + n;
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

export const carsEqual = (a, b) => {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (a.length !== b.length) return false;

    // If you don't care about the order of the elements inside
    // the array, you should sort both arrays here.
    // Please note that calling sort on an array will modify that array.
    // you might want to clone your array first.

    for (let i = 0; i < a.length; i++) {
        const car = a[i];
        if (b.filter(c => c._id === car._id).length === 0) return false;
    }
    return true;
};

export const clone = (obj) => {
    return JSON.parse(JSON.stringify(obj));
};

export const cloneArray = (arr) => {
    if (typeof arr === 'undefined') return undefined;
    if (arr == null) return null;
    return [...arr];
};

export const filterEqual = (a, b) => {
    if (a === b) return true;
    if (a == null || b == null) return false;

    if (a.from !== b.from) return false;
    if (a.to !== b.to) return false;
    if (a.pickupLocation !== b.pickupLocation) return false;
    if (a.dropOffLocation !== b.dropOffLocation) return false;
    if (a.keyword !== b.keyword) return false;

    return true;
};

export const getBookingStatuses = () => {
    return [
        { value: Env.BOOKING_STATUS.VOID, label: commonStrings.BOOKING_STATUS_VOID },
        { value: Env.BOOKING_STATUS.PENDING, label: commonStrings.BOOKING_STATUS_PENDING },
        { value: Env.BOOKING_STATUS.DEPOSIT, label: commonStrings.BOOKING_STATUS_DEPOSIT },
        { value: Env.BOOKING_STATUS.PAID, label: commonStrings.BOOKING_STATUS_PAID },
        { value: Env.BOOKING_STATUS.RESERVED, label: commonStrings.BOOKING_STATUS_RESERVED },
        { value: Env.BOOKING_STATUS.CANCELLED, label: commonStrings.BOOKING_STATUS_CANCELLED }
    ];
};

export const price = async (booking, car, onSucess, onError) => {

    const totalDays = (date1, date2) => {
        return Math.ceil((date2.getTime() - date1.getTime()) / (1000 * 3600 * 24));
    };

    try {
        if (!car) {
            car = await CarService.getCar(booking.car);
        }

        if (car) {
            const from = new Date(booking.from), to = new Date(booking.to);
            const days = totalDays(from, to);

            let price = car.price * days;
            if (booking.cancellation && car.cancellation > 0) price += car.cancellation;
            if (booking.amendments && car.amendments > 0) price += car.amendments;
            if (booking.theftProtection && car.theftProtection > 0) price += car.theftProtection * days;
            if (booking.collisionDamageWaiver && car.collisionDamageWaiver > 0) price += car.collisionDamageWaiver * days;
            if (booking.fullInsurance && car.fullInsurance > 0) price += car.fullInsurance * days;
            if (booking.additionalDriver && car.additionalDriver > 0) price += car.additionalDriver * days;

            if (onSucess) onSucess(price);
        } else {
            if (onError) onError(`Car ${booking.car} not found.`);
        }
    } catch (err) {
        if (onError) onError(err);
    }
}

export const flattenCompanies = (companies) => {
    return companies.map(company => company._id);
};

export const getUserTypes = () => {
    return [
        { value: Env.RECORD_TYPE.ADMIN, label: commonStrings.RECORD_TYPE_ADMIN },
        { value: Env.RECORD_TYPE.COMPANY, label: commonStrings.RECORD_TYPE_COMPANY },
        { value: Env.RECORD_TYPE.USER, label: commonStrings.RECORD_TYPE_USER },
    ];
};

export const getUserType = (status) => {
    switch (status) {
        case Env.RECORD_TYPE.ADMIN:
            return commonStrings.RECORD_TYPE_ADMIN;

        case Env.RECORD_TYPE.COMPANY:
            return commonStrings.RECORD_TYPE_COMPANY;

        case Env.RECORD_TYPE.USER:
            return commonStrings.RECORD_TYPE_USER;

        default:
            return '';
    }
};

export const days = (from, to) => (
    ((from && to && Math.ceil((to.getTime() - from.getTime()) / (1000 * 3600 * 24))) || 0)
);

export const getDays = (days) => (
    `${strings.PRICE_DAYS_PART_1} ${days} ${strings.PRICE_DAYS_PART_2}${days > 1 ? 's' : ''}`
);

export const getDaysShort = (days) => (
    `${days} ${strings.PRICE_DAYS_PART_2}${days > 1 ? 's' : ''}`
);

export const getCancellationOption = (cancellation, fr, hidePlus) => {
    if (cancellation === -1) {
        return strings.UNAVAILABLE;
    }
    else if (cancellation === 0) {
        return `${strings.INCLUDED}${fr ? 'e' : ''}`;
    } else {
        return `${hidePlus ? '' : '+ '}${cancellation} ${commonStrings.CURRENCY}`;
    }
};

export const getAmendmentsOption = (amendments, fr, hidePlus) => {
    if (amendments === -1) {
        return `${strings.UNAVAILABLE}${fr ? 's' : ''}`;
    }
    else if (amendments === 0) {
        return `${strings.INCLUDED}${fr ? 'es' : ''}`;
    } else {
        return `${hidePlus ? '' : '+ '}${amendments} ${commonStrings.CURRENCY}`;
    }
};

export const getCollisionDamageWaiverOption = (collisionDamageWaiver, days, fr, hidePlus) => {
    if (collisionDamageWaiver === -1) {
        return strings.UNAVAILABLE;
    }
    else if (collisionDamageWaiver === 0) {
        return `${strings.INCLUDED}${fr ? 'e' : ''}`;
    } else {
        return `${hidePlus ? '' : '+ '}${collisionDamageWaiver * days} ${commonStrings.CURRENCY} (${collisionDamageWaiver} ${strings.CAR_CURRENCY})`;
    }
};

export const getTheftProtectionOption = (theftProtection, days, fr, hidePlus) => {
    if (theftProtection === -1) {
        return strings.UNAVAILABLE;
    }
    else if (theftProtection === 0) {
        return `${strings.INCLUDED}${fr ? 'e' : ''}`;
    } else {
        return `${hidePlus ? '' : '+ '}${theftProtection * days} ${commonStrings.CURRENCY} (${theftProtection} ${strings.CAR_CURRENCY})`;
    }
};

export const getFullInsuranceOption = (fullInsurance, days, fr, hidePlus) => {
    if (fullInsurance === -1) {
        return strings.UNAVAILABLE;
    }
    else if (fullInsurance === 0) {
        return `${strings.INCLUDED}${fr ? 'e' : ''}`;
    } else {
        return `${hidePlus ? '' : '+ '}${fullInsurance * days} ${commonStrings.CURRENCY} (${fullInsurance} ${strings.CAR_CURRENCY})`;
    }
};

export const getAdditionalDriverOption = (additionalDriver, days, fr, hidePlus) => {
    if (additionalDriver === -1) {
        return strings.UNAVAILABLE;
    }
    else if (additionalDriver === 0) {
        return strings.INCLUDED;
    } else {
        return `${hidePlus ? '' : '+ '}${additionalDriver * days} ${commonStrings.CURRENCY} (${additionalDriver} ${strings.CAR_CURRENCY})`;
    }
};

export const getBirthDateError = (minimumAge) => (
    `${commonStrings.BIRTH_DATE_NOT_VALID_PART1} ${minimumAge} ${commonStrings.BIRTH_DATE_NOT_VALID_PART2}`
);