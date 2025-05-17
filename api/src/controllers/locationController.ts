import asyncFs from 'node:fs/promises'
import path from 'node:path'
import { nanoid } from 'nanoid'
import escapeStringRegexp from 'escape-string-regexp'
import mongoose from 'mongoose'
import { Request, Response } from 'express'
import * as bookcarsTypes from ':bookcars-types'
import * as helper from '../common/helper'
import * as env from '../config/env.config'
import i18n from '../lang/i18n'
import Location from '../models/Location'
import LocationValue from '../models/LocationValue'
import Car from '../models/Car'
import ParkingSpot from '../models/ParkingSpot'
import * as logger from '../common/logger'

/**
 * Validate a Location name with language code.
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const validate = async (req: Request, res: Response) => {
  const { body }: { body: bookcarsTypes.ValidateLocationPayload } = req
  const { language, name } = body

  try {
    if (language.length !== 2) {
      throw new Error('Language not valid')
    }
    const keyword = escapeStringRegexp(name)
    const options = 'i'

    const locations = await Location.aggregate(
      [
        {
          $lookup: {
            from: 'LocationValue',
            let: { values: '$values' },
            pipeline: [
              {
                $match: {
                  $and: [
                    { $expr: { $in: ['$_id', '$$values'] } },
                    { $expr: { $eq: ['$language', language] } },
                    { $expr: { $regexMatch: { input: '$value', regex: new RegExp(`^${keyword}$`), options } } },
                  ],
                },
              },
            ],
            as: 'value',
          },
        },
        { $unwind: { path: '$value', preserveNullAndEmptyArrays: false } },
      ],
      { collation: { locale: env.DEFAULT_LANGUAGE, strength: 2 } },
    )

    if (locations.length > 0) {
      res.sendStatus(204)
    } else {
      res.sendStatus(200)
    }
  } catch (err) {
    logger.error(`[location.validate]  ${i18n.t('DB_ERROR')} ${name}`, err)
    res.status(400).send(i18n.t('DB_ERROR') + err)
  }
}

const createParkingSpot = async (parkingSpot: bookcarsTypes.ParkingSpot): Promise<string> => {
  const parkinSpotValues = []
  if (parkingSpot.values) {
    for (const name of parkingSpot.values) {
      const parkinSpotValue = new LocationValue({
        language: name.language,
        value: name.value,
      })
      await parkinSpotValue.save()
      parkinSpotValues.push(parkinSpotValue._id)
    }
  }

  const ps = new ParkingSpot({
    longitude: parkingSpot.longitude,
    latitude: parkingSpot.latitude,
    values: parkinSpotValues,
  })
  await ps.save()
  return ps.id
}

/**
 * Create a Location.
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const create = async (req: Request, res: Response) => {
  const { body }: { body: bookcarsTypes.UpsertLocationPayload } = req
  const {
    country,
    longitude,
    latitude,
    names,
    image,
    parkingSpots: _parkingSpots,
    supplier,
  } = body

  try {
    if (image) {
      const _image = path.join(env.CDN_TEMP_LOCATIONS, image)

      if (!(await helper.pathExists(_image))) {
        throw new Error(`Location image not found: ${_image}`)
      }
    }

    const parkingSpots: string[] = []
    if (_parkingSpots) {
      for (const parkingSpot of _parkingSpots) {
        const psId = await createParkingSpot(parkingSpot)
        parkingSpots.push(psId)
      }
    }

    const values: string[] = []
    for (const name of names) {
      const locationValue = new LocationValue({
        language: name.language,
        value: name.name,
      })
      await locationValue.save()
      values.push(locationValue.id)
    }

    const location = new Location({
      country,
      longitude,
      latitude,
      values,
      parkingSpots,
      supplier,
    })
    await location.save()

    if (image) {
      const _image = path.join(env.CDN_TEMP_LOCATIONS, image)

      const filename = `${location._id}_${Date.now()}${path.extname(image)}`
      const newPath = path.join(env.CDN_LOCATIONS, filename)

      await asyncFs.rename(_image, newPath)
      location.image = filename
      await location.save()
    }

    res.send(location)
  } catch (err) {
    logger.error(`[location.create] ${i18n.t('DB_ERROR')} ${JSON.stringify(req.body)}`, err)
    res.status(400).send(i18n.t('DB_ERROR') + err)
  }
}

/**
 * Update a Location.
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const update = async (req: Request, res: Response) => {
  const { id } = req.params

  try {
    const location = await Location
      .findById(id)
      .populate<{ values: env.LocationValue[] }>('values')

    if (location) {
      const { country, longitude, latitude, names, parkingSpots }: bookcarsTypes.UpsertLocationPayload = req.body

      location.country = new mongoose.Types.ObjectId(country)
      location.longitude = longitude
      location.latitude = latitude

      for (const name of names) {
        const locationValue = location.values.filter((value) => value.language === name.language)[0]
        if (locationValue) {
          locationValue.value = name.name
          await locationValue.save()
        } else {
          const lv = new LocationValue({
            language: name.language,
            value: name.name,
          })
          await lv.save()
          location.values.push(lv)
        }
      }

      //
      // Parking spots
      //
      if (!parkingSpots) {
        const parkingSpotsToDelete = await ParkingSpot.find({ _id: { $in: location.parkingSpots?.map((ps) => ps.id) } })
        for (const ps of parkingSpotsToDelete) {
          await LocationValue.deleteMany({ _id: { $in: ps.values } })
          await ps.deleteOne()
        }
        location.parkingSpots = []
      } else {
        if (!location.parkingSpots) {
          location.parkingSpots = []
        }

        // Remove all parking spots not in body.parkingSpots
        const parkingSpotIds = parkingSpots.filter((ps) => !!ps._id).map((ps) => ps._id)
        const parkingSpotIdsToDelete = location.parkingSpots.filter((_id) => !parkingSpotIds.includes(_id.toString()))
        if (parkingSpotIdsToDelete.length > 0) {
          for (const psId of parkingSpotIdsToDelete) {
            location.parkingSpots.splice(location.parkingSpots.indexOf(psId), 1)
          }

          const parkingSpotsToDelete = await ParkingSpot.find({ _id: { $in: parkingSpotIdsToDelete } })
          for (const ps of parkingSpotsToDelete) {
            await LocationValue.deleteMany({ _id: { $in: ps.values } })
            await ps.deleteOne()
          }
        }

        // Add all new parking spots
        for (const parkingSpot of parkingSpots.filter((ps) => ps._id === undefined)) {
          const psId = await createParkingSpot(parkingSpot)
          location.parkingSpots.push(new mongoose.Types.ObjectId(psId))
        }

        // Update existing parking spots
        for (const parkingSpot of parkingSpots.filter((ps) => !!ps._id)) {
          const ps = await ParkingSpot.findById(parkingSpot._id)
          if (ps) {
            ps.longitude = Number(parkingSpot.longitude)
            ps.latitude = Number(parkingSpot.latitude)

            if (parkingSpot.values) {
              // Add new values
              for (const value of parkingSpot.values.filter((val) => val._id === undefined)) {
                const v = new LocationValue({
                  language: value.language,
                  value: value.value,
                })
                await v.save()
                ps.values.push(new mongoose.Types.ObjectId(v.id as string))
              }

              // Update existing values
              for (const value of parkingSpot.values.filter((val) => !!val._id)) {
                const v = await LocationValue.findById(value._id)
                if (v) {
                  v.value = value.value!
                  await v.save()
                }
              }
            }

            await ps.save()
          }
        }
      }

      await location.save()

      res.json(location)
      return
    }

    logger.error('[location.update] Location not found:', id)
    res.sendStatus(204)
  } catch (err) {
    logger.error(`[location.update] ${i18n.t('DB_ERROR')} ${JSON.stringify(req.body)}`, err)
    res.status(400).send(i18n.t('DB_ERROR') + err)
  }
}

/**
 * Delete a Location.
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const deleteLocation = async (req: Request, res: Response) => {
  const { id } = req.params

  try {
    const location = await Location.findById(id).populate<{ parkingSpots: env.ParkingSpot[] }>('parkingSpots')
    if (!location) {
      const msg = `[location.delete] Location ${id} not found`
      logger.info(msg)
      res.status(204).send(msg)
      return
    }
    await LocationValue.deleteMany({ _id: { $in: location.values } })
    await Location.deleteOne({ _id: id })

    if (location.parkingSpots && location.parkingSpots.length > 0) {
      const values = location.parkingSpots.map((ps) => ps.values).flat()
      await LocationValue.deleteMany({ _id: { $in: values } })
      const parkingSpots = location.parkingSpots.map((ps) => ps._id)
      await ParkingSpot.deleteMany({ _id: { $in: parkingSpots } })
    }

    if (location.image) {
      const image = path.join(env.CDN_LOCATIONS, location.image)
      if (await helper.pathExists(image)) {
        await asyncFs.unlink(image)
      }
    }

    res.sendStatus(200)
  } catch (err) {
    logger.error(`[location.delete] ${i18n.t('DB_ERROR')} ${id}`, err)
    res.status(400).send(i18n.t('DB_ERROR') + err)
  }
}

/**
 * Get a Location by ID.
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const getLocation = async (req: Request, res: Response) => {
  const { id } = req.params

  try {
    const location = await Location
      .findById(id)
      .populate<{ country: env.CountryInfo }>({
        path: 'country',
        populate: {
          path: 'values',
          model: 'LocationValue',
        },
      })
      .populate<{ values: env.LocationValue[] }>('values')
      .populate<{ parkingSpots: env.ParkingSpot[] }>({
        path: 'parkingSpots',
        populate: {
          path: 'values',
          model: 'LocationValue',
        },
      })
      .populate<{ supplier: env.UserInfo }>('supplier')
      .lean()

    if (location) {
      if (location.country) {
        const countryName = ((location.country as env.CountryInfo).values as env.LocationValue[]).filter((value) => value.language === req.params.language)[0].value
        location.country.name = countryName
      }
      if (location.parkingSpots && location.parkingSpots.length > 0) {
        for (const parkingSpot of location.parkingSpots) {
          parkingSpot.name = (parkingSpot.values as env.LocationValue[]).filter((value) => value.language === req.params.language)[0].value
        }
      }
      const name = (location.values as env.LocationValue[]).filter((value) => value.language === req.params.language)[0].value
      if (location.supplier) {
        const { _id, fullName, avatar } = location.supplier
        location.supplier = { _id, fullName, avatar }
      }
      const l = { ...location, name }
      res.json(l)
      return
    }
    logger.error('[location.getLocation] Location not found:', id)
    res.sendStatus(204)
  } catch (err) {
    logger.error(`[location.getLocation] ${i18n.t('DB_ERROR')} ${id}`, err)
    res.status(400).send(i18n.t('DB_ERROR') + err)
  }
}

/**
 * Get Locations.
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const getLocations = async (req: Request, res: Response) => {
  try {
    const page = Number.parseInt(req.params.page, 10)
    const size = Number.parseInt(req.params.size, 10)
    const { language } = req.params
    const keyword = escapeStringRegexp(String(req.query.s || ''))
    const options = 'i'

    const locations = await Location.aggregate(
      [
        {
          $lookup: {
            from: 'LocationValue',
            let: { values: '$values' },
            pipeline: [
              {
                $match: {
                  $and: [
                    { $expr: { $in: ['$_id', '$$values'] } },
                    { $expr: { $eq: ['$language', language] } },
                    { $expr: { $regexMatch: { input: '$value', regex: keyword, options } } },
                  ],
                },
              },
            ],
            as: 'value',
          },
        },
        { $unwind: { path: '$value', preserveNullAndEmptyArrays: false } },
        { $addFields: { name: '$value.value' } },

        {
          $lookup: {
            from: 'Country',
            let: { country: '$country' },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ['$_id', '$$country'] },
                },
              },
              {
                $lookup: {
                  from: 'LocationValue',
                  let: { values: '$values' },
                  pipeline: [
                    {
                      $match: {
                        $and: [
                          { $expr: { $in: ['$_id', '$$values'] } },
                          { $expr: { $eq: ['$language', language] } },
                        ],
                      },
                    },
                  ],
                  as: 'value',
                },
              },
              { $unwind: { path: '$value', preserveNullAndEmptyArrays: false } },
              { $addFields: { name: '$value.value' } },
            ],
            as: 'country',
          },
        },
        { $unwind: { path: '$country', preserveNullAndEmptyArrays: true } },

        {
          $lookup: {
            from: 'User',
            let: { supplier: '$supplier' },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ['$_id', '$$supplier'] },
                },
              },
              {
                $project: {
                  _id: 1,
                  fullName: 1,
                  avatar: 1,
                },
              }
            ],
            as: 'supplier',
          },
        },
        { $unwind: { path: '$supplier', preserveNullAndEmptyArrays: true } },

        {
          $project: {
            parkingSpots: 0,
          },
        },
        {
          $facet: {
            resultData: [{ $sort: { name: 1, _id: 1 } }, { $skip: (page - 1) * size }, { $limit: size }],
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

    res.json(locations)
  } catch (err) {
    logger.error(`[location.getLocations] ${i18n.t('DB_ERROR')} ${req.query.s}`, err)
    res.status(400).send(i18n.t('DB_ERROR') + err)
  }
}

/**
 * Get Locations with position.
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const getLocationsWithPosition = async (req: Request, res: Response) => {
  try {
    const { language } = req.params
    if (language.length !== 2) {
      throw new Error('Language not valid')
    }
    const keyword = escapeStringRegexp(String(req.query.s || ''))
    const options = 'i'

    const locations = await Location.aggregate(
      [
        {
          $match: {
            latitude: { $ne: null },
            longitude: { $ne: null },
          },
        },

        {
          $lookup: {
            from: 'LocationValue',
            let: { values: '$values' },
            pipeline: [
              {
                $match: {
                  $and: [
                    { $expr: { $in: ['$_id', '$$values'] } },
                    { $expr: { $eq: ['$language', language] } },
                    { $expr: { $regexMatch: { input: '$value', regex: keyword, options } } },
                  ],
                },
              },
            ],
            as: 'value',
          },
        },
        { $unwind: { path: '$value', preserveNullAndEmptyArrays: false } },
        { $addFields: { name: '$value.value' } },

        {
          $project: {
            parkingSpots: 0,
          },
        },
      ],
      { collation: { locale: env.DEFAULT_LANGUAGE, strength: 2 } },
    )

    res.json(locations)
  } catch (err) {
    logger.error(`[location.getLocationsWithPosition] ${i18n.t('DB_ERROR')} ${req.query.s}`, err)
    res.status(400).send(i18n.t('DB_ERROR') + err)
  }
}

/**
 * Check if a Location is used by a Car.
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const checkLocation = async (req: Request, res: Response) => {
  const { id } = req.params

  try {
    const _id = new mongoose.Types.ObjectId(id)

    const count = await Car
      .find({ locations: _id })
      .limit(1)
      .countDocuments()

    if (count === 1) {
      res.sendStatus(200)
      return
    }

    res.sendStatus(204)
  } catch (err) {
    logger.error(`[location.checkLocation] ${i18n.t('DB_ERROR')} ${id}`, err)
    res.status(400).send(i18n.t('DB_ERROR') + err)
  }
}

/**
 * Get location Id from location name (en).
 *
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const getLocationId = async (req: Request, res: Response) => {
  const { name, language } = req.params

  try {
    if (language.length !== 2) {
      throw new Error('Language not valid')
    }
    const lv = await LocationValue.findOne({ language, value: { $regex: new RegExp(`^${escapeStringRegexp(helper.trim(name, ' '))}$`, 'i') } })
    if (lv) {
      const location = await Location.findOne({ values: lv.id })
      res.status(200).json(location?.id)
      return
    }
    res.sendStatus(204)
  } catch (err) {
    logger.error(`[location.getLocationId] ${i18n.t('DB_ERROR')} ${name}`, err)
    res.status(400).send(i18n.t('DB_ERROR') + err)
  }
}

/**
 * Upload a Location image to temp folder.
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
      throw new Error('[location.createImage] req.file not found')
    }

    const filename = `${helper.getFilenameWithoutExtension(req.file.originalname)}_${nanoid()}_${Date.now()}${path.extname(req.file.originalname)}`
    const filepath = path.join(env.CDN_TEMP_LOCATIONS, filename)

    await asyncFs.writeFile(filepath, req.file.buffer)
    res.json(filename)
  } catch (err) {
    logger.error(`[location.createImage] ${i18n.t('DB_ERROR')}`, err)
    res.status(400).send(i18n.t('ERROR') + err)
  }
}

/**
 * Update a Location image.
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
      const msg = '[location.updateImage] req.file not found'
      logger.error(msg)
      res.status(400).send(msg)
      return
    }

    const { file } = req

    const location = await Location.findById(id)

    if (location) {
      if (location.image) {
        const image = path.join(env.CDN_LOCATIONS, location.image)
        if (await helper.pathExists(image)) {
          await asyncFs.unlink(image)
        }
      }

      const filename = `${location._id}_${Date.now()}${path.extname(file.originalname)}`
      const filepath = path.join(env.CDN_LOCATIONS, filename)

      await asyncFs.writeFile(filepath, file.buffer)
      location.image = filename
      await location.save()
      res.json(filename)
      return
    }

    logger.error('[location.updateImage] Location not found:', id)
    res.sendStatus(204)
  } catch (err) {
    logger.error(`[location.updateImage] ${i18n.t('DB_ERROR')} ${id}`, err)
    res.status(400).send(i18n.t('DB_ERROR') + err)
  }
}

/**
 * Delete a Location image.
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
    if (!helper.isValidObjectId(id)) {
      throw new Error('Location Id not valid')
    }
    const location = await Location.findById(id)

    if (location) {
      if (location.image) {
        const image = path.join(env.CDN_LOCATIONS, location.image)
        if (await helper.pathExists(image)) {
          await asyncFs.unlink(image)
        }
      }
      location.image = null

      await location.save()
      res.sendStatus(200)
      return
    }
    logger.error('[location.deleteImage] Location not found:', id)
    res.sendStatus(204)
  } catch (err) {
    logger.error(`[location.deleteImage] ${i18n.t('DB_ERROR')} ${id}`, err)
    res.status(400).send(i18n.t('DB_ERROR') + err)
  }
}

/**
 * Delete a temp Location image.
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
    if (!image.includes('.')) {
      throw new Error('Filename not valid')
    }
    const imageFile = path.join(env.CDN_TEMP_LOCATIONS, image)
    if (await helper.pathExists(imageFile)) {
      await asyncFs.unlink(imageFile)
    }

    res.sendStatus(200)
  } catch (err) {
    logger.error(`[location.deleteTempImage] ${i18n.t('DB_ERROR')} ${image}`, err)
    res.status(400).send(i18n.t('ERROR') + err)
  }
}
