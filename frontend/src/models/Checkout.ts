import { z } from 'zod'
import validator from 'validator'
import { intervalToDuration } from 'date-fns'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import * as helper from '@/common/helper'
import { strings as commonStrings } from '@/lang/common'

const validateBirthDate = (car?: bookcarsTypes.Car, date?: Date) => {
    if (!car || !date || !bookcarsHelper.isDate(date)) {
        return false
    }
    const now = new Date()
    const sub = intervalToDuration({ start: date, end: now }).years ?? 0
    return sub >= (car?.minimumAge || 0)
}

const baseSchema = z.object({
    // Driver details
    fullName: z.string().optional(),
    email: z.string().refine((value) => !value || validator.isEmail(value), {
        message: commonStrings.EMAIL_NOT_VALID,
    }).optional(),
    phone: z.string().refine((value) => !value || validator.isMobilePhone(value), {
        message: commonStrings.PHONE_NOT_VALID,
    }).optional(),
    birthDate: z.date().optional(),
    tos: z.boolean().refine((val) => val, {
        message: commonStrings.TOS_ERROR,
    }).optional(),

    // Payment options
    payLater: z.boolean().default(false).optional(),
    payDeposit: z.boolean().default(false).optional(),

    // Booking options
    cancellation: z.boolean().default(false).optional(),
    amendments: z.boolean().default(false).optional(),
    theftProtection: z.boolean().default(false).optional(),
    collisionDamageWaiver: z.boolean().default(false).optional(),
    fullInsurance: z.boolean().default(false).optional(),
    additionalDriver: z.boolean().default(false).optional(),

    // Additional driver details
    additionalDriverFullName: z.string().optional(),
    additionalDriverEmail: z.string()
        .refine((value) => !value || validator.isEmail(value), {
            message: commonStrings.EMAIL_NOT_VALID,
        }).optional(),
    additionalDriverPhone: z
        .string()
        .refine((value) => !value || validator.isMobilePhone(value), {
            message: commonStrings.PHONE_NOT_VALID,
        }).optional()
    ,
    additionalDriverBirthDate: z.date().optional(),
})

export const createSchema = (car?: bookcarsTypes.Car) => {
    if (car) {
        return baseSchema.merge(
            z.object({
                birthDate: z.date().refine(
                    (date) => !date || validateBirthDate(car, date),
                    {
                        message: car.minimumAge ? helper.getBirthDateError(car.minimumAge) : '',
                    }
                ).optional(),
                additionalDriverBirthDate: z.date().refine(
                    (date) => !date || validateBirthDate(car, date),
                    {
                        message: car.minimumAge ? helper.getBirthDateError(car.minimumAge) : '',
                    }
                ).optional(),
            })
        )
    }

    return baseSchema
}

export type FormFields = z.infer<ReturnType<typeof createSchema>>
