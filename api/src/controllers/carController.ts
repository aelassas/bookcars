import asyncFs from 'node:fs/promises'
import path from 'node:path'
import { nanoid } from 'nanoid'
import escapeStringRegexp from 'escape-string-regexp'
import mongoose from 'mongoose'
import { Request, Response } from 'express'
import nodemailer from 'nodemailer'
import * as bookcarsTypes from ':bookcars-types'
import Booking from '../models/Booking'
import Car from '../models/Car'
import i18n from '../lang/i18n'
import * as env from '../config/env.config'
import * as helper from '../common/helper'
import * as logger from '../common/logger'
import DateBasedPrice from '../models/DateBasedPrice'
import User from '../models/User'
import Notification from '../models/Notification'
import NotificationCounter from '../models/NotificationCounter'
import * as mailHelper from '../common/mailHelper'

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
    const { dateBasedPrices, locationCoordinates, ...carFields } = body
    const dateBasedPriceIds: string[] = []
    if (body.isDateBasedPrice) {
      for (const dateBasePrice of dateBasedPrices) {
        const dbp = new DateBasedPrice(dateBasePrice)
        await dbp.save()
        dateBasedPriceIds.push(dbp.id)
      }
    }

    // Check if locations is empty but we have locationCoordinates
    const finalCarFields = { ...carFields };
    if ((!finalCarFields.locations || finalCarFields.locations.length === 0) && 
        locationCoordinates && locationCoordinates.length > 0) {
      // Create a placeholder location ID to satisfy the schema
      finalCarFields.locations = ['000000000000000000000000'].map(id => new mongoose.Types.ObjectId(id)); // MongoDB ObjectId placeholder
    }

    // Create car object with all the basic fields
    const car = new Car({ ...finalCarFields, dateBasedPrices: dateBasedPriceIds })
    
    // Add location coordinates if they exist
    if (locationCoordinates && locationCoordinates.length > 0) {
      // Store the coordinates in the car document for future use
      car.locationCoordinates = locationCoordinates;
    }
    
    await car.save()

    const image = path.join(env.CDN_TEMP_CARS, body.image)

    if (await helper.pathExists(image)) {
      const filename = `${car._id}_${Date.now()}${path.extname(body.image)}`
      const newPath = path.join(env.CDN_CARS, filename)

      await asyncFs.rename(image, newPath)
      car.image = filename
      await car.save()
    } else {
      await Car.deleteOne({ _id: car._id })
      throw new Error(`Image ${body.image} not found`)
    }

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
              car: car.id,
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
              const mailOptions: nodemailer.SendMailOptions = {
                from: env.SMTP_FROM,
                to: admin.email,
                subject: message,
                html: `<p>
${i18n.t('HELLO')}${admin.fullName},<br><br>
${message}<br><br>
${helper.joinURL(env.BACKEND_HOST, `update-car?cr=${car.id}`)}<br><br>
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
    logger.error(`[car.create] ${i18n.t('DB_ERROR')} ${JSON.stringify(body)}`, err)
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
  return dbp.id
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
      const {
        supplier,
        name,
        minimumAge,
        available,
        fullyBooked,
        comingSoon,
        type,
        locations,
        locationCoordinates,
        dailyPrice,
        discountedDailyPrice,
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
      } = body

      console.log('Updating car:', _id);
      console.log('LocationCoordinates received:', locationCoordinates);

      car.supplier = new mongoose.Types.ObjectId(supplier)
      car.minimumAge = minimumAge
      
      // Check if locations is empty but we have locationCoordinates
      if ((!locations || locations.length === 0) && 
          locationCoordinates && locationCoordinates.length > 0) {
        // Create a placeholder location ID to satisfy the schema
        car.locations = ['000000000000000000000000'].map(id => new mongoose.Types.ObjectId(id));
      } else {
        car.locations = locations.map((l) => new mongoose.Types.ObjectId(l))
      }
      
      // Update location coordinates if present
      if (locationCoordinates && locationCoordinates.length > 0) {
        car.locationCoordinates = locationCoordinates;
        // Explicitly set field to ensure it's included in the update
        car.set('locationCoordinates', locationCoordinates);
        console.log('Setting car.locationCoordinates to:', locationCoordinates);
      } else {
        console.log('No locationCoordinates provided');
      }
      
      car.name = name
      car.available = available
      car.fullyBooked = fullyBooked
      car.comingSoon = comingSoon
      car.type = type as bookcarsTypes.CarType
      car.dailyPrice = dailyPrice
      car.discountedDailyPrice = discountedDailyPrice
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

      try {
        console.log('Car before save:', car);
        console.log('Car locationCoordinates before save:', car.locationCoordinates);
        
        // Force update with $set to ensure locationCoordinates is included
        const updateResult = await Car.updateOne(
          { _id: car._id },
          { 
            $set: {
              supplier: car.supplier,
              minimumAge: car.minimumAge,
              locations: car.locations,
              locationCoordinates: locationCoordinates || [],
              name: car.name,
              available: car.available,
              fullyBooked: car.fullyBooked,
              comingSoon: car.comingSoon,
              type: car.type,
              dailyPrice: car.dailyPrice,
              discountedDailyPrice: car.discountedDailyPrice,
              biWeeklyPrice: car.biWeeklyPrice,
              discountedBiWeeklyPrice: car.discountedBiWeeklyPrice,
              weeklyPrice: car.weeklyPrice,
              discountedWeeklyPrice: car.discountedWeeklyPrice,
              monthlyPrice: car.monthlyPrice,
              discountedMonthlyPrice: car.discountedMonthlyPrice,
              deposit: car.deposit,
              seats: car.seats,
              doors: car.doors,
              aircon: car.aircon,
              gearbox: car.gearbox,
              fuelPolicy: car.fuelPolicy,
              mileage: car.mileage,
              cancellation: car.cancellation,
              amendments: car.amendments,
              theftProtection: car.theftProtection,
              collisionDamageWaiver: car.collisionDamageWaiver,
              fullInsurance: car.fullInsurance,
              additionalDriver: car.additionalDriver,
              range: car.range,
              multimedia: car.multimedia,
              rating: car.rating,
              co2: car.co2,
              isDateBasedPrice: car.isDateBasedPrice,
              dateBasedPrices: car.dateBasedPrices
            }
          }
        );
        
        console.log('Update result:', updateResult);
        
        // Load the updated car
        const updatedCar = await Car.findById(car._id);
        console.log('Updated car:', updatedCar);
        console.log('Location coordinates after update:', updatedCar?.locationCoordinates);
        
        res.json(updatedCar);
      } catch (saveErr) {
        console.error('Error saving car:', saveErr);
        throw saveErr;
      }
      
      return;
    }

    logger.error('[car.update] Car not found:', _id)
    res.sendStatus(204)
  } catch (err) {
    logger.error(`[car.update] ${i18n.t('DB_ERROR')} ${_id}`, err)
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
  const { id } = req.params

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
    logger.error(`[car.check] ${i18n.t('DB_ERROR')} ${id}`, err)
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
    logger.error(`[car.delete] ${i18n.t('DB_ERROR')} ${id}`, err)
    res.status(400).send(i18n.t('DB_ERROR') + err)
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

    await asyncFs.writeFile(filepath, req.file.buffer)
    res.json(filename)
  } catch (err) {
    logger.error(`[car.createImage] ${i18n.t('DB_ERROR')}`, err)
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

      await asyncFs.writeFile(filepath, file.buffer)
      car.image = filename
      await car.save()
      res.json(filename)
      return
    }

    logger.error('[car.updateImage] Car not found:', id)
    res.sendStatus(204)
  } catch (err) {
    logger.error(`[car.updateImage] ${i18n.t('DB_ERROR')} ${id}`, err)
    res.status(400).send(i18n.t('DB_ERROR') + err)
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
    logger.error(`[car.deleteImage] ${i18n.t('DB_ERROR')} ${id}`, err)
    res.status(400).send(i18n.t('DB_ERROR') + err)
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
    const imageFile = path.join(env.CDN_TEMP_CARS, image)
    if (!(await helper.pathExists(imageFile))) {
      throw new Error(`[car.deleteTempImage] temp image ${imageFile} not found`)
    }

    await asyncFs.unlink(imageFile)

    res.sendStatus(200)
  } catch (err) {
    logger.error(`[car.deleteTempImage] ${i18n.t('DB_ERROR')} ${image}`, err)
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
    logger.error(`[car.getCar] ${i18n.t('DB_ERROR')} ${id}`, err)
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
    const page = Number.parseInt(req.params.page, 10)
    const size = Number.parseInt(req.params.size, 10)
    const suppliers = body.suppliers!.map((id) => new mongoose.Types.ObjectId(id))
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

    const $match: mongoose.FilterQuery<bookcarsTypes.Car> = {
      $and: [
        { name: { $regex: keyword, $options: options } },
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
    logger.error(`[car.getCars] ${i18n.t('DB_ERROR')} ${req.query.s}`, err)
    res.status(400).send(i18n.t('DB_ERROR') + err)
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
    const supplier = new mongoose.Types.ObjectId(body.supplier)
    const pickupLocation = new mongoose.Types.ObjectId(body.pickupLocation)
    const keyword = escapeStringRegexp(String(req.query.s || ''))
    const options = 'i'
    const page = Number.parseInt(req.params.page, 10)
    const size = Number.parseInt(req.params.size, 10)

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
    logger.error(`[car.getBookingCars] ${i18n.t('DB_ERROR')} ${req.query.s}`, err)
    res.status(400).send(i18n.t('DB_ERROR') + err)
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
    const page = Number.parseInt(req.params.page, 10)
    const size = Number.parseInt(req.params.size, 10)
    const suppliers = body.suppliers!.map((id) => new mongoose.Types.ObjectId(id))
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
      days,
      includeAlreadyBookedCars,
      includeComingSoonCars,
      coordinates,
      radius,
    } = body

    const $match: mongoose.FilterQuery<bookcarsTypes.Car> = {
      $and: [
        { supplier: { $in: suppliers } },
        { type: { $in: carType } },
        { gearbox: { $in: gearbox } },
        { available: true },
      ],
    }

    // Add pickup location filter if provided
    if (body.pickupLocation) {
      const pickupLocation = new mongoose.Types.ObjectId(body.pickupLocation)
      $match.$and!.push({ locations: pickupLocation })
    }

    // Add coordinate-based search if coordinates and radius are provided
    if (coordinates && radius) {
      // If using coordinates, we need to check cars with locationCoordinates
      $match.$and!.push({
        locationCoordinates: {
          $exists: true,
          $ne: []
        }
      })
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

    let $supplierMatch: mongoose.FilterQuery<any> = {}
    if (days) {
      $supplierMatch = { $or: [{ 'supplier.minimumRentalDays': { $lte: days } }, { 'supplier.minimumRentalDays': null }] }
    }

    let data;
    
    if (coordinates && radius) {
      // Perform coordinate-based search with distance calculation
      data = await Car.aggregate([
        { $match },
        // Unwind locationCoordinates to calculate distance for each location
        { $unwind: '$locationCoordinates' },
        // Add distance field to each car
        {
          $addFields: {
            distance: {
              $function: {
                body: function(lat1, lon1, lat2, lon2) {
                  // Call the helper.calculateDistance function
                  return helper.calculateDistance(lat1, lon1, lat2, lon2, 'K');
                },
                args: [
                  '$locationCoordinates.latitude',
                  '$locationCoordinates.longitude',
                  coordinates.latitude,
                  coordinates.longitude
                ],
                lang: 'js'
              }
            }
          }
        },
        // Filter based on radius
        { $match: { distance: { $lte: radius } } },
        // Now group back by car ID to eliminate duplicates
        {
          $group: {
            _id: '$_id',
            // Keep only the minimum distance if a car has multiple locations
            minDistance: { $min: '$distance' },
            // Preserve all other fields
            doc: { $first: '$$ROOT' }
          }
        },
        // Reconstruct the document
        {
          $replaceRoot: {
            newRoot: {
              $mergeObjects: ['$doc', { distance: '$minDistance' }]
            }
          }
        },
        // Sort by distance
        { $sort: { distance: 1 } },
        // Lookup supplier data
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
        {
          $unwind: {
            path: '$supplier',
            preserveNullAndEmptyArrays: false,
          },
        },
        // Match based on supplier minimum rental days if days are specified
        {
          $match: days 
            ? { $or: [{ 'supplier.minimumRentalDays': { $lte: days } }, { 'supplier.minimumRentalDays': null }] }
            : {},
        },
        // Lookup date-based prices
        {
          $lookup: {
            from: 'DateBasedPrice',
            let: { dateBasedPrices: '$dateBasedPrices' },
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
        // Beginning of supplierCarLimit logic
        {
          // Add the "supplierCarLimit" field from the supplier to limit the number of cars per supplier
          $addFields: {
            maxAllowedCars: { $ifNull: ['$supplier.supplierCarLimit', Number.MAX_SAFE_INTEGER] }, // Use fallback if undefined
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
        // End of supplierCarLimit logic
      ])
    } else {
      // Use the existing aggregation pipeline for traditional location-based search
      data = await Car.aggregate(
      [
        { $match },
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
          {
            $unwind: {
              path: '$supplier',
              preserveNullAndEmptyArrays: false,
            },
          },
          // Match based on supplier minimum rental days if days are specified
        {
            $match: days 
              ? { $or: [{ 'supplier.minimumRentalDays': { $lte: days } }, { 'supplier.minimumRentalDays': null }] }
              : {},
        },
          // Lookup date-based prices
        {
          $lookup: {
            from: 'DateBasedPrice',
            let: { dateBasedPrices: '$dateBasedPrices' },
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
          // Beginning of supplierCarLimit logic
        {
          // Add the "supplierCarLimit" field from the supplier to limit the number of cars per supplier
          $addFields: {
              maxAllowedCars: { $ifNull: ['$supplier.supplierCarLimit', Number.MAX_SAFE_INTEGER] }, // Use fallback if undefined
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
          // End of supplierCarLimit logic
      ],
      { collation: { locale: env.DEFAULT_LANGUAGE, strength: 2 } },
    )

      // Format the supplier data in the result
      for (const car of data[0]?.resultData || []) {
      const { _id, fullName, avatar, priceChangeRate } = car.supplier
      car.supplier = { _id, fullName, avatar, priceChangeRate }
      }
    }

    res.json(data)
  } catch (err) {
    logger.error(`[car.getFrontendCars] ${i18n.t('DB_ERROR')}`, err)
    res.status(400).send(i18n.t('DB_ERROR') + err)
  }
}

/**
 * Search cars by coordinates with radius.
 * This is a dedicated endpoint for coordinate-based searches.
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const searchCarsByCoordinates = async (req: Request, res: Response) => {
  try {
    const { body } = req
    const page = Number.parseInt(req.params.page, 10)
    const size = Number.parseInt(req.params.size, 10)
    
    const { 
      coordinates,
      radius = 25, // Default radius is 25 km
      suppliers,
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
      days,
      includeAlreadyBookedCars,
      includeComingSoonCars
    } = body

    // Validate coordinates
    if (!coordinates || !coordinates.latitude || !coordinates.longitude) {
      return res.status(400).send(i18n.t('COORDINATES_REQUIRED'))
    }

    // Build match query
    const $match: mongoose.FilterQuery<bookcarsTypes.Car> = {
      $and: [
        { available: true },
        { 
          locationCoordinates: {
            $exists: true,
            $ne: []
          }
        }
      ],
    }

    // Add supplier filter if provided
    if (suppliers && suppliers.length > 0) {
      const supplierIds = suppliers.map((id: string) => new mongoose.Types.ObjectId(id))
      $match.$and!.push({ supplier: { $in: supplierIds } })
    }

    // Add car type filter if provided
    if (carType && carType.length > 0) {
      $match.$and!.push({ type: { $in: carType } })
    }

    // Add gearbox filter if provided
    if (gearbox && gearbox.length > 0) {
      $match.$and!.push({ gearbox: { $in: gearbox } })
    }

    // Add booking status filters
    if (!includeAlreadyBookedCars) {
      $match.$and!.push({ $or: [{ fullyBooked: false }, { fullyBooked: null }] })
    }

    if (!includeComingSoonCars) {
      $match.$and!.push({ $or: [{ comingSoon: false }, { comingSoon: null }] })
    }

    // Add fuel policy filter if provided
    if (fuelPolicy && fuelPolicy.length > 0) {
      $match.$and!.push({ fuelPolicy: { $in: fuelPolicy } })
    }

    // Add car specs filters if provided
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

    // Add mileage filter if provided
    if (mileage && mileage.length > 0) {
      if (mileage.length === 1 && mileage[0] === bookcarsTypes.Mileage.Limited) {
        $match.$and!.push({ mileage: { $gt: -1 } })
      } else if (mileage.length === 1 && mileage[0] === bookcarsTypes.Mileage.Unlimited) {
        $match.$and!.push({ mileage: -1 })
      }
    }

    // Add deposit filter if provided
    if (deposit && deposit > -1) {
      $match.$and!.push({ deposit: { $lte: deposit } })
    }

    // Add ranges filter if provided
    if (ranges && ranges.length > 0) {
      $match.$and!.push({ range: { $in: ranges } })
    }

    // Add multimedia filter if provided
    if (multimedia && multimedia.length > 0) {
      for (const multimediaOption of multimedia) {
        $match.$and!.push({ multimedia: multimediaOption })
      }
    }

    // Add rating filter if provided
    if (rating && rating > -1) {
      $match.$and!.push({ rating: { $gte: rating } })
    }

    // Add seats filter if provided
    if (seats) {
      if (seats > -1) {
        if (seats === 6) {
          $match.$and!.push({ seats: { $gt: 5 } })
        } else {
          $match.$and!.push({ seats })
        }
      }
    }

    let $supplierMatch: mongoose.FilterQuery<any> = {}
    if (days) {
      $supplierMatch = { $or: [{ 'supplier.minimumRentalDays': { $lte: days } }, { 'supplier.minimumRentalDays': null }] }
    }

    // Perform coordinate-based search with distance calculation
    const data = await Car.aggregate([
      { $match },
      // Unwind locationCoordinates to calculate distance for each location
      { $unwind: '$locationCoordinates' },
      // Add distance field to each car
      {
        $addFields: {
          distance: {
            $function: {
              body: function(lat1, lon1, lat2, lon2) {
                // Use the helper function for distance calculation
                return helper.calculateDistance(lat1, lon1, lat2, lon2, 'K');
              },
              args: [
                '$locationCoordinates.latitude',
                '$locationCoordinates.longitude',
                coordinates.latitude,
                coordinates.longitude
              ],
              lang: 'js'
            }
          }
        }
      },
      // Filter based on radius
      { $match: { distance: { $lte: radius } } },
      // Now group back by car ID to eliminate duplicates
      {
        $group: {
          _id: '$_id',
          // Keep only the minimum distance if a car has multiple locations
          minDistance: { $min: '$distance' },
          // Preserve all other fields
          doc: { $first: '$$ROOT' }
        }
      },
      // Reconstruct the document
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: ['$doc', { distance: '$minDistance' }]
          }
        }
      },
      // Sort by distance
      { $sort: { distance: 1 } },
      // Lookup supplier data
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
      {
        $unwind: {
          path: '$supplier',
          preserveNullAndEmptyArrays: false,
        },
      },
      // Match based on supplier minimum rental days if days are specified
      {
        $match: $supplierMatch,
      },
      // Lookup date-based prices
      {
        $lookup: {
          from: 'DateBasedPrice',
          let: { dateBasedPrices: '$dateBasedPrices' },
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
      // Beginning of supplierCarLimit logic
      {
        // Add the "supplierCarLimit" field from the supplier to limit the number of cars per supplier
        $addFields: {
          maxAllowedCars: { $ifNull: ['$supplier.supplierCarLimit', Number.MAX_SAFE_INTEGER] }, // Use fallback if undefined
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
        // Sort the cars by distance first, then by price
        $sort: { distance: 1, dailyPrice: 1, _id: 1 },
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
    ]);

    // Format the supplier data in the result
    for (const car of data[0]?.resultData || []) {
      const { _id, fullName, avatar, priceChangeRate } = car.supplier
      car.supplier = { _id, fullName, avatar, priceChangeRate }
      
      // Format the distance for display
      if (car.distance !== undefined) {
        car.formattedDistance = helper.formatDistance(car.distance, 'K')
      }
    }

    res.json(data)
  } catch (err) {
    logger.error(`[car.searchCarsByCoordinates] ${i18n.t('DB_ERROR')}`, err)
    res.status(400).send(i18n.t('DB_ERROR') + err)
  }
}
