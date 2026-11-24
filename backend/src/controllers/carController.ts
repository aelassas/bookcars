import asyncFs from 'node:fs/promises'
import path from 'node:path'
import { nanoid } from 'nanoid'
import escapeStringRegexp from 'escape-string-regexp'
import mongoose from 'mongoose'
import { Request, Response } from 'express'
import { SendMailOptions } from 'nodemailer'
import * as bookcarsTypes from ':bookcars-types'
import Booking from '../models/Booking'
import Car from '../models/Car'
import i18n from '../lang/i18n'
import * as env from '../config/env.config'
import * as helper from '../utils/helper'
import * as logger from '../utils/logger'
import { BOOKING_RESERVATION_STATUSES } from '../utils/bookingReservationHelper'
import DateBasedPrice from '../models/DateBasedPrice'
import User from '../models/User'
import Notification from '../models/Notification'
import NotificationCounter from '../models/NotificationCounter'
import * as mailHelper from '../utils/mailHelper'
import Location from '../models/Location'
import { getPickupLocationIds } from '../utils/searchLocation'

/**
 * Create a Car.
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const create = async (req: Request, res: Response) => {
  const { body }: { body: bookcarsTypes.CreateCarPayload } = req

  try {
    if (!body.image) {
      throw new Error('Image not found in payload')
    }

    // date based price
    const { dateBasedPrices, ...carFields } = body
    const isAdmin = req.user?.type === bookcarsTypes.UserType.Admin
    const requestedStatus = (body as bookcarsTypes.CreateCarPayload & { listingStatus?: bookcarsTypes.ListingStatus }).listingStatus
    const listingStatus = isAdmin && requestedStatus && Object.values(bookcarsTypes.ListingStatus).includes(requestedStatus)
      ? requestedStatus
      : isAdmin
        ? bookcarsTypes.ListingStatus.Approved
        : bookcarsTypes.ListingStatus.PendingReview
    // Supplier identity and review state are server-owned, never body-controlled.
    carFields.supplier = isAdmin ? carFields.supplier : req.user!._id
    const dateBasedPriceIds: string[] = []
    if (body.isDateBasedPrice) {
      for (const dateBasePrice of dateBasedPrices) {
        const dbp = new DateBasedPrice(dateBasePrice)
        await dbp.save()
        dateBasedPriceIds.push(dbp._id.toString())
      }
    }

    const car = new Car({ ...carFields, listingStatus, dateBasedPrices: dateBasedPriceIds })
    await car.save()

    // --------- image ---------
    // 1. Sanitize filename
    const safeImage = path.basename(body.image)

    // If basename modified it → traversal attempt
    if (safeImage !== body.image) {
      await Car.deleteOne({ _id: car._id })
      logger.warn(`[car.create] Directory traversal attempt (image): ${body.image}`)
      throw new Error('Invalid image filename')
    }

    const tempDir = path.resolve(env.CDN_TEMP_CARS)
    const carsDir = path.resolve(env.CDN_CARS)

    const sourcePath = path.resolve(tempDir, safeImage)

    // 2. Ensure source stays inside temp directory
    if (!sourcePath.startsWith(tempDir + path.sep)) {
      await Car.deleteOne({ _id: car._id })
      logger.warn(`[car.create] Source path escape attempt: ${sourcePath}`)
      throw new Error('Invalid image path')
    }

    if (await helper.pathExists(sourcePath)) {
      const ext = path.extname(safeImage).toLowerCase()

      // 3. Restrict allowed extensions
      if (!env.allowedImageExtensions.includes(ext)) {
        await Car.deleteOne({ _id: car._id })
        throw new Error('Invalid image type')
      }

      const filename = `${car._id}_${Date.now()}${ext}`
      const newPath = path.resolve(carsDir, filename)

      // 4. Ensure destination stays inside cars directory
      if (!newPath.startsWith(carsDir + path.sep)) {
        await Car.deleteOne({ _id: car._id })
        logger.warn(`[car.create] Destination path escape attempt: ${newPath}`)
        throw new Error('Invalid image destination')
      }

      await asyncFs.rename(sourcePath, newPath)

      car.image = filename
      await car.save()
    } else {
      await Car.deleteOne({ _id: car._id })
      throw new Error(`Image ${safeImage} not found`)
    }
    // --------- image ---------

    // notify admin if the car was created by a supplier
    if (body.loggedUser) {
      const loggedUser = await User.findById(body.loggedUser)

      if (loggedUser && loggedUser.type === bookcarsTypes.UserType.Supplier) {
        const supplier = await User.findById(body.supplier)

        if (supplier?.notifyAdminOnNewCar) {
          const admin = !!env.ADMIN_EMAIL && (await User.findOne({ email: env.ADMIN_EMAIL, type: bookcarsTypes.UserType.Admin }))
          if (admin) {
            i18n.locale = admin.language
            const message = i18n.t('NEW_CAR_NOTIFICATION_PART1') + supplier.fullName + i18n.t('NEW_CAR_NOTIFICATION_PART2')

            // notification
            const notification = new Notification({
              user: admin._id,
              message,
              car: car._id.toString(),
            })

            await notification.save()
            let counter = await NotificationCounter.findOne({ user: admin._id })
            if (counter && typeof counter.count !== 'undefined') {
              counter.count += 1
              await counter.save()
            } else {
              counter = new NotificationCounter({ user: admin._id, count: 1 })
              await counter.save()
            }

            // mail
            if (admin.enableEmailNotifications) {
              const mailOptions: SendMailOptions = {
                from: env.SMTP_FROM,
                to: admin.email,
                subject: message,
                html: `<p>
${i18n.t('HELLO')}${admin.fullName},<br><br>
${message}<br><br>
${helper.joinURL(env.ADMIN_HOST, `update-car?cr=${car._id.toString()}`)}<br><br>
${i18n.t('REGARDS')}<br>
</p>`,
              }

              await mailHelper.sendMail(mailOptions)
            }
          }
        }
      }
    }

    res.json(car)
  } catch (err) {
    logger.error(`[car.create] ${i18n.t('ERROR')} ${JSON.stringify(body)}`, err)
    res.status(400).send(i18n.t('ERROR') + err)
  }
}

const createDateBasedPrice = async (dateBasedPrice: bookcarsTypes.DateBasedPrice): Promise<string> => {
  const dbp = new DateBasedPrice({
    startDate: dateBasedPrice.startDate,
    endDate: dateBasedPrice.endDate,
    dailyPrice: dateBasedPrice.dailyPrice,
  })
  await dbp.save()
  return dbp._id.toString()
}

/**
 * Update a Car.
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const update = async (req: Request, res: Response) => {
  const { body }: { body: bookcarsTypes.UpdateCarPayload } = req
  const { _id } = body

  try {
    if (!helper.isValidObjectId(_id)) {
      throw new Error('body._id is not valid')
    }
    const car = await Car.findById(_id)

    if (car) {
      // begin of security check
      const sessionUserId = req.user?._id
      const sessionUser = await User.findById(sessionUserId)
      if (!sessionUser || (sessionUser.type === bookcarsTypes.UserType.Supplier && car.supplier?.toString() !== sessionUserId)) {
        logger.error(`[car.update] Unauthorized attempt to update car ${car._id} by user ${sessionUserId}`)
        res.status(403).send('Forbidden: You cannot update this location')
        return
      }
      if (sessionUser.type === bookcarsTypes.UserType.Supplier) {
        // Any supplier edit invalidates the previous compliance review.
        car.listingStatus = bookcarsTypes.ListingStatus.PendingReview
        car.complianceNotes = undefined
        car.reviewedBy = undefined
        car.reviewedAt = undefined
      }
      // end of security check

      const {
        supplier,
        name,
        licensePlate,
        minimumAge,
        available,
        fullyBooked,
        comingSoon,
        type,
        locations,
        dailyPrice,
        discountedDailyPrice,
        hourlyPrice,
        discountedHourlyPrice,
        biWeeklyPrice,
        discountedBiWeeklyPrice,
        weeklyPrice,
        discountedWeeklyPrice,
        monthlyPrice,
        discountedMonthlyPrice,
        deposit,
        seats,
        doors,
        aircon,
        gearbox,
        fuelPolicy,
        mileage,
        cancellation,
        amendments,
        theftProtection,
        collisionDamageWaiver,
        fullInsurance,
        additionalDriver,
        range,
        multimedia,
        rating,
        co2,
        isDateBasedPrice,
        dateBasedPrices,
        blockOnPay,
      } = body

      if (sessionUser.type === bookcarsTypes.UserType.Admin) {
        car.supplier = new mongoose.Types.ObjectId(supplier)
      }
      car.minimumAge = minimumAge
      car.locations = locations.map((l) => new mongoose.Types.ObjectId(l))
      car.name = name
      car.licensePlate = licensePlate
      car.available = available
      car.fullyBooked = fullyBooked
      car.comingSoon = comingSoon
      car.type = type as bookcarsTypes.CarType
      car.dailyPrice = dailyPrice
      car.discountedDailyPrice = discountedDailyPrice
      car.hourlyPrice = hourlyPrice
      car.discountedHourlyPrice = discountedHourlyPrice
      car.biWeeklyPrice = biWeeklyPrice
      car.discountedBiWeeklyPrice = discountedBiWeeklyPrice
      car.weeklyPrice = weeklyPrice
      car.discountedWeeklyPrice = discountedWeeklyPrice
      car.monthlyPrice = monthlyPrice
      car.discountedMonthlyPrice = discountedMonthlyPrice
      car.deposit = deposit
      car.seats = seats
      car.doors = doors
      car.aircon = aircon
      car.gearbox = gearbox as bookcarsTypes.GearboxType
      car.fuelPolicy = fuelPolicy as bookcarsTypes.FuelPolicy
      car.mileage = mileage
      car.cancellation = cancellation
      car.amendments = amendments
      car.theftProtection = theftProtection
      car.collisionDamageWaiver = collisionDamageWaiver
      car.fullInsurance = fullInsurance
      car.additionalDriver = additionalDriver
      car.range = range
      car.multimedia = multimedia
      car.rating = rating
      car.co2 = co2
      car.isDateBasedPrice = isDateBasedPrice
      car.blockOnPay = blockOnPay

      //
      // Date based prices
      //

      // Remove all date based prices not in body.dateBasedPrices
      const dateBasedPriceIds = dateBasedPrices.filter((dbp) => !!dbp._id).map((dbp) => dbp._id)
      const dateBasedPriceIdsToDelete = car.dateBasedPrices.filter((id) => !dateBasedPriceIds.includes(id.toString()))
      if (dateBasedPriceIdsToDelete.length > 0) {
        for (const dbpId of dateBasedPriceIdsToDelete) {
          car.dateBasedPrices.splice(car.dateBasedPrices.indexOf(dbpId), 1)
        }

        await DateBasedPrice.deleteMany({ _id: { $in: dateBasedPriceIdsToDelete } })
      }

      // Add all new date based prices
      for (const dateBasedPrice of dateBasedPrices.filter((dbp) => dbp._id === undefined)) {
        const dbpId = await createDateBasedPrice(dateBasedPrice)
        car.dateBasedPrices.push(new mongoose.Types.ObjectId(dbpId))
      }

      // Update existing date based prices
      for (const dateBasedPrice of dateBasedPrices.filter((dbp) => !!dbp._id)) {
        const dbp = await DateBasedPrice.findById(dateBasedPrice._id)
        if (dbp) {
          dbp.startDate = new Date(dateBasedPrice.startDate!)
          dbp.endDate = new Date(dateBasedPrice.endDate!)
          dbp.dailyPrice = Number(dateBasedPrice.dailyPrice)

          await dbp.save()
        }
      }

      await car.save()

      res.json(car)
      return
    }

    logger.error('[car.update] Car not found:', _id)
    res.sendStatus(204)
  } catch (err) {
    logger.error(`[car.update] ${i18n.t('ERROR')} ${_id}`, err)
    res.status(400).send(i18n.t('ERROR') + err)
  }
}

/**
 * Check if a Car is related to bookings.
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const checkCar = async (req: Request, res: Response) => {
  const { id } = req.params as { id: string }

  try {
    const _id = new mongoose.Types.ObjectId(id)
    const count = await Booking
      .find({ car: _id })
      .limit(1)
      .countDocuments()

    if (count === 1) {
      res.sendStatus(200)
      return
    }

    res.sendStatus(204)
  } catch (err) {
    logger.error(`[car.check] ${i18n.t('ERROR')} ${id}`, err)
    res.status(400).send(i18n.t('ERROR') + err)
  }
}

/**
 * Validate if a license plate is unique.
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const validateLicensePlate = async (req: Request, res: Response) => {
  const { licensePlate } = req.params

  try {
    const car = await Car.findOne({ licensePlate: licensePlate })
    if (car) {
      res.sendStatus(204)
    } else {
      res.sendStatus(200)
    }
  } catch (err) {
    logger.error(`[car.validateLicensePlate] ${i18n.t('ERROR')} ${licensePlate}`, err)
    res.status(400).send(i18n.t('ERROR') + err)
  }
}

/**
 * Validate if a license plate is unique for updating car.
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const validateCarLicensePlate = async (req: Request, res: Response) => {
  const { id, licensePlate } = req.params

  try {
    const car = await Car.findOne({ _id: { $ne: id }, licensePlate: licensePlate })
    if (car) {
      res.sendStatus(204)
    } else {
      res.sendStatus(200)
    }
  } catch (err) {
    logger.error(`[car.validateLicensePlate] ${i18n.t('ERROR')} ${licensePlate}`, err)
    res.status(400).send(i18n.t('ERROR') + err)
  }
}

/**
 * Delete a Car by ID.
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const deleteCar = async (req: Request, res: Response) => {
  const { id } = req.params

  try {
    const car = await Car.findById(id)
    if (car) {
      // begin of security check
      const sessionUserId = req.user?._id
      const sessionUser = await User.findById(sessionUserId)
      if (!sessionUser || (sessionUser.type === bookcarsTypes.UserType.Supplier && car.supplier?.toString() !== sessionUserId)) {
        logger.error(`[car.delete] Unauthorized attempt to delete car ${car._id} by user ${sessionUserId}`)
        res.status(403).send('Forbidden: You cannot delete this car')
        return
      }
      // end of security check

      await Car.deleteOne({ _id: id })

      if (car.dateBasedPrices?.length > 0) {
        await DateBasedPrice.deleteMany({ _id: { $in: car.dateBasedPrices } })
      }

      if (car.image) {
        const image = path.join(env.CDN_CARS, car.image)
        if (await helper.pathExists(image)) {
          await asyncFs.unlink(image)
        }
      }
      await Booking.deleteMany({ car: car._id })
    } else {
      res.sendStatus(204)
      return
    }
    res.sendStatus(200)
  } catch (err) {
    logger.error(`[car.delete] ${i18n.t('ERROR')} ${id}`, err)
    res.status(400).send(i18n.t('ERROR') + err)
  }
}

/**
 * Upload a Car image to temp folder.
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const createImage = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      throw new Error('[car.createImage] req.file not found')
    }

    const filename = `${helper.getFilenameWithoutExtension(req.file.originalname)}_${nanoid()}_${Date.now()}${path.extname(req.file.originalname)}`
    const filepath = path.join(env.CDN_TEMP_CARS, filename)

    // security check: restrict allowed extensions
    const ext = path.extname(filename)
    if (!env.allowedImageExtensions.includes(ext.toLowerCase())) {
      res.status(400).send('Invalid car image file type')
      return
    }

    await asyncFs.writeFile(filepath, req.file.buffer)
    res.json(filename)
  } catch (err) {
    logger.error(`[car.createImage] ${i18n.t('ERROR')}`, err)
    res.status(400).send(i18n.t('ERROR') + err)
  }
}

/**
 * Update a Car image.
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const updateImage = async (req: Request, res: Response) => {
  const { id } = req.params

  try {
    if (!req.file) {
      const msg = '[car.updateImage] req.file not found'
      logger.error(msg)
      res.status(400).send(msg)
      return
    }

    const { file } = req

    const car = await Car.findById(id)

    if (car) {
      if (car.image) {
        const image = path.join(env.CDN_CARS, car.image)
        if (await helper.pathExists(image)) {
          await asyncFs.unlink(image)
        }
      }

      const filename = `${car._id}_${Date.now()}${path.extname(file.originalname)}`
      const filepath = path.join(env.CDN_CARS, filename)

      // security check: restrict allowed extensions
      const ext = path.extname(filename)
      if (!env.allowedImageExtensions.includes(ext.toLowerCase())) {
        res.status(400).send('Invalid car image file type')
        return
      }

      await asyncFs.writeFile(filepath, file.buffer)
      car.image = filename
      await car.save()
      res.json(filename)
      return
    }

    logger.error('[car.updateImage] Car not found:', id)
    res.sendStatus(204)
  } catch (err) {
    logger.error(`[car.updateImage] ${i18n.t('ERROR')} ${id}`, err)
    res.status(400).send(i18n.t('ERROR') + err)
  }
}

/**
 * Delete a Car image.
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const deleteImage = async (req: Request, res: Response) => {
  const { id } = req.params

  try {
    const car = await Car.findById(id)

    if (car) {
      if (car.image) {
        const image = path.join(env.CDN_CARS, car.image)
        if (await helper.pathExists(image)) {
          await asyncFs.unlink(image)
        }
      }
      car.image = null

      await car.save()
      res.sendStatus(200)
      return
    }
    logger.error('[car.deleteImage] Car not found:', id)
    res.sendStatus(204)
  } catch (err) {
    logger.error(`[car.deleteImage] ${i18n.t('ERROR')} ${id}`, err)
    res.status(400).send(i18n.t('ERROR') + err)
  }
}

/**
 * Delete a temp Car image.
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {*}
 */
export const deleteTempImage = async (req: Request, res: Response) => {
  const { image } = req.params

  try {
    // prevent null bytes
    if (image.includes('\0')) {
      res.status(400).send('Invalid filename')
      return
    }

    const baseDir = path.resolve(env.CDN_TEMP_CARS)
    const targetPath = path.resolve(baseDir, image as string)

    // critical security check: prevent directory traversal
    if (!targetPath.startsWith(baseDir + path.sep)) {
      logger.warn(`Directory traversal attempt: ${image}`)
      res.status(403).send('Forbidden')
      return
    }

    if (await helper.pathExists(targetPath)) {
      await asyncFs.unlink(targetPath)
    } else {
      throw new Error(`[car.deleteTempImage] temp image ${image} not found`)
    }

    res.sendStatus(200)
  } catch (err) {
    logger.error(`[car.deleteTempImage] ${i18n.t('ERROR')} ${image}`, err)
    res.status(400).send(i18n.t('ERROR') + err)
  }
}

/**
 * Get a Car by ID.
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const getCar = async (req: Request, res: Response) => {
  const { id, language } = req.params

  try {
    const car = await Car.findById(id)
      .populate<{ supplier: env.UserInfo }>('supplier')
      .populate<{ dateBasedPrices: env.DateBasedPrice[] }>('dateBasedPrices')
      .populate<{ locations: env.LocationInfo[] }>({
        path: 'locations',
        populate: {
          path: 'values',
          model: 'LocationValue',
        },
      })
      .lean()

    if (car) {
      if (car.listingStatus !== bookcarsTypes.ListingStatus.Approved) {
        const isOwner = req.user?.type === bookcarsTypes.UserType.Supplier && String(car.supplier._id) === req.user._id
        const isAdmin = req.user?.type === bookcarsTypes.UserType.Admin
        if (!isOwner && !isAdmin) {
          res.sendStatus(404)
          return
        }
      }
      const {
        _id,
        fullName,
        avatar,
        payLater,
        licenseRequired,
        priceChangeRate,
      } = car.supplier
      car.supplier = {
        _id,
        fullName,
        avatar,
        payLater,
        licenseRequired,
        priceChangeRate,
      }

      for (const location of car.locations) {
        location.name = location.values.filter((value) => value.language === language)[0].value
      }

      res.json(car)
      return
    }
    logger.error('[car.getCar] Car not found:', id)
    res.sendStatus(204)
  } catch (err) {
    logger.error(`[car.getCar] ${i18n.t('ERROR')} ${id}`, err)
    res.status(400).send(i18n.t('ERROR') + err)
  }
}

/**
 * Get Cars.
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const getCars = async (req: Request, res: Response) => {
  try {
    const { body }: { body: bookcarsTypes.GetCarsPayload } = req
    const page = Number.parseInt(req.params.page as string, 10)
    const size = Number.parseInt(req.params.size as string, 10)
    const suppliers = req.user?.type === bookcarsTypes.UserType.Supplier
      ? [new mongoose.Types.ObjectId(req.user._id)]
      : body.suppliers!.map((id) => new mongoose.Types.ObjectId(id))
    const {
      carType,
      gearbox,
      mileage,
      deposit,
      availability,
      fuelPolicy,
      carSpecs,
      ranges,
      multimedia,
      rating,
      seats,
    } = body
    const keyword = escapeStringRegexp(String(req.query.s || ''))
    const options = 'i'

    const $match: mongoose.QueryFilter<bookcarsTypes.Car> = {
      $and: [
        { $or: [{ name: { $regex: keyword, $options: options } }, { licensePlate: { $regex: keyword, $options: options } }] },
        { supplier: { $in: suppliers } },
      ],
    }

    if (fuelPolicy) {
      $match.$and!.push({ fuelPolicy: { $in: fuelPolicy } })
    }

    if (carSpecs) {
      if (carSpecs.aircon) {
        $match.$and!.push({ aircon: true })
      }
      if (carSpecs.moreThanFourDoors) {
        $match.$and!.push({ doors: { $gt: 4 } })
      }
      if (carSpecs.moreThanFiveSeats) {
        $match.$and!.push({ seats: { $gt: 5 } })
      }
    }

    if (carType) {
      $match.$and!.push({ type: { $in: carType } })
    }

    if (gearbox) {
      $match.$and!.push({ gearbox: { $in: gearbox } })
    }

    if (mileage) {
      if (mileage.length === 1 && mileage[0] === bookcarsTypes.Mileage.Limited) {
        $match.$and!.push({ mileage: { $gt: -1 } })
      } else if (mileage.length === 1 && mileage[0] === bookcarsTypes.Mileage.Unlimited) {
        $match.$and!.push({ mileage: -1 })
      } else if (mileage.length === 0) {
        res.json([{ resultData: [], pageInfo: [] }])
        return
      }
    }

    if (deposit && deposit > -1) {
      $match.$and!.push({ deposit: { $lte: deposit } })
    }

    if (Array.isArray(availability)) {
      if (availability.length === 1 && availability[0] === bookcarsTypes.Availablity.Available) {
        $match.$and!.push({ available: true })
      } else if (availability.length === 1
        && availability[0] === bookcarsTypes.Availablity.Unavailable) {
        $match.$and!.push({ available: false })
      } else if (availability.length === 0) {
        res.json([{ resultData: [], pageInfo: [] }])
        return
      }
    }

    if (ranges) {
      $match.$and!.push({ range: { $in: ranges } })
    }

    if (multimedia && multimedia.length > 0) {
      for (const multimediaOption of multimedia) {
        $match.$and!.push({ multimedia: multimediaOption })
      }
    }

    if (rating && rating > -1) {
      $match.$and!.push({ rating: { $gte: rating } })
    }

    if (seats) {
      if (seats > -1) {
        if (seats === 6) {
          $match.$and!.push({ seats: { $gt: 5 } })
        } else {
          $match.$and!.push({ seats })
        }
      }
    }

    const data = await Car.aggregate(
      [
        { $match },
        {
          $lookup: {
            from: 'User',
            localField: 'supplier',
            foreignField: '_id',
            as: 'supplier',
          },
        },
        { $unwind: '$supplier' },
        // {
        //   $lookup: {
        //     from: 'Location',
        //     let: { locations: '$locations' },
        //     pipeline: [
        //       {
        //         $match: {
        //           $expr: { $in: ['$_id', '$$locations'] },
        //         },
        //       },
        //     ],
        //     as: 'locations',
        //   },
        // },
        {
          $facet: {
            resultData: [
              { $sort: { updatedAt: -1, _id: 1 } },
              { $skip: (page - 1) * size },
              { $limit: size },
            ],
            pageInfo: [
              {
                $group: {
                  _id: null,
                  totalRecords: { $sum: 1 },
                },
              },
            ],
          },
        },
      ],
      { collation: { locale: env.DEFAULT_LANGUAGE, strength: 2 } },
    )

    // const data = await Car.aggregate(
    //   [
    //     { $match },
    //     {
    //       $lookup: {
    //         from: 'User',
    //         let: { userId: '$supplier' },
    //         pipeline: [
    //           {
    //             $match: {
    //               $expr: { $eq: ['$_id', '$$userId'] },
    //             },
    //           },
    //         ],
    //         as: 'supplier',
    //       },
    //     },
    //     { $unwind: { path: '$supplier', preserveNullAndEmptyArrays: false } },
    //     // {
    //     //   $lookup: {
    //     //     from: 'Location',
    //     //     let: { locations: '$locations' },
    //     //     pipeline: [
    //     //       {
    //     //         $match: {
    //     //           $expr: { $in: ['$_id', '$$locations'] },
    //     //         },
    //     //       },
    //     //     ],
    //     //     as: 'locations',
    //     //   },
    //     // },
    //     {
    //       $facet: {
    //         resultData: [{ $sort: { updatedAt: -1, _id: 1 } }, { $skip: (page - 1) * size }, { $limit: size }],
    //         // resultData: [{ $sort: { dailyPrice: 1, _id: 1 } }, { $skip: (page - 1) * size }, { $limit: size }],
    //         pageInfo: [
    //           {
    //             $count: 'totalRecords',
    //           },
    //         ],
    //       },
    //     },
    //   ],
    //   { collation: { locale: env.DEFAULT_LANGUAGE, strength: 2 } },
    // )

    for (const car of data[0].resultData) {
      const { _id, fullName, avatar } = car.supplier
      car.supplier = { _id, fullName, avatar }
    }

    res.json(data)
  } catch (err) {
    logger.error(`[car.getCars] ${i18n.t('ERROR')} ${req.query.s}`, err)
    res.status(400).send(i18n.t('ERROR') + err)
  }
}

/**
 * Get Cars by Supplier and pick-up Location.
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const getBookingCars = async (req: Request, res: Response) => {
  try {
    const { body }: { body: bookcarsTypes.GetBookingCarsPayload } = req
    if (req.user?.type === bookcarsTypes.UserType.Supplier && body.supplier !== req.user._id) {
      res.sendStatus(403)
      return
    }
    const supplier = new mongoose.Types.ObjectId(body.supplier)
    const pickupLocation = new mongoose.Types.ObjectId(body.pickupLocation)
    const keyword = escapeStringRegexp(String(req.query.s || ''))
    const options = 'i'
    const page = Number.parseInt(req.params.page as string, 10)
    const size = Number.parseInt(req.params.size as string, 10)

    const cars = await Car.aggregate(
      [
        {
          $lookup: {
            from: 'User',
            let: { userId: '$supplier' },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ['$_id', '$$userId'] },
                },
              },
            ],
            as: 'supplier',
          },
        },
        { $unwind: { path: '$supplier', preserveNullAndEmptyArrays: false } },
        {
          $match: {
            $and: [
              { listingStatus: bookcarsTypes.ListingStatus.Approved },
              { 'supplier._id': supplier },
              { locations: pickupLocation },
              { available: true }, { name: { $regex: keyword, $options: options } },
            ],
          },
        },
        { $sort: { name: 1, _id: 1 } },
        { $skip: (page - 1) * size },
        { $limit: size },
      ],
      { collation: { locale: env.DEFAULT_LANGUAGE, strength: 2 } },
    )

    for (const car of cars) {
      const { _id, fullName, avatar, priceChangeRate } = car.supplier
      car.supplier = { _id, fullName, avatar, priceChangeRate }
    }

    res.json(cars)
  } catch (err) {
    logger.error(`[car.getBookingCars] ${i18n.t('ERROR')} ${req.query.s}`, err)
    res.status(400).send(i18n.t('ERROR') + err)
  }
}

/**
 * Get Cars available for rental.
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const getFrontendCars = async (req: Request, res: Response) => {
  try {
    const { body }: { body: bookcarsTypes.GetCarsPayload } = req
    const page = Number.parseInt(req.params.page as string, 10)
    const size = Number.parseInt(req.params.size as string, 10)
    let suppliers = (body.suppliers?.length ? body.suppliers : []).map((id) => new mongoose.Types.ObjectId(id as string))
    if (suppliers.length === 0) {
      const activeSuppliers = await User.find({ type: bookcarsTypes.UserType.Supplier, active: true, blacklisted: false }).select('_id').lean()
      suppliers = activeSuppliers.map((supplier) => supplier._id)
    }
    const locationIds = await getPickupLocationIds(body)
    const pickupLabel = String((body as any).pickupLabel || (body as any).pickupLocationName || '')
    const resolvedPickupLocations = locationIds.length > 0
      ? await Location.find({ _id: { $in: locationIds } }).populate<{ values: Array<{ value: string }> }>('values').lean()
      : []
    const resolvedPickupText = resolvedPickupLocations.flatMap((location) => location.values.map((value) => value.value)).join(' ')
    const northernDestination = /\b(Hunza|Skardu|Swat|Naran|Gilgit|Murree|Northern|Naran Kaghan)\b/i.test(`${pickupLabel} ${resolvedPickupText}`)
    const {
      carType,
      gearbox,
      mileage,
      fuelPolicy,
      deposit,
      carSpecs,
      ranges,
      multimedia,
      rating,
      seats,
      from,
      to,
      includeAlreadyBookedCars,
      includeComingSoonCars,
    } = body

    if (!from) {
      throw new Error('from date is required')
    }

    if (!to) {
      throw new Error('to date is required')
    }

    const $match: mongoose.QueryFilter<bookcarsTypes.Car> = {
      $and: [
        { listingStatus: bookcarsTypes.ListingStatus.Approved },
        { supplier: { $in: suppliers } },
        ...(northernDestination ? [{ terrainCapability: bookcarsTypes.TerrainCapability.NorthernMountains }] : []),
        ...(locationIds.length ? [{ $or: [{ locations: { $in: locationIds } }, { deliveryLocations: { $in: locationIds } }] }] : []),
        ...(body.rentalMode === bookcarsTypes.RentalMode.SelfDrive ? [{ selfDriveAvailable: true }] : body.rentalMode === bookcarsTypes.RentalMode.WithDriver ? [{ withDriverAvailable: true }] : []),
        { available: true },
        { fullyBooked: { $in: [false, null] } },
      ],
    }

    if (Array.isArray(carType) && carType.length > 0) {
      $match.$and!.push({ type: { $in: carType } })
    }

    if (Array.isArray(gearbox) && gearbox.length > 0) {
      $match.$and!.push({ gearbox: { $in: gearbox } })
    }

    if (!includeAlreadyBookedCars) {
      $match.$and!.push({ $or: [{ fullyBooked: false }, { fullyBooked: null }] })
    }

    if (!includeComingSoonCars) {
      $match.$and!.push({ $or: [{ comingSoon: false }, { comingSoon: null }] })
    }

    if (fuelPolicy) {
      $match.$and!.push({ fuelPolicy: { $in: fuelPolicy } })
    }

    if (carSpecs) {
      if (carSpecs.aircon) {
        $match.$and!.push({ aircon: true })
      }
      if (carSpecs.moreThanFourDoors) {
        $match.$and!.push({ doors: { $gt: 4 } })
      }
      if (carSpecs.moreThanFiveSeats) {
        $match.$and!.push({ seats: { $gt: 5 } })
      }
    }

    if (mileage) {
      if (mileage.length === 1 && mileage[0] === bookcarsTypes.Mileage.Limited) {
        $match.$and!.push({ mileage: { $gt: -1 } })
      } else if (mileage.length === 1 && mileage[0] === bookcarsTypes.Mileage.Unlimited) {
        $match.$and!.push({ mileage: -1 })
      } else if (mileage.length === 0) {
        res.json([{ resultData: [], pageInfo: [] }])
        return
      }
    }

    if (deposit && deposit > -1) {
      $match.$and!.push({ deposit: { $lte: deposit } })
    }

    if (ranges) {
      $match.$and!.push({ range: { $in: ranges } })
    }

    if (multimedia && multimedia.length > 0) {
      for (const multimediaOption of multimedia) {
        $match.$and!.push({ multimedia: multimediaOption })
      }
    }

    if (rating && rating > -1) {
      $match.$and!.push({ rating: { $gte: rating } })
    }

    if (seats) {
      if (seats > -1) {
        if (seats === 6) {
          $match.$and!.push({ seats: { $gt: 5 } })
        } else {
          $match.$and!.push({ seats })
        }
      }
    }

    let $supplierMatch: mongoose.QueryFilter<any> = {}
    const days = helper.days(from, to)
    if (days) {
      $supplierMatch = { $or: [{ 'supplier.minimumRentalDays': { $lte: days } }, { 'supplier.minimumRentalDays': null }] }
    }

    // FYP sample suppliers are deliberately unverified because they are synthetic.
    // Show their clearly labelled listings only in explicit local demo mode; never
    // relax supplier verification in production or ordinary development runs.
    const supplierVerificationFilter = process.env.NODE_ENV === 'development' && process.env.BC_ENABLE_FYP_DEMO === 'true'
      ? {
        $or: [
          { verified: true },
          {
            verified: false,
            fullName: { $regex: 'FYP Demo Fleet$', $options: 'i' },
            bio: { $regex: 'Synthetic FYP demo supplier', $options: 'i' },
          },
        ],
      }
      : { verified: true }

    const data = await Car.aggregate(
      [
        { $match },
        {
          $lookup: {
            from: 'User',
            let: { userId: '$supplier' },
            pipeline: [
              {
                $match: {
                  // $expr: { $eq: ['$_id', '$$userId'] },
                  $and: [
                    { $expr: { $eq: ['$_id', '$$userId'] } },
                    { type: bookcarsTypes.UserType.Supplier },
                    { active: true },
                    supplierVerificationFilter,
                    { blacklisted: false },
                  ]
                },
              },
              {
                $project: {
                  _id: 1,
                  fullName: 1,
                  avatar: 1,
                  priceChangeRate: 1,
                  location: 1,
                },
              }
            ],
            as: 'supplier',
          },
        },
        { $unwind: { path: '$supplier', preserveNullAndEmptyArrays: false } },
        {
          $match: $supplierMatch,
        },
        {
          $lookup: {
            from: 'DateBasedPrice',
            let: { dateBasedPrices: { $ifNull: ['$dateBasedPrices', []] } },
            pipeline: [
              {
                $match: {
                  $expr: { $in: ['$_id', '$$dateBasedPrices'] },
                },
              },
            ],
            as: 'dateBasedPrices',
          },
        },
        // {
        //   $lookup: {
        //     from: 'Location',
        //     let: { locations: '$locations' },
        //     pipeline: [
        //       {
        //         $match: {
        //           $expr: { $in: ['$_id', '$$locations'] },
        //         },
        //       },
        //     ],
        //     as: 'locations',
        //   },
        // },

        // begining of booking overlap check -----------------------------------
        // if car.blockOnPay is true and (from, to) overlaps with paid, confirmed or deposit bookings of the car the car will
        // not be included in search results
        // ----------------------------------------------------------------------
        {
          $lookup: {
            from: 'Booking',
            let: { carId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$car', '$$carId'] },
                      {
                        // Match only bookings that overlap with the requested rental period
                        // (i.e., NOT completely before or after the requested time range)
                        $not: [
                          {
                            $or: [
                              // Booking ends before the requested rental period starts → no overlap
                              { $lte: ['$to', new Date(from)] },
                              // Booking starts after the requested rental period ends → no overlap
                              { $gte: ['$from', new Date(to)] }
                            ]
                          }
                        ]
                      },
                      {
                        $or: [
                          { $in: ['$status', BOOKING_RESERVATION_STATUSES] },
                          {
                            $and: [
                              { $eq: ['$status', bookcarsTypes.BookingStatus.Void] },
                              { $gt: ['$expireAt', new Date()] },
                            ],
                          },
                        ],
                      },
                    ]
                  }
                }
              }
            ],
            as: 'overlappingBookings'
          }
        },
        {
          $match: {
            $expr: {
              $or: [
                { $eq: [{ $ifNull: ['$blockOnPay', false] }, false] },
                { $eq: [{ $size: '$overlappingBookings' }, 0] }
              ]
            }
          }
        },
        // end of booking overlap check -----------------------------------

        // begining of supplierCarLimit -----------------------------------
        {
          // Add the "supplierCarLimit" field from the supplier to limit the number of cars per supplier
          $addFields: {
            maxAllowedCars: { $ifNull: ['$supplier.supplierCarLimit', Number.MAX_SAFE_INTEGER] }, // Use a fallback if supplierCarLimit is undefined
          },
        },
        {
          // Add a custom stage to limit cars per supplier
          $group: {
            _id: '$supplier._id', // Group by supplier
            supplierData: { $first: '$supplier' },
            cars: { $push: '$$ROOT' }, // Push all cars of the supplier into an array
            maxAllowedCars: { $first: '$maxAllowedCars' }, // Retain maxAllowedCars for each supplier
          },
        },
        {
          // Limit cars based on maxAllowedCars for each supplier
          $project: {
            supplier: '$supplierData',
            cars: {
              $cond: {
                if: { $eq: ['$maxAllowedCars', 0] }, // If maxAllowedCars is 0
                then: [], // Return an empty array (no cars)
                else: { $slice: ['$cars', 0, { $min: [{ $size: '$cars' }, '$maxAllowedCars'] }] }, // Otherwise, limit normally
              },
            },
          },
        },
        {
          // Flatten the grouped result and apply sorting
          $unwind: '$cars',
        },
        {
          // Ensure unique cars by grouping by car ID
          $group: {
            _id: '$cars._id',
            car: { $first: '$cars' },
          },
        },
        {
          $replaceRoot: { newRoot: '$car' }, // Replace the root document with the unique car object
        },
        {
          // Sort the cars before pagination
          $sort: { dailyPrice: 1, _id: 1 },
        },
        {
          $facet: {
            resultData: [
              { $skip: (page - 1) * size }, // Skip results based on page
              { $limit: size }, // Limit to the page size
            ],
            pageInfo: [
              {
                $count: 'totalRecords', // Count total number of cars (before pagination)
              },
            ],
          },
        },
        // end of supplierCarLimit -----------------------------------

        // old query without supplierCarLimit
        // {
        //   $facet: {
        //     resultData: [
        //       {
        //         // $sort: { fullyBooked: 1, comingSoon: 1, dailyPrice: 1, _id: 1 },
        //         $sort: { dailyPrice: 1, _id: 1 },
        //       },
        //       { $skip: (page - 1) * size },
        //       { $limit: size },
        //     ],
        //     pageInfo: [
        //       {
        //         $count: 'totalRecords',
        //       },
        //     ],
        //   },
        // },
      ],
      { collation: { locale: env.DEFAULT_LANGUAGE, strength: 2 } },
    )

    if (Array.isArray(data) && data[0]?.resultData) {
      data[0].resultData = data[0].resultData.map((car: any) => {
        if (locationIds.length && !car.locations?.some((id: mongoose.Types.ObjectId) => locationIds.some((requested) => requested.equals(id)))) {
          car.interCityDeliveryBadge = `Available via ${car.supplier.location || car.supplier.fullName} Hub with Inter-City${northernDestination ? ' / Northern' : ''} Delivery`
        }
        return car
      })
    }
    res.json(data)
  } catch (err) {
    logger.error(`[car.getFrontendCars] ${i18n.t('ERROR')} ${req.query.s}`, err)
    res.status(400).send(i18n.t('ERROR') + err)
  }
}

export const getNearbyAvailability = async (req: Request, res: Response) => {
  try {
    const body = req.body as { pickupLocation?: string, pickupLatitude?: number, pickupLongitude?: number }
    const locationIds = await getPickupLocationIds(body)
    const match: mongoose.QueryFilter<bookcarsTypes.Car> = {
      listingStatus: bookcarsTypes.ListingStatus.Approved,
      available: true,
      fullyBooked: { $in: [false, null] },
      ...(locationIds.length > 0 ? { locations: { $in: locationIds } } : {}),
    }
    const cars = await Car.find(match).select('_id name dailyPrice terrainCapability locations supplier').limit(50).lean()
    const deliveredCars = cars.length > 0 ? cars : await Car.find({ listingStatus: bookcarsTypes.ListingStatus.Approved, available: true, terrainCapability: bookcarsTypes.TerrainCapability.NorthernMountains }).select('_id name dailyPrice terrainCapability locations supplier').limit(50).lean()
    res.json({ cars: deliveredCars, available: deliveredCars.length > 0, interCityFallback: true })
  } catch (err) {
    logger.error('[car.getNearbyAvailability]', err)
    res.status(400).json({ message: 'Unable to check nearby availability.' })
  }
}

/** Platform-admin review gate for supplier vehicle listings. */
export const reviewListing = async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
  const { listingStatus, complianceNotes } = req.body || {}
  if (!helper.isValidObjectId(id)) {
    res.status(400).json({ message: 'Invalid vehicle ID.' })
    return
  }
  if (!Object.values(bookcarsTypes.ListingStatus).includes(listingStatus)) {
    res.status(400).json({ message: 'A valid listingStatus is required.' })
    return
  }
  if (complianceNotes !== undefined && (typeof complianceNotes !== 'string' || complianceNotes.length > 1000)) {
    res.status(400).json({ message: 'Compliance notes must be text with at most 1000 characters.' })
    return
  }
  try {
    const car = await Car.findById(id)
    if (!car) {
      res.status(404).json({ message: 'Vehicle not found.' })
      return
    }
    car.listingStatus = listingStatus
    car.complianceNotes = typeof complianceNotes === 'string' ? complianceNotes.trim() : undefined
    car.reviewedBy = new mongoose.Types.ObjectId(req.user!._id)
    car.reviewedAt = new Date()
    await car.save()
    res.json({ _id: car._id, listingStatus: car.listingStatus, complianceNotes: car.complianceNotes, reviewedBy: car.reviewedBy, reviewedAt: car.reviewedAt })
  } catch (err) {
    logger.error(`[car.reviewListing] Failed to review vehicle ${id}`, err)
    res.status(500).json({ message: 'Unable to update vehicle review status.' })
  }
}
