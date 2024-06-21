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
    const keyword = escapeStringRegexp(name)
    const options = 'i'

    const locationValue = await LocationValue.findOne({
      language: { $eq: language },
      value: { $regex: new RegExp(`^${keyword}$`), $options: options },
    })
    return locationValue ? res.sendStatus(204) : res.sendStatus(200)
  } catch (err) {
    logger.error(`[location.validate]  ${i18n.t('DB_ERROR')} ${name}`, err)
    return res.status(400).send(i18n.t('DB_ERROR') + err)
  }
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
  const { body }: { body: bookcarsTypes.LocationName[] } = req
  const names = body

  try {
    const values = []
    for (const name of names) {
      const locationValue = new LocationValue({
        language: name.language,
        value: name.name,
      })
      await locationValue.save()
      values.push(locationValue._id)
    }

    const location = new Location({ values })
    await location.save()
    return res.send(location)
  } catch (err) {
    logger.error(`[location.create] ${i18n.t('DB_ERROR')} ${JSON.stringify(req.body)}`, err)
    return res.status(400).send(i18n.t('DB_ERROR') + err)
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
    const location = await Location.findById(id).populate<{ values: env.LocationValue[] }>('values')

    if (location) {
      const names: bookcarsTypes.LocationName[] = req.body

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
          await location.save()
        }
      }
      return res.json(location)
    }

    logger.error('[location.update] Location not found:', id)
    return res.sendStatus(204)
  } catch (err) {
    logger.error(`[location.update] ${i18n.t('DB_ERROR')} ${JSON.stringify(req.body)}`, err)
    return res.status(400).send(i18n.t('DB_ERROR') + err)
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
    const location = await Location.findById(id)
    if (!location) {
      const msg = `[location.delete] Location ${id} not found`
      logger.info(msg)
      return res.status(204).send(msg)
    }
    await Location.deleteOne({ _id: id })
    await LocationValue.deleteMany({ _id: { $in: location.values } })
    return res.sendStatus(200)
  } catch (err) {
    logger.error(`[location.delete] ${i18n.t('DB_ERROR')} ${id}`, err)
    return res.status(400).send(i18n.t('DB_ERROR') + err)
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
    const location = await Location.findById(id).populate<{ values: env.LocationValue[] }>('values').lean()

    if (location) {
      const name = (location.values as env.LocationValue[]).filter((value) => value.language === req.params.language)[0].value
      const l = { ...location, name }
      return res.json(l)
    }
    logger.error('[location.getLocation] Location not found:', id)
    return res.sendStatus(204)
  } catch (err) {
    logger.error(`[location.getLocation] ${i18n.t('DB_ERROR')} ${id}`, err)
    return res.status(400).send(i18n.t('DB_ERROR') + err)
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

    return res.json(locations)
  } catch (err) {
    logger.error(`[location.getLocations] ${i18n.t('DB_ERROR')} ${req.query.s}`, err)
    return res.status(400).send(i18n.t('DB_ERROR') + err)
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
      return res.sendStatus(200)
    }

    return res.sendStatus(204)
  } catch (err) {
    logger.error(`[location.checkLocation] ${i18n.t('DB_ERROR')} ${id}`, err)
    return res.status(400).send(i18n.t('DB_ERROR') + err)
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
    const lv = await LocationValue.findOne({ language, value: { $regex: new RegExp(`^${escapeStringRegexp(helper.trim(name, ' '))}$`, 'i') } })
    if (lv) {
      const location = await Location.findOne({ values: lv.id })
      return res.status(200).json(location?.id)
    }
    return res.sendStatus(204)
  } catch (err) {
    logger.error(`[location.getLocationId] ${i18n.t('DB_ERROR')} ${name}`, err)
    return res.status(400).send(i18n.t('DB_ERROR') + err)
  }
}
