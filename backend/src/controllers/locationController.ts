import asyncFs from 'node:fs/promises'
import path from 'node:path'
import { nanoid } from 'nanoid'
import escapeStringRegexp from 'escape-string-regexp'
import mongoose from 'mongoose'
import axios from 'axios'
import { Request, Response } from 'express'
import * as bookcarsTypes from ':bookcars-types'
import * as helper from '../utils/helper'
import * as env from '../config/env.config'
import i18n from '../lang/i18n'
import Location from '../models/Location'
import LocationValue from '../models/LocationValue'
import Car from '../models/Car'
import User from '../models/User'
import ParkingSpot from '../models/ParkingSpot'
import * as logger from '../utils/logger'
import { findPakistanPlace } from '../utils/pakistanPlaces'

const resolvedPlaceCache = new Map<string, { expiresAt: number; value: { name: string; latitude: number; longitude: number } }>()

/** Resolve a one-off Pakistan place search to coordinates (called on submit, not per keystroke). */
export const resolvePlace = async (req: Request, res: Response) => {
  const query = String(req.query.q || '').trim().slice(0, 120)
  if (query.length < 2) {
    res.status(400).json({ message: 'Enter a city or place name.' })
    return
  }

  const cacheKey = query.toLocaleLowerCase()
  const cached = resolvedPlaceCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) {
    res.json(cached.value)
    return
  }

  const localPlace = findPakistanPlace(query)
  if (localPlace) {
    const value = { name: localPlace.name, latitude: localPlace.latitude, longitude: localPlace.longitude }
    resolvedPlaceCache.set(cacheKey, { expiresAt: Date.now() + 6 * 60 * 60 * 1000, value })
    res.json(value)
    return
  }

  try {
    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: { q: `${query}, Pakistan`, format: 'jsonv2', countrycodes: 'pk', limit: 1, addressdetails: 1 },
      headers: { 'User-Agent': 'SafarRent-FYP-Demo/1.0' },
      timeout: 2500,
    })
    const result = Array.isArray(response.data) ? response.data[0] : undefined
    const latitude = Number(result?.lat)
    const longitude = Number(result?.lon)
    if (!result || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      res.status(404).json({ message: 'We could not locate that place in Pakistan. Try a nearby city or use your current location.' })
      return
    }

    const value = {
      name: String(result.name || result.display_name || query).split(',')[0],
      latitude,
      longitude,
    }
    resolvedPlaceCache.set(cacheKey, { expiresAt: Date.now() + 6 * 60 * 60 * 1000, value })
    res.json(value)
  } catch (err) {
    logger.error('[location.resolvePlace] Geocoding provider unavailable', err)
    res.status(503).json({ message: 'Place search is temporarily unavailable. Choose a listed pickup point or use your current location.' })
  }
}

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
    logger.error(`[location.validate]  ${i18n.t('ERROR')} ${name}`, err)
    res.status(400).send(i18n.t('ERROR') + err)
  }
}

const createParkingSpot = async (parkingSpot: bookcarsTypes.ParkingSpot): Promise<string> => {
  const parkinSpotValues: string[] = []
  if (parkingSpot.values) {
    for (const name of parkingSpot.values) {
      const parkinSpotValue = new LocationValue({
        language: name.language,
        value: name.value,
      })
      await parkinSpotValue.save()
      parkinSpotValues.push(parkinSpotValue._id.toString())
    }
  }

  const ps = new ParkingSpot({
    longitude: parkingSpot.longitude,
    latitude: parkingSpot.latitude,
    values: parkinSpotValues,
  })
  await ps.save()
  return ps._id.toString()
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
    parentLocation,
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
      values.push(locationValue._id.toString())
    }

    const location = new Location({
      country,
      longitude,
      latitude,
      values,
      parkingSpots,
      supplier,
      parentLocation,
    })
    await location.save()

    if (image) {
      // -----------------------------
      // 1. Sanitize filename
      // -----------------------------
      const safeImage = path.basename(image)

      // If basename changed it, it's a traversal attempt
      if (safeImage !== image) {
        logger.warn(`[location.create] Directory traversal attempt (image): ${image}`)
        res.status(400).send('Invalid image filename')
        return
      }

      const tempDir = path.resolve(env.CDN_TEMP_LOCATIONS)
      const locationsDir = path.resolve(env.CDN_LOCATIONS)

      const sourcePath = path.resolve(tempDir, safeImage)

      // -----------------------------
      // 2. Ensure source stays inside temp directory
      // -----------------------------
      if (!sourcePath.startsWith(tempDir + path.sep)) {
        logger.warn(`[location.create] Image source path escape attempt: ${sourcePath}`)
        res.status(400).send('Invalid image path')
        return
      }

      if (await helper.pathExists(sourcePath)) {
        const ext = path.extname(safeImage).toLowerCase()

        // -----------------------------
        // 3. Restrict allowed image extensions
        // -----------------------------
        if (!env.allowedImageExtensions.includes(ext)) {
          res.status(400).send('Invalid image type')
          return
        }

        const filename = `${location._id}_${Date.now()}${ext}`
        const newPath = path.resolve(locationsDir, filename)

        // -----------------------------
        // 4. Ensure destination stays inside locations directory
        // -----------------------------
        if (!newPath.startsWith(locationsDir + path.sep)) {
          logger.warn(`[location.create] Image destination path escape attempt: ${newPath}`)
          res.status(400).send('Invalid image destination')
          return
        }

        await asyncFs.rename(sourcePath, newPath)

        location.image = filename
        await location.save()
      }
    }

    res.send(location)
  } catch (err) {
    logger.error(`[location.create] ${i18n.t('ERROR')} ${JSON.stringify(req.body)}`, err)
    res.status(400).send(i18n.t('ERROR') + err)
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
      // begin of security check
      const sessionUserId = req.user?._id
      const sessionUser = await User.findById(sessionUserId)
      if (!sessionUser || (sessionUser.type === bookcarsTypes.UserType.Supplier && location.supplier?.toString() !== sessionUserId)) {
        logger.error(`[location.update] Unauthorized attempt to update location ${location._id} by user ${sessionUserId}`)
        res.status(403).send('Forbidden: You cannot update this location')
        return
      }
      // end of security check

      const {
        country,
        longitude,
        latitude,
        names,
        parkingSpots,
        parentLocation,
      }: bookcarsTypes.UpsertLocationPayload = req.body

      location.country = new mongoose.Types.ObjectId(country)
      location.longitude = longitude
      location.latitude = latitude
      location.parentLocation = parentLocation ? new mongoose.Types.ObjectId(parentLocation) : undefined

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
        const parkingSpotsToDelete = await ParkingSpot.find({ _id: { $in: location.parkingSpots?.map((ps) => ps._id.toString()) } })
        for (const ps of parkingSpotsToDelete) {
          await LocationValue.deleteMany({ _id: { $in: ps.values as mongoose.Types.ObjectId[] } })
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
            await LocationValue.deleteMany({ _id: { $in: ps.values as mongoose.Types.ObjectId[] } })
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
                ps.values.push(new mongoose.Types.ObjectId(v._id.toString() as string))
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
    logger.error(`[location.update] ${i18n.t('ERROR')} ${JSON.stringify(req.body)}`, err)
    res.status(400).send(i18n.t('ERROR') + err)
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

    // begin of security check
    const sessionUserId = req.user?._id
    const sessionUser = await User.findById(sessionUserId)
    if (!sessionUser || (sessionUser.type === bookcarsTypes.UserType.Supplier && location.supplier?.toString() !== sessionUserId)) {
      logger.error(`[location.delete] Unauthorized attempt to delete location ${location._id} by user ${sessionUserId}`)
      res.status(403).send('Forbidden: You cannot delete this location')
      return
    }
    // end of security check

    await LocationValue.deleteMany({ _id: { $in: location.values } })
    await Location.deleteOne({ _id: id })

    if (location.parkingSpots && location.parkingSpots.length > 0) {
      const values = location.parkingSpots.map((ps) => ps.values).flat() as mongoose.Types.ObjectId[]
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
    logger.error(`[location.delete] ${i18n.t('ERROR')} ${id}`, err)
    res.status(400).send(i18n.t('ERROR') + err)
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
      .populate<{
        parentLocation: env.LocationInfo
      }>({
        path: 'parentLocation',
        populate: {
          path: 'values',
          model: 'LocationValue',
        },
      })
      .lean()

    if (location) {
      const { language } = req.params
      const name = (location.values as env.LocationValue[]).filter((value) => value.language === language)[0].value

      if (location.country) {
        const countryName = ((location.country as env.CountryInfo).values as env.LocationValue[]).filter((value) => value.language === req.params.language)[0].value
        location.country.name = countryName
      }
      if (location.parkingSpots && location.parkingSpots.length > 0) {
        for (const parkingSpot of location.parkingSpots) {
          parkingSpot.name = (parkingSpot.values as env.LocationValue[]).filter((value) => value.language === req.params.language)[0].value
        }
      }
      if (location.supplier) {
        const { _id, fullName, avatar } = location.supplier
        location.supplier = { _id, fullName, avatar }
      }
      let parentLocation: env.LocationInfo | undefined
      if (location.parentLocation) {
        const parentLocationName = (location.parentLocation.values as env.LocationValue[]).filter((value) => value.language === language)[0].value
        parentLocation = { ...location.parentLocation, name: parentLocationName }
      }

      const loc = { ...location, name, parentLocation }
      res.json(loc)
      return
    }
    logger.error('[location.getLocation] Location not found:', id)
    res.sendStatus(204)
  } catch (err) {
    logger.error(`[location.getLocation] ${i18n.t('ERROR')} ${id}`, err)
    res.status(400).send(i18n.t('ERROR') + err)
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
    const page = Number.parseInt(req.params.page as string, 10)
    const size = Number.parseInt(req.params.size as string, 10)
    const { language } = req.params as { language: string }
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
    logger.error(`[location.getLocations] ${i18n.t('ERROR')} ${req.query.s}`, err)
    res.status(400).send(i18n.t('ERROR') + err)
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
    logger.error(`[location.getLocationsWithPosition] ${i18n.t('ERROR')} ${req.query.s}`, err)
    res.status(400).send(i18n.t('ERROR') + err)
  }
}

const haversineKm = (latitude1: number, longitude1: number, latitude2: number, longitude2: number): number => {
  const earthRadiusKm = 6371
  const toRadians = (value: number) => value * Math.PI / 180
  const dLatitude = toRadians(latitude2 - latitude1)
  const dLongitude = toRadians(longitude2 - longitude1)
  const a =
    Math.sin(dLatitude / 2) ** 2 +
    Math.cos(toRadians(latitude1)) * Math.cos(toRadians(latitude2)) *
    Math.sin(dLongitude / 2) ** 2
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/**
 * Resolve a text place or coordinate to the nearest registered pickup hub.
 * The built-in Pakistan place map is a deterministic fallback until a
 * third-party geocoding provider is configured.
 */
export const resolveHub = async (req: Request, res: Response) => {
  try {
    const language = String(req.params.language || env.DEFAULT_LANGUAGE)
    const body = req.body as { name?: string, latitude?: number, longitude?: number, radiusKm?: number }
    const pakistanPlaces: Record<string, [number, number]> = {
      murree: [33.9062, 73.3903],
      'blue area': [33.7077, 73.0504],
      islamabad: [33.6844, 73.0479],
      rawalpindi: [33.6007, 73.0679],
      lahore: [31.5204, 74.3587],
      karachi: [24.8607, 67.0011],
      faisalabad: [31.4504, 73.1350],
      peshawar: [34.0151, 71.5249],
      quetta: [30.1798, 66.9750],
      multan: [30.1972, 71.4748],
    }

    let latitude = typeof body.latitude === 'number' ? body.latitude : undefined
    let longitude = typeof body.longitude === 'number' ? body.longitude : undefined
    let resolvedName = typeof body.name === 'string' ? body.name.trim() : ''

    if ((!latitude || !longitude) && resolvedName) {
      const place = resolvedName.toLowerCase()
      const coordinates = pakistanPlaces[place]
      if (coordinates) {
        ;[latitude, longitude] = coordinates
      } else {
        const partial = Object.entries(pakistanPlaces).find(([name]) => place.includes(name) || name.includes(place))
        if (partial) {
          resolvedName = partial[0]
          ;[latitude, longitude] = partial[1]
        }
      }
    }

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      res.status(400).json({ message: 'A valid Pakistan place name or latitude/longitude is required' })
      return
    }

    const hubs = await Location.find({
      latitude: { $ne: null },
      longitude: { $ne: null },
    }).populate<{ values: env.LocationValue[] }>('values').lean()

    const ranked = hubs.map((hub) => {
      const distanceKm = haversineKm(latitude!, longitude!, Number(hub.latitude), Number(hub.longitude))
      const translated = (hub.values as env.LocationValue[]).find((value) => value.language === language)
        || (hub.values as env.LocationValue[]).find((value) => value.language === env.DEFAULT_LANGUAGE)
      return {
        _id: hub._id.toString(),
        name: translated?.value || resolvedName || 'Registered pickup hub',
        latitude: hub.latitude,
        longitude: hub.longitude,
        distanceKm: Number(distanceKm.toFixed(2)),
      }
    }).sort((a, b) => a.distanceKm - b.distanceKm)

    const nearestHub = ranked[0] || null
    const radiusKm = Number.isFinite(body.radiusKm) ? Math.max(1, Math.min(Number(body.radiusKm), 500)) : 50
    const withinRadius = Boolean(nearestHub && nearestHub.distanceKm <= radiusKm)

    res.json({
      resolvedName,
      input: { latitude, longitude },
      radiusKm,
      withinRadius,
      fallbackUsed: !withinRadius,
      nearestHub,
      nearbyHubs: ranked.filter((hub) => hub.distanceKm <= radiusKm).slice(0, 10),
    })
  } catch (err) {
    logger.error('[location.resolveHub]', err)
    res.status(500).json({ message: 'Unable to resolve the nearest pickup hub' })
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
  const { id } = req.params as { id: string }

  try {
    const _id = new mongoose.Types.ObjectId(id)

    const carCount = await Car
      .find({ locations: _id })
      .limit(1)
      .countDocuments()

    const childLocationsCount = await Location
      .find({ parentLocation: _id })
      .limit(1)
      .countDocuments()

    if (carCount === 1 || childLocationsCount === 1) {
      res.sendStatus(200)
      return
    }

    res.sendStatus(204)
  } catch (err) {
    logger.error(`[location.checkLocation] ${i18n.t('ERROR')} ${id}`, err)
    res.status(400).send(i18n.t('ERROR') + err)
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
  const { name, language } = req.params as { name: string, language: string }

  try {
    if (language.length !== 2) {
      throw new Error('Language not valid')
    }
    const lv = await LocationValue.findOne({ language, value: { $regex: new RegExp(`^${escapeStringRegexp(helper.trim(name, ' '))}$`, 'i') } })
    if (lv) {
      const location = await Location.findOne({ values: lv._id.toString() })
      res.status(200).json(location?._id.toString())
      return
    }
    res.sendStatus(204)
  } catch (err) {
    logger.error(`[location.getLocationId] ${i18n.t('ERROR')} ${name}`, err)
    res.status(400).send(i18n.t('ERROR') + err)
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

    // security check: restrict allowed extensions
    const ext = path.extname(filename)
    if (!env.allowedImageExtensions.includes(ext.toLowerCase())) {
      res.status(400).send('Invalid location image file type')
      return
    }

    await asyncFs.writeFile(filepath, req.file.buffer)
    res.json(filename)
  } catch (err) {
    logger.error(`[location.createImage] ${i18n.t('ERROR')}`, err)
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
      // begin of security check
      const sessionUserId = req.user?._id
      const sessionUser = sessionUserId ? await User.findById(sessionUserId) : null
      if (
        !sessionUser
        || sessionUser.type === bookcarsTypes.UserType.User
        || (sessionUser.type === bookcarsTypes.UserType.Supplier && location.supplier?.toString() !== sessionUserId)
      ) {
        logger.error(`[location.updateImage] Unauthorized attempt to update image for location ${location._id} by user ${sessionUserId}`)
        res.status(403).send('Forbidden: You cannot update this location image')
        return
      }
      // end of security check

      if (location.image) {
        const image = path.join(env.CDN_LOCATIONS, location.image)
        if (await helper.pathExists(image)) {
          await asyncFs.unlink(image)
        }
      }

      const filename = `${location._id}_${Date.now()}${path.extname(file.originalname)}`
      const filepath = path.join(env.CDN_LOCATIONS, filename)

      // security check: restrict allowed extensions
      const ext = path.extname(filename)
      if (!env.allowedImageExtensions.includes(ext.toLowerCase())) {
        res.status(400).send('Invalid location image file type')
        return
      }

      await asyncFs.writeFile(filepath, file.buffer)
      location.image = filename
      await location.save()
      res.json(filename)
      return
    }

    logger.error('[location.updateImage] Location not found:', id)
    res.sendStatus(204)
  } catch (err) {
    logger.error(`[location.updateImage] ${i18n.t('ERROR')} ${id}`, err)
    res.status(400).send(i18n.t('ERROR') + err)
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
  const { id } = req.params as { id: string }

  try {
    if (!helper.isValidObjectId(id)) {
      throw new Error('Location Id not valid')
    }
    const location = await Location.findById(id)

    if (location) {
      // begin of security check
      const sessionUserId = req.user?._id
      const sessionUser = sessionUserId ? await User.findById(sessionUserId) : null
      if (
        !sessionUser
        || sessionUser.type === bookcarsTypes.UserType.User
        || (sessionUser.type === bookcarsTypes.UserType.Supplier && location.supplier?.toString() !== sessionUserId)
      ) {
        logger.error(`[location.deleteImage] Unauthorized attempt to delete image for location ${location._id} by user ${sessionUserId}`)
        res.status(403).send('Forbidden: You cannot delete this location image')
        return
      }
      // end of security check

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
    logger.error(`[location.deleteImage] ${i18n.t('ERROR')} ${id}`, err)
    res.status(400).send(i18n.t('ERROR') + err)
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
  const { image } = req.params as { image: string }

  try {
    // prevent null bytes
    if (image.includes('\0')) {
      res.status(400).send('Invalid filename')
      return
    }

    const baseDir = path.resolve(env.CDN_TEMP_LOCATIONS)
    const targetPath = path.resolve(baseDir, image)

    // critical security check: prevent directory traversal
    if (!targetPath.startsWith(baseDir + path.sep)) {
      logger.warn(`Directory traversal attempt: ${image}`)
      res.status(403).send('Forbidden')
      return
    }

    if (await helper.pathExists(targetPath)) {
      await asyncFs.unlink(targetPath)
    }

    res.sendStatus(200)
  } catch (err) {
    logger.error(`[location.deleteTempImage] ${i18n.t('ERROR')} ${image}`, err)
    res.status(400).send(i18n.t('ERROR') + err)
  }
}
