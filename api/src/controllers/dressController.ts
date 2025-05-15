import { Request, Response } from 'express'
import fs from 'fs'
import path from 'path'
import mongoose from 'mongoose'
import Dress from '../models/Dress'
import * as helper from '../common/helper'
import * as dressHelper from '../common/dressHelper'
import * as env from '../config/env.config'
import * as bookcarsTypes from ':bookcars-types'

/**
 * Get all dresses.
 *
 * @param {Request} req
 * @param {Response} res
 * @returns {Promise<void>}
 */
export const getDresses = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = Number.parseInt(req.params.page, 10)
    const size = Number.parseInt(req.params.size, 10)
    const keyword = req.query.s as string
    const options = {
      page,
      limit: size,
      sort: { name: 1 },
      populate: [
        {
          path: 'supplier',
          select: '_id fullName avatar',
        },
        {
          path: 'locations',
          select: '_id name',
        },
      ],
    }

    let query = {}
    if (keyword) {
      query = {
        $or: [
          { name: { $regex: keyword, $options: 'i' } },
          { 'supplier.fullName': { $regex: keyword, $options: 'i' } },
        ],
      }
    }

    const result = await Dress.paginate(query, options)
    res.json(result)
  } catch (err) {
    console.error(`[dressController.getDresses] ${err}`)
    res.status(500).json({ error: err.message })
  }
}

/**
 * Get dress by ID.
 *
 * @param {Request} req
 * @param {Response} res
 * @returns {Promise<void>}
 */
export const getDress = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id
    const dress = await Dress.findById(id)
      .populate('supplier', '_id fullName avatar')
      .populate('locations', '_id name')

    if (!dress) {
      res.sendStatus(204)
      return
    }

    res.json(dress)
  } catch (err) {
    console.error(`[dressController.getDress] ${err}`)
    res.status(500).json({ error: err.message })
  }
}

/**
 * Create a new dress.
 *
 * @param {Request} req
 * @param {Response} res
 * @returns {Promise<void>}
 */
export const create = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      name,
      supplier,
      minimumAge,
      locations,
      dailyPrice,
      discountedDailyPrice,
      biWeeklyPrice,
      discountedBiWeeklyPrice,
      weeklyPrice,
      discountedWeeklyPrice,
      monthlyPrice,
      discountedMonthlyPrice,
      isDateBasedPrice,
      dateBasedPrices,
      deposit,
      available,
      fullyBooked,
      comingSoon,
      type,
      size,
      aircon,
      color,
      length,
      material,
      mileage,
      cancellation,
      amendments,
      theftProtection,
      collisionDamageWaiver,
      fullInsurance,
      additionalDriver,
      range,
      accessories,
      rating,
      designerName
    } = req.body

    const dress = new Dress({
      name,
      supplier,
      minimumAge,
      locations,
      dailyPrice,
      discountedDailyPrice,
      biWeeklyPrice,
      discountedBiWeeklyPrice,
      weeklyPrice,
      discountedWeeklyPrice,
      monthlyPrice,
      discountedMonthlyPrice,
      isDateBasedPrice,
      dateBasedPrices,
      deposit,
      available,
      fullyBooked,
      comingSoon,
      type,
      size,
      aircon,
      color,
      length,
      material,
      cancellation,
      amendments,
      range,
      accessories,
      rating,
      designerName
    })

    await dress.save()
    res.json(dress)
  } catch (err) {
    console.error(`[dressController.create] ${err}`)
    res.status(500).json({ error: err.message })
  }
}

/**
 * Update a dress.
 *
 * @param {Request} req
 * @param {Response} res
 * @returns {Promise<void>}
 */
export const update = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id
    const {
      name,
      supplier,
      minimumAge,
      locations,
      dailyPrice,
      discountedDailyPrice,
      biWeeklyPrice,
      discountedBiWeeklyPrice,
      weeklyPrice,
      discountedWeeklyPrice,
      monthlyPrice,
      discountedMonthlyPrice,
      isDateBasedPrice,
      dateBasedPrices,
      deposit,
      available,
      fullyBooked,
      comingSoon,
      type,
      size,
      aircon,
      color,
      length,
      material,
      cancellation,
      amendments,
      range,
      accessories,
      rating,
      designerName
    } = req.body

    const dress = await Dress.findByIdAndUpdate(
      id,
      {
        name,
        supplier,
        minimumAge,
        locations,
        dailyPrice,
        discountedDailyPrice,
        biWeeklyPrice,
        discountedBiWeeklyPrice,
        weeklyPrice,
        discountedWeeklyPrice,
        monthlyPrice,
        discountedMonthlyPrice,
        isDateBasedPrice,
        dateBasedPrices,
        deposit,
        available,
        fullyBooked,
        comingSoon,
        type,
        size,
        aircon,
        color,
        length,
        material,
        cancellation,
        amendments,
        range,
        accessories,
        rating,
        designerName
      },
      { new: true }
    )

    if (!dress) {
      res.sendStatus(204)
      return
    }

    res.json(dress)
  } catch (err) {
    console.error(`[dressController.update] ${err}`)
    res.status(500).json({ error: err.message })
  }
}

/**
 * Delete a dress.
 *
 * @param {Request} req
 * @param {Response} res
 * @returns {Promise<void>}
 */
export const deleteDress = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id
    const dress = await Dress.findByIdAndDelete(id)

    if (!dress) {
      res.sendStatus(204)
      return
    }

    res.sendStatus(200)
  } catch (err) {
    console.error(`[dressController.deleteDress] ${err}`)
    res.status(500).json({ error: err.message })
  }
}

/**
 * Check if a dress exists.
 *
 * @param {Request} req
 * @param {Response} res
 * @returns {Promise<void>}
 */
export const checkDress = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id
    const dress = await Dress.findById(id)

    if (!dress) {
      res.sendStatus(204)
      return
    }

    res.sendStatus(200)
  } catch (err) {
    console.error(`[dressController.checkDress] ${err}`)
    res.status(500).json({ error: err.message })
  }
}

/**
 * Create a dress image.
 *
 * @param {Request} req
 * @param {Response} res
 * @returns {Promise<void>}
 */
export const createImage = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.sendStatus(400)
      return
    }

    const filename = helper.generateUniqueFilename(req.file.originalname)
    const tempPath = path.join(env.CDN_TEMP_DRESSES, filename)

    await fs.promises.writeFile(tempPath, req.file.buffer)

    res.json(filename)
  } catch (err) {
    console.error(`[dressController.createImage] ${err}`)
    res.status(500).json({ error: err.message })
  }
}

/**
 * Update a dress image.
 *
 * @param {Request} req
 * @param {Response} res
 * @returns {Promise<void>}
 */
export const updateImage = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.sendStatus(400)
      return
    }

    const id = req.params.id
    const dress = await Dress.findById(id)

    if (!dress) {
      res.sendStatus(204)
      return
    }

    const filename = helper.generateUniqueFilename(req.file.originalname)
    const tempPath = path.join(env.CDN_TEMP_DRESSES, filename)

    await fs.promises.writeFile(tempPath, req.file.buffer)

    res.json(filename)
  } catch (err) {
    console.error(`[dressController.updateImage] ${err}`)
    res.status(500).json({ error: err.message })
  }
}

/**
 * Delete a dress image.
 *
 * @param {Request} req
 * @param {Response} res
 * @returns {Promise<void>}
 */
export const deleteImage = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id
    const dress = await Dress.findById(id)

    if (!dress || !dress.image) {
      res.sendStatus(204)
      return
    }

    const imagePath = path.join(env.CDN_DRESSES, dress.image)

    if (fs.existsSync(imagePath)) {
      await fs.promises.unlink(imagePath)
    }

    dress.image = undefined
    await dress.save()

    res.sendStatus(200)
  } catch (err) {
    console.error(`[dressController.deleteImage] ${err}`)
    res.status(500).json({ error: err.message })
  }
}

/**
 * Delete a temporary dress image.
 *
 * @param {Request} req
 * @param {Response} res
 * @returns {Promise<void>}
 */
export const deleteTempImage = async (req: Request, res: Response): Promise<void> => {
  try {
    const image = req.params.image
    const imagePath = path.join(env.CDN_TEMP_DRESSES, image)

    if (fs.existsSync(imagePath)) {
      await fs.promises.unlink(imagePath)
    }

    res.sendStatus(200)
  } catch (err) {
    console.error(`[dressController.deleteTempImage] ${err}`)
    res.status(500).json({ error: err.message })
  }
}

/**
 * Get booking dresses.
 *
 * @param {Request} req
 * @param {Response} res
 * @returns {Promise<void>}
 */
export const getBookingDresses = async (req: Request, res: Response): Promise<void> => {
  try {
    const payload = req.body as bookcarsTypes.GetBookingDressesPayload

    const page = Number.parseInt(req.params.page, 10)
    const size = Number.parseInt(req.params.size, 10)

    const query = {
      supplier: new mongoose.Types.ObjectId(payload.supplier),
      locations: new mongoose.Types.ObjectId(payload.pickupLocation),
    }

    const options = {
      page,
      limit: size,
      sort: { name: 1 },
      populate: [
        {
          path: 'supplier',
          select: '_id fullName avatar',
        },
        {
          path: 'locations',
          select: '_id name',
        },
      ],
    }

    const result = await Dress.paginate(query, options)
    res.json(result)
  } catch (err) {
    console.error(`[dressController.getBookingDresses] ${err}`)
    res.status(500).json({ error: err.message })
  }
}

/**
 * Get frontend dresses.
 *
 * @param {Request} req
 * @param {Response} res
 * @returns {Promise<void>}
 */
export const getFrontendDresses = async (req: Request, res: Response): Promise<void> => {
  try {
    const payload = req.body as bookcarsTypes.GetDressesPayload

    const page = Number.parseInt(req.params.page, 10)
    const size = Number.parseInt(req.params.size, 10)

    const query: any = { available: true }

    if (payload.suppliers && payload.suppliers.length > 0) {
      query.supplier = { $in: payload.suppliers.map(id => new mongoose.Types.ObjectId(id)) }
    }

    if (payload.pickupLocation) {
      query.locations = new mongoose.Types.ObjectId(payload.pickupLocation)
    }

    if (payload.dressType && payload.dressType.length > 0) {
      query.type = { $in: payload.dressType }
    }

    if (payload.dressSize && payload.dressSize.length > 0) {
      query.size = { $in: payload.dressSize }
    }

    if (payload.color) {
      query.color = payload.color
    }

    if (payload.deposit) {
      query.deposit = { $lte: payload.deposit }
    }

    if (payload.availability && payload.availability.length > 0) {
      if (payload.availability.includes('available')) {
        query.available = true
      }
      if (payload.availability.includes('unavailable')) {
        query.available = false
      }
    }



    if (payload.material && payload.material.length > 0) {
      query.material = { $in: payload.material }
    }

    if (payload.ranges && payload.ranges.length > 0) {
      query.range = { $in: payload.ranges }
    }

    if (payload.accessories && payload.accessories.length > 0) {
      query.accessories = { $in: payload.accessories }
    }

    if (payload.rating) {
      query.rating = { $gte: payload.rating }
    }

    if (!payload.includeAlreadyBookedDresses) {
      query.fullyBooked = false
    }

    if (!payload.includeComingSoonDresses) {
      query.comingSoon = false
    }

    const options = {
      page,
      limit: size,
      sort: { name: 1 },
      populate: [
        {
          path: 'supplier',
          select: '_id fullName avatar',
        },
        {
          path: 'locations',
          select: '_id name',
        },
      ],
    }

    const result = await Dress.paginate(query, options)
    res.json(result)
  } catch (err) {
    console.error(`[dressController.getFrontendDresses] ${err}`)
    res.status(500).json({ error: err.message })
  }
}
