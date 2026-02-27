import escapeStringRegexp from 'escape-string-regexp'
import mongoose from 'mongoose'
import { Request, Response } from 'express'
import * as bookcarsTypes from ':bookcars-types'
import * as helper from '../utils/helper'
import * as env from '../config/env.config'
import i18n from '../lang/i18n'
import Country from '../models/Country'
import User from '../models/User'
import LocationValue from '../models/LocationValue'
import Location from '../models/Location'
import * as logger from '../utils/logger'

/**
 * Validate a Country name with language code.
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const validate = async (req: Request, res: Response) => {
  const { body }: { body: bookcarsTypes.ValidateCountryPayload } = req
  const { language, name } = body

  try {
    if (language.length !== 2) {
      throw new Error('Language not valid')
    }
    const keyword = escapeStringRegexp(name)
    const options = 'i'

    const countries = await Country.aggregate(
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

    if (countries.length > 0) {
      res.sendStatus(204)
    } else {
      res.sendStatus(200)
    }
  } catch (err) {
    logger.error(`[country.validate]  ${i18n.t('ERROR')} ${name}`, err)
    res.status(400).send(i18n.t('ERROR') + err)
  }
}

/**
 * Create a Country.
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const create = async (req: Request, res: Response) => {
  const { body }: { body: bookcarsTypes.UpsertCountryPayload } = req
  const { names, supplier } = body

  try {
    const values: string[] = []
    for (const name of names) {
      const countryValue = new LocationValue({
        language: name.language,
        value: name.name,
      })
      await countryValue.save()
      values.push(countryValue._id.toString())
    }

    const country = new Country({ values, supplier })
    await country.save()
    res.send(country)
  } catch (err) {
    logger.error(`[country.create] ${i18n.t('ERROR')} ${JSON.stringify(req.body)}`, err)
    res.status(400).send(i18n.t('ERROR') + err)
  }
}

/**
 * Update a Country.
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
    const country = await Country.findById(id).populate<{ values: env.LocationValue[] }>('values')

    if (country) {
      // begin of security check
      const sessionUserId = req.user?._id
      const sessionUser = await User.findById(sessionUserId)
      if (!sessionUser || (sessionUser.type === bookcarsTypes.UserType.Supplier && country.supplier?.toString() !== sessionUserId)) {
        logger.error(`[country.update] Unauthorized attempt to update country ${country._id} by user ${sessionUserId}`)
        res.status(403).send('Forbidden: You cannot update this country')
        return
      }
      // end of security check

      const names: bookcarsTypes.CountryName[] = req.body

      for (const name of names) {
        const countryValue = country.values.filter((value) => value.language === name.language)[0]
        if (countryValue) {
          countryValue.value = name.name
          await countryValue.save()
        } else {
          const lv = new LocationValue({
            language: name.language,
            value: name.name,
          })
          await lv.save()
          country.values.push(lv)
          await country.save()
        }
      }
      res.json(country)
      return
    }

    logger.error('[country.update] Country not found:', id)
    res.sendStatus(204)
  } catch (err) {
    logger.error(`[country.update] ${i18n.t('ERROR')} ${JSON.stringify(req.body)}`, err)
    res.status(400).send(i18n.t('ERROR') + err)
  }
}

/**
 * Delete a Country.
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const deleteCountry = async (req: Request, res: Response) => {
  const { id } = req.params

  try {
    const country = await Country.findById(id)
    if (!country) {
      const msg = `[country.delete] Country ${id} not found`
      logger.info(msg)
      res.status(204).send(msg)
      return
    }
    // begin of security check
    const sessionUserId = req.user?._id
    const sessionUser = await User.findById(sessionUserId)
    if (!sessionUser || (sessionUser.type === bookcarsTypes.UserType.Supplier && country.supplier?.toString() !== sessionUserId)) {
      logger.error(`[country.delete] Unauthorized attempt to delete country ${country._id} by user ${sessionUserId}`)
      res.status(403).send('Forbidden: You cannot delete this country')
      return
    }
    // end of security check

    await Country.deleteOne({ _id: id })
    await LocationValue.deleteMany({ _id: { $in: country.values } })
    res.sendStatus(200)
  } catch (err) {
    logger.error(`[country.delete] ${i18n.t('ERROR')} ${id}`, err)
    res.status(400).send(i18n.t('ERROR') + err)
  }
}

/**
 * Get a Country by ID.
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const getCountry = async (req: Request, res: Response) => {
  const { id } = req.params

  try {
    const country = await Country
      .findById(id)
      .populate<{ values: env.LocationValue[] }>('values')
      .populate<{ supplier: env.UserInfo }>('supplier')
      .lean()

    if (country) {
      const name = (country.values as env.LocationValue[]).filter((value) => value.language === req.params.language)[0].value
      if (country.supplier) {
        const { _id, fullName, avatar } = country.supplier
        country.supplier = { _id, fullName, avatar }
      }
      const c = { ...country, name }
      res.json(c)
      return
    }
    logger.error('[country.getCountry] Country not found:', id)
    res.sendStatus(204)
  } catch (err) {
    logger.error(`[country.getCountry] ${i18n.t('ERROR')} ${id}`, err)
    res.status(400).send(i18n.t('ERROR') + err)
  }
}

/**
 * Get Countries.
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const getCountries = async (req: Request, res: Response) => {
  try {
    const page = Number.parseInt(req.params.page, 10)
    const size = Number.parseInt(req.params.size, 10)
    const { language } = req.params
    const keyword = escapeStringRegexp(String(req.query.s || ''))
    const options = 'i'

    const countries = await Country.aggregate(
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

    res.json(countries)
  } catch (err) {
    logger.error(`[country.getCountries] ${i18n.t('ERROR')} ${req.query.s}`, err)
    res.status(400).send(i18n.t('ERROR') + err)
  }
}

/**
 * Get Countries with locations.
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const getCountriesWithLocations = async (req: Request, res: Response) => {
  try {
    const { language, imageRequired: _imageRequired, minLocations: _minLocations } = req.params
    const keyword = escapeStringRegexp(String(req.query.s || ''))
    const options = 'i'

    const imageRequired = helper.StringToBoolean(_imageRequired)
    const minLocations = Number(_minLocations)

    let $locationMatch: mongoose.QueryFilter<env.Location> = {}
    if (imageRequired) {
      $locationMatch = { image: { $ne: null } }
    }

    const countries = await Country.aggregate(
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
            from: 'Location',
            let: { country: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ['$country', '$$country'] },
                },
              },
              {
                $match: $locationMatch,
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
            as: 'locations',
          },
        },

        {
          $addFields: {
            locationsSize: { $size: '$locations' },
          },
        },

        {
          $match: { locationsSize: { $gte: minLocations } },
        },

        {
          $sort: { name: 1 },
        },
      ],
      { collation: { locale: env.DEFAULT_LANGUAGE, strength: 2 } },
    )

    res.json(countries)
  } catch (err) {
    logger.error(`[country.getCountries] ${i18n.t('ERROR')} ${req.query.s}`, err)
    res.status(400).send(i18n.t('ERROR') + err)
  }
}

/**
 * Check if a Country is used by a Car.
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const checkCountry = async (req: Request, res: Response) => {
  const { id } = req.params

  try {
    const _id = new mongoose.Types.ObjectId(id)

    const count = await Location
      .find({ country: _id })
      .limit(1)
      .countDocuments()

    if (count === 1) {
      res.sendStatus(200)
      return
    }

    res.sendStatus(204)
  } catch (err) {
    logger.error(`[country.checkCountry] ${i18n.t('ERROR')} ${id}`, err)
    res.status(400).send(i18n.t('ERROR') + err)
  }
}

/**
 * Get country Id from country name (en).
 *
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const getCountryId = async (req: Request, res: Response) => {
  const { name, language } = req.params

  try {
    if (language.length !== 2) {
      throw new Error('Language not valid')
    }
    const lv = await LocationValue.findOne({ language, value: { $regex: new RegExp(`^${escapeStringRegexp(helper.trim(name, ' '))}$`, 'i') } })
    if (lv) {
      const country = await Country.findOne({ values: lv._id.toString() })
      res.status(200).json(country?._id.toString())
      return
    }
    res.sendStatus(204)
  } catch (err) {
    logger.error(`[country.getCountryId] ${i18n.t('ERROR')} ${name}`, err)
    res.status(400).send(i18n.t('ERROR') + err)
  }
}
