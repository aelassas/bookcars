import path from 'node:path'
import fs from 'node:fs/promises'
import escapeStringRegexp from 'escape-string-regexp'
import { Request, Response } from 'express'
import * as bookcarsTypes from 'bookcars-types'
import i18n from '../lang/i18n'
import * as env from '../config/env.config'
import User from '../models/User'
import NotificationCounter from '../models/NotificationCounter'
import Notification from '../models/Notification'
import AdditionalDriver from '../models/AdditionalDriver'
import Booking from '../models/Booking'
import Car from '../models/Car'
import * as helper from '../common/helper'

/**
 * Validate Supplier by fullname.
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const validate = async (req: Request, res: Response) => {
  const { body }: { body: bookcarsTypes.ValidateSupplierPayload } = req
  const { fullName } = body

  try {
    const keyword = escapeStringRegexp(fullName)
    const options = 'i'
    const user = await User.findOne({
      type: bookcarsTypes.UserType.Company,
      fullName: { $regex: new RegExp(`^${keyword}$`), $options: options },
    })
    return user ? res.sendStatus(204) : res.sendStatus(200)
  } catch (err) {
    console.error(`[supplier.validate] ${i18n.t('DB_ERROR')} ${fullName}`, err)
    return res.status(400).send(i18n.t('DB_ERROR') + err)
  }
}

/**
 * Update Supplier.
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const update = async (req: Request, res: Response) => {
  const { body }: { body: bookcarsTypes.UpdateSupplierPayload } = req
  const { _id } = body

  try {
    if (!helper.isValidObjectId(_id)) {
      throw new Error('body._id is not valid')
    }
    const supplier = await User.findById(_id)

    if (supplier) {
      const {
        fullName,
        phone,
        location,
        bio,
        payLater,
      } = body
      supplier.fullName = fullName
      supplier.phone = phone
      supplier.location = location
      supplier.bio = bio
      supplier.payLater = payLater

      await supplier.save()
      return res.json({
        _id,
        fullName: supplier.fullName,
        phone: supplier.phone,
        location: supplier.location,
        bio: supplier.bio,
        payLater: supplier.payLater,
      })
    }
    console.error('[supplier.update] Supplier not found:', _id)
    return res.sendStatus(204)
  } catch (err) {
    console.error(`[supplier.update] ${i18n.t('DB_ERROR')} ${_id}`, err)
    return res.status(400).send(i18n.t('DB_ERROR') + err)
  }
}

/**
 * Delete Supplier by ID.
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const deleteSupplier = async (req: Request, res: Response) => {
  const { id } = req.params

  try {
    const supplier = await User.findById(id)
    if (supplier) {
      await User.deleteOne({ _id: id })

      if (supplier.avatar) {
        const avatar = path.join(env.CDN_USERS, supplier.avatar)
        if (await helper.exists(avatar)) {
          await fs.unlink(avatar)
        }

        await NotificationCounter.deleteMany({ user: id })
        await Notification.deleteMany({ user: id })
        const additionalDrivers = (await Booking.find({ company: id, _additionalDriver: { $ne: null } }, { _id: 0, _additionalDriver: 1 })).map((b) => b._additionalDriver)
        await AdditionalDriver.deleteMany({ _id: { $in: additionalDrivers } })
        await Booking.deleteMany({ company: id })
        const cars = await Car.find({ company: id })
        await Car.deleteMany({ company: id })
        for (const car of cars) {
          if (car.image) {
            const image = path.join(env.CDN_CARS, car.image)
            if (await helper.exists(image)) {
              await fs.unlink(image)
            }
          }
        }
      }
    } else {
      return res.sendStatus(204)
    }
    return res.sendStatus(200)
  } catch (err) {
    console.error(`[supplier.delete] ${i18n.t('DB_ERROR')} ${id}`, err)
    return res.status(400).send(i18n.t('DB_ERROR') + err)
  }
}

/**
 * Get Supplier by ID.
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const getSupplier = async (req: Request, res: Response) => {
  const { id } = req.params

  try {
    const user = await User.findById(id).lean()

    if (!user) {
      console.error('[supplier.getSupplier] Supplier not found:', id)
      return res.sendStatus(204)
    }
    const {
      _id,
      email,
      fullName,
      avatar,
      phone,
      location,
      bio,
      payLater,
    } = user

    return res.json({
      _id,
      email,
      fullName,
      avatar,
      phone,
      location,
      bio,
      payLater,
    })
  } catch (err) {
    console.error(`[supplier.getSupplier] ${i18n.t('DB_ERROR')} ${id}`, err)
    return res.status(400).send(i18n.t('DB_ERROR') + err)
  }
}

/**
 * Get Suppliers.
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const getSuppliers = async (req: Request, res: Response) => {
  try {
    const page = Number.parseInt(req.params.page, 10)
    const size = Number.parseInt(req.params.size, 10)
    const keyword = escapeStringRegexp(String(req.query.s || ''))
    const options = 'i'

    const data = await User.aggregate(
      [
        {
          $match: {
            type: bookcarsTypes.UserType.Company,
            fullName: { $regex: keyword, $options: options },
          },
        },
        {
          $facet: {
            resultData: [{ $sort: { fullName: 1 } }, { $skip: (page - 1) * size }, { $limit: size }],
            pageInfo: [
              {
                $count: 'totalRecords',
              },
            ],
          },
        },
      ],
      { collation: { locale: env.DEFAULT_LANGUAGE, strength: 2 } },
    )

    data[0].resultData = data[0].resultData.map((supplier: env.User) => {
      const { _id, fullName, avatar } = supplier
      return { _id, fullName, avatar }
    })

    return res.json(data)
  } catch (err) {
    console.error(`[supplier.getSuppliers] ${i18n.t('DB_ERROR')} ${req.query.s}`, err)
    return res.status(400).send(i18n.t('DB_ERROR') + err)
  }
}

/**
 * Get all Suppliers.
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const getAllSuppliers = async (req: Request, res: Response) => {
  try {
    let data = await User.aggregate(
      [
        { $match: { type: bookcarsTypes.UserType.Company } },
        { $sort: { fullName: 1 } },
      ],
      { collation: { locale: env.DEFAULT_LANGUAGE, strength: 2 } },
    )

    data = data.map((supplier) => {
      const { _id, fullName, avatar } = supplier
      return { _id, fullName, avatar }
    })

    return res.json(data)
  } catch (err) {
    console.error(`[supplier.getAllSuppliers] ${i18n.t('DB_ERROR')}`, err)
    return res.status(400).send(i18n.t('DB_ERROR') + err)
  }
}
