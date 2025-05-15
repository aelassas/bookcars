import { Request, Response } from 'express'
import Dress from '../models/Dress'
import * as helper from '../common/helper'
import * as dressHelper from '../common/dressHelper'
import * as env from '../config/env.config'

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
export const createDress = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, supplier, minimumAge, locations, price, deposit, available, type, size, style, color } = req.body
    
    const dress = new Dress({
      name,
      supplier,
      minimumAge,
      locations,
      price,
      deposit,
      available,
      type,
      size,
      style,
      color,
    })
    
    await dress.save()
    res.json(dress)
  } catch (err) {
    console.error(`[dressController.createDress] ${err}`)
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
export const updateDress = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id
    const { name, supplier, minimumAge, locations, price, deposit, available, type, size, style, color } = req.body
    
    const dress = await Dress.findByIdAndUpdate(
      id,
      {
        name,
        supplier,
        minimumAge,
        locations,
        price,
        deposit,
        available,
        type,
        size,
        style,
        color,
      },
      { new: true }
    )
    
    if (!dress) {
      res.sendStatus(204)
      return
    }
    
    res.json(dress)
  } catch (err) {
    console.error(`[dressController.updateDress] ${err}`)
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
