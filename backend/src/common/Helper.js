import Env from "../config/env.config";
import { strings as commonStrings } from "../lang/common";
import { strings } from "../lang/cars";

export default class Helper {

    static joinURL(part1, part2) {
        if (part1.charAt(part1.length - 1) === '/') {
            part1 = part1.substr(0, part1.length - 1);
        }
        if (part2.charAt(0) === '/') {
            part2 = part2.substr(1);
        }
        return part1 + '/' + part2;
    }

    static isNumber(val) {
        return /^-?\d+$/.test(val);
    }

    static getCarType(type) {
        switch (type) {
            case Env.CAR_TYPE.DIESEL:
                return strings.DIESEL;

            case Env.CAR_TYPE.GASOLINE:
                return strings.GASOLINE;

            default:
                return '';
        }
    }

    static getCarTypeShort(type) {
        switch (type) {
            case Env.CAR_TYPE.DIESEL:
                return strings.DIESEL_SHORT;

            case Env.CAR_TYPE.GASOLINE:
                return strings.GASOLINE_SHORT;

            default:
                return '';
        }
    }

    static getGearboxType(type) {
        switch (type) {
            case Env.GEARBOX_TYPE.MANUAL:
                return strings.GEARBOX_MANUAL;

            case Env.GEARBOX_TYPE.AUTOMATIC:
                return strings.GEARBOX_AUTOMATIC;

            default:
                return '';
        }
    }

    static getGearboxTypeShort(type) {
        switch (type) {
            case Env.GEARBOX_TYPE.MANUAL:
                return strings.GEARBOX_MANUAL_SHORT;

            case Env.GEARBOX_TYPE.AUTOMATIC:
                return strings.GEARBOX_AUTOMATIC_SHORT;

            default:
                return '';
        }
    }

    static getFuelPolicy(type) {
        switch (type) {
            case Env.FUEL_POLICY.LIKE_FOR_LIKE:
                return strings.FUEL_POLICY_LIKE_FOR_LIKE;

            case Env.FUEL_POLICY.FREE_TANK:
                return strings.FUEL_POLICY_FREE_TANK;

            default:
                return '';
        }
    }

    static getCarTypeTooltip(type) {
        switch (type) {
            case Env.CAR_TYPE.DIESEL:
                return strings.DIESEL_TOOLTIP;

            case Env.CAR_TYPE.GASOLINE:
                return strings.GASOLINE_TOOLTIP;

            default:
                return '';
        }
    }

    static getGearboxTooltip(type) {
        switch (type) {
            case Env.GEARBOX_TYPE.MANUAL:
                return strings.GEARBOX_MANUAL_TOOLTIP;

            case Env.GEARBOX_TYPE.AUTOMATIC:
                return strings.GEARBOX_AUTOMATIC_TOOLTIP;

            default:
                return '';
        }
    }

    static getSeatsTooltip(seats) {
        return `${strings.SEATS_TOOLTIP_1}${seats} ${strings.SEATS_TOOLTIP_2}`;
    }

    static getDoorsTooltip(doors) {
        return `${strings.DOORS_TOOLTIP_1}${doors} ${strings.DOORS_TOOLTIP_2}`;
    }

    static getFuelPolicyTooltip(fuelPolicy) {
        switch (fuelPolicy) {
            case Env.FUEL_POLICY.LIKE_FOR_LIKE:
                return strings.FUEL_POLICY_LIKE_FOR_LIKE_TOOLTIP;

            case Env.FUEL_POLICY.FREE_TANK:
                return strings.FUEL_POLICY_FREE_TANK_TOOLTIP;

            default:
                return '';
        }
    }

    static getMileage(mileage) {
        if (mileage === -1) {
            return strings.UNLIMITED;
        } else {
            return `${mileage} ${strings.MILEAGE_UNIT}`;
        }
    }

    static getMileageTooltip(mileage, fr) {
        if (mileage === -1) {
            return `${strings.MILEAGE} ${strings.UNLIMITED.toLocaleLowerCase()}.`;
        } else {
            return `${strings.MILEAGE}${fr ? ' : ' : ': '}${mileage} ${strings.MILEAGE_UNIT}`;
        }
    }

    static getAdditionalDriver(addionaldriver, fr) {
        if (addionaldriver === -1) {
            return `${strings.ADDITIONAL_DRIVER}${fr ? ' : ' : ': '}${strings.UNAVAILABLE}`;
        }
        else if (addionaldriver === 0) {
            return `${strings.ADDITIONAL_DRIVER}${fr ? ' : ' : ': '}${strings.INCLUDED}`;
        } else {
            return `${strings.ADDITIONAL_DRIVER}${fr ? ' : ' : ': '}${addionaldriver} ${strings.CAR_CURRENCY}`;
        }
    }

    static getFullInsurance(fullInsurance, fr) {
        if (fullInsurance === -1) {
            return `${strings.FULL_INSURANCE}${fr ? ' : ' : ': '}${strings.UNAVAILABLE}`;
        }
        else if (fullInsurance === 0) {
            return `${strings.FULL_INSURANCE}${fr ? ' : ' : ': '}${strings.INCLUDED}${fr ? 'e' : ''}`;
        } else {
            return `${strings.FULL_INSURANCE}${fr ? ' : ' : ': '}${fullInsurance} ${strings.CAR_CURRENCY}`;
        }
    }

    static getCollisionDamageWaiver(collisionDamageWaiver, fr) {
        if (collisionDamageWaiver === -1) {
            return `${strings.COLLISION_DAMAGE_WAVER}${fr ? ' : ' : ': '}${strings.UNAVAILABLE}`;
        }
        else if (collisionDamageWaiver === 0) {
            return `${strings.COLLISION_DAMAGE_WAVER}${fr ? ' : ' : ': '}${strings.INCLUDED}${fr ? 'e' : ''}`;
        } else {
            return `${strings.COLLISION_DAMAGE_WAVER}${fr ? ' : ' : ': '}${collisionDamageWaiver} ${strings.CAR_CURRENCY}`;
        }
    }

    static getTheftProtection(theftProtection, fr) {
        if (theftProtection === -1) {
            return `${strings.THEFT_PROTECTION}${fr ? ' : ' : ': '}${strings.UNAVAILABLE}`;
        }
        else if (theftProtection === 0) {
            return `${strings.THEFT_PROTECTION}${fr ? ' : ' : ': '}${strings.INCLUDED}${fr ? 'e' : ''}`;
        } else {
            return `${strings.THEFT_PROTECTION}${fr ? ' : ' : ': '}${theftProtection} ${strings.CAR_CURRENCY}`;
        }
    }

    static getAmendments(amendments, fr) {
        if (amendments === -1) {
            return `${strings.AMENDMENTS}${fr ? ' : ' : ': '}${strings.UNAVAILABLE}${fr ? 's' : ''}`;
        }
        else if (amendments === 0) {
            return `${strings.AMENDMENTS}${fr ? ' : ' : ': '}${strings.INCLUDED}${fr ? 'es' : ''}`;
        } else {
            return `${strings.AMENDMENTS}${fr ? ' : ' : ': '}${amendments} ${commonStrings.CURRENCY}`;
        }
    }

    static getCancellation(cancellation, fr) {
        if (cancellation === -1) {
            return `${strings.CANCELLATION}${fr ? ' : ' : ': '}${strings.UNAVAILABLE}`;
        }
        else if (cancellation === 0) {
            return `${strings.CANCELLATION}${fr ? ' : ' : ': '}${strings.INCLUDED}${fr ? 'e' : ''}`;
        } else {
            return `${strings.CANCELLATION}${fr ? ' : ' : ': '}${cancellation} ${commonStrings.CURRENCY}`;
        }
    }

    static isAdmin(user) {
        return user && user.type === Env.RECORD_TYPE.ADMIN;
    }

    static getBookingStatus(status) {
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
    }

    static formatNumber(n) {
        return n > 9 ? '' + n : '0' + n;
    }

    static arrayEqual(a, b) {
        if (a === b) return true;
        if (a == null || b == null) return false;
        if (a.length !== b.length) return false;

        // If you don't care about the order of the elements inside
        // the array, you should sort both arrays here.
        // Please note that calling sort on an array will modify that array.
        // you might want to clone your array first.

        for (var i = 0; i < a.length; i++) {
            if (a[i] !== b[i]) return false;
        }
        return true;
    }

    static statusArrayEqual(a, b) {
        if (a === b) return true;
        if (a == null || b == null) return false;
        if (a.length !== b.length) return false;

        // If you don't care about the order of the elements inside
        // the array, you should sort both arrays here.
        // Please note that calling sort on an array will modify that array.
        // you might want to clone your array first.

        for (var i = 0; i < a.length; i++) {
            if (a[i].value !== b[i].value) return false;
        }
        return true;
    }

    static clone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    static filterEqual(a, b) {
        if (a === b) return true;
        if (a == null || b == null) return false;

        if (a.from !== b.from) return false;
        if (a.to !== b.to) return false;
        if (a.pickupLocation !== b.pickupLocation) return false;
        if (a.dropOffLocation !== b.dropOffLocation) return false;

        return true;
    }

    static getBookingStatuses() {
        return [
            { value: Env.BOOKING_STATUS.VOID, label: commonStrings.BOOKING_STATUS_VOID },
            { value: Env.BOOKING_STATUS.PENDING, label: commonStrings.BOOKING_STATUS_PENDING },
            { value: Env.BOOKING_STATUS.DEPOSIT, label: commonStrings.BOOKING_STATUS_DEPOSIT },
            { value: Env.BOOKING_STATUS.PAID, label: commonStrings.BOOKING_STATUS_PAID },
            { value: Env.BOOKING_STATUS.RESERVED, label: commonStrings.BOOKING_STATUS_RESERVED },
            { value: Env.BOOKING_STATUS.CANCELLED, label: commonStrings.BOOKING_STATUS_CANCELLED }
        ];
    }
}