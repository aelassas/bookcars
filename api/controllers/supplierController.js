import path from 'node:path'
import fs from 'node:fs/promises'
import process from 'node:process'
import escapeStringRegexp from 'escape-string-regexp'
import strings from '../config/app.config.js'
import Env from '../config/env.config.js'
import User from '../models/User.js'
import Notification from '../models/Notification.js'
import AdditionalDriver from '../models/AdditionalDriver.js'
import Booking from '../models/Booking.js'
import Car from '../models/Car.js'
import * as Helper from '../common/Helper.js'

const CDN = process.env.BC_CDN_USERS
const CDN_CARS = process.env.BC_CDN_CARS

export async function validate(req, res) {
  const { fullName } = req.body

  try {
    const keyword = escapeStringRegexp(fullName)
    const options = 'i'
    const user = await User.findOne({
      type: Env.USER_TYPE.COMPANY,
      fullName: { $regex: new RegExp(`^${keyword}$`), $options: options },
    })
    return user ? res.sendStatus(204) : res.sendStatus(200)
  } catch (err) {
    console.error(`[supplier.validate] ${strings.DB_ERROR} ${fullName}`, err)
    return res.status(400).send(strings.DB_ERROR + err)
  }
}

export async function update(req, res) {
  const { _id } = req.body

  try {
    const supplier = await User.findById(_id)

    if (supplier) {
      const { fullName, phone, location, bio, payLater } = req.body
      supplier.fullName = fullName
      supplier.phone = phone
      supplier.location = location
      supplier.bio = bio
      supplier.payLater = payLater

      await supplier.save()
      return res.sendStatus(200)
    } else {
      console.error('[supplier.update] Supplier not found:', _id)
      res.sendStatus(204)
    }
  } catch (err) {
    console.error(`[supplier.update] ${strings.DB_ERROR} ${_id}`, err)
    return res.status(400).send(strings.DB_ERROR + err)
  }
}

export async function deleteSupplier(req, res) {
  const { id } = req.params

  try {
    const supplier = await User.findByIdAndDelete(id)
    if (supplier) {
      if (supplier.avatar) {
        const avatar = path.join(CDN, supplier.avatar)
        if (await Helper.exists(avatar)) {
          await fs.unlink(avatar)
        }

        await Notification.deleteMany({ user: id })
        const additionalDrivers = (await Booking.find({ company: id, _additionalDriver: { $ne: null } }, { _id: 0, _additionalDriver: 1 })).map((b) => b._additionalDriver)
        await AdditionalDriver.deleteMany({ _id: { $in: additionalDrivers } })
        await Booking.deleteMany({ company: id })
        const cars = await Car.find({ company: id })
        await Car.deleteMany({ company: id })
        for (const car of cars) {
          const image = path.join(CDN_CARS, car.image)
          if (await Helper.exists(image)) {
            await fs.unlink(image)
          }
        }
      }
    } else {
      return res.sendStatus(404)
    }
    return res.sendStatus(200)
  } catch (err) {
    console.error(`[supplier.delete] ${strings.DB_ERROR} ${id}`, err)
    return res.status(400).send(strings.DB_ERROR + err)
  }
}

export async function getSupplier(req, res) {
  const { id } = req.params

  try {
    const user = await User.findById(id).lean()

    if (!user) {
      console.error('[supplier.getSupplier] Supplier not found:', id)
      return res.sendStatus(204)
    } else {
      const { _id, email, fullName, avatar, phone, location, bio, payLater } = user
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
    }
  } catch (err) {
    console.error(`[supplier.getSupplier] ${strings.DB_ERROR} ${id}`, err)
    return res.status(400).send(strings.DB_ERROR + err)
  }
}

export async function getSuppliers(req, res) {
  try {
    const page = Number.parseInt(req.params.page)
    const size = Number.parseInt(req.params.size)
    const keyword = escapeStringRegexp(req.query.s || '')
    const options = 'i'

    const data = await User.aggregate(
      [
        {
          $match: {
            type: Env.USER_TYPE.COMPANY,
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
      { collation: { locale: Env.DEFAULT_LANGUAGE, strength: 2 } },
    )

    if (data.length > 0) {
      data[0].resultData = data[0].resultData.map((supplier) => {
        const { _id, fullName, avatar } = supplier
        return { _id, fullName, avatar }
      })
    }

    return res.json(data)
  } catch (err) {
    console.error(`[supplier.getSuppliers] ${strings.DB_ERROR} ${req.query.s}`, err)
    return res.status(400).send(strings.DB_ERROR + err)
  }
}

export async function getAllSuppliers(req, res) {
  try {
    let data = await User.aggregate(
      [
        { $match: { type: Env.USER_TYPE.COMPANY } },
        { $sort: { fullName: 1 } },
      ],
      { collation: { locale: Env.DEFAULT_LANGUAGE, strength: 2 } },
    )

    if (data.length > 0) {
      data = data.map((supplier) => {
        const { _id, fullName, avatar } = supplier
        return { _id, fullName, avatar }
      })
    }

    return res.json(data)
  } catch (err) {
    console.error(`[supplier.getAllSuppliers] ${strings.DB_ERROR}`, err)
    return res.status(400).send(strings.DB_ERROR + err)
  }
}
