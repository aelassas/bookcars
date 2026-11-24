import type { Request, Response } from 'express'
import mongoose from 'mongoose'
import Handover from '../models/Handover'
import Booking from '../models/Booking'
import * as helper from '../utils/helper'
import * as bookcarsTypes from ':bookcars-types'
import fs from 'node:fs/promises'
import path from 'node:path'
import { nanoid } from 'nanoid'
import * as env from '../config/env.config'

export const upsert = async (req: Request, res: Response) => {
  const body = req.body as Record<string, unknown>
  const bookingId = String(body.booking || '')
  if (!req.user?._id || !helper.isValidObjectId(bookingId)) {
    res.status(400).json({ message: 'A valid booking is required' })
    return
  }
  const booking = await Booking.findById(bookingId).select('car driver supplier')
  if (!booking) {
    res.status(404).json({ message: 'Booking not found' })
    return
  }
  if (req.user.type !== bookcarsTypes.UserType.Admin
    && (req.user.type !== bookcarsTypes.UserType.Supplier || booking.supplier.toString() !== req.user._id)) {
    res.status(403).json({ message: 'Forbidden: booking does not belong to this supplier' })
    return
  }
  if (body.status === 'completed') {
    if (typeof body.odometerAtPickup !== 'number'
      || typeof body.odometerAtReturn !== 'number'
      || body.odometerAtReturn < body.odometerAtPickup
      || typeof body.fuelLevelAtPickup !== 'number'
      || typeof body.fuelLevelAtReturn !== 'number'
      || !body.checklistAtPickup
      || !body.checklistAtReturn
      || !body.supplierSignature) {
      res.status(400).json({ message: 'Completed handover requires odometers, fuel levels, both checklists, and supplier signature' })
      return
    }
  }
  const handover = await Handover.findOneAndUpdate(
    { booking: booking._id },
    {
      booking: booking._id,
      vehicle: booking.car,
      customer: booking.driver,
      supplier: booking.supplier,
      status: body.status,
      odometerAtPickup: body.odometerAtPickup,
      odometerAtReturn: body.odometerAtReturn,
      fuelLevelAtPickup: body.fuelLevelAtPickup,
      fuelLevelAtReturn: body.fuelLevelAtReturn,
      checklistAtPickup: body.checklistAtPickup,
      checklistAtReturn: body.checklistAtReturn,
      pickupPhotos: body.pickupPhotos,
      returnPhotos: body.returnPhotos,
      customerSignature: body.customerSignature,
      supplierSignature: body.supplierSignature,
      damageNotes: body.damageNotes,
      scheduledAt: body.scheduledAt,
      completedAt: body.status === 'completed' ? new Date() : body.completedAt,
    },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
  )
  res.status(201).json(handover)
}

export const getByBooking = async (req: Request, res: Response) => {
  const bookingId = String(req.params.booking)
  if (!helper.isValidObjectId(bookingId)) {
    res.status(400).json({ message: 'Invalid booking ID' })
    return
  }
  const booking = await Booking.findById(bookingId).select('supplier driver handoverChecklist')
  if (!booking) {
    res.status(404).json({ message: 'Booking not found' })
    return
  }
  if (!req.user
    || (req.user.type !== bookcarsTypes.UserType.Admin
      && req.user._id !== booking.supplier.toString()
      && (!booking.driver || req.user._id !== booking.driver.toString()))) {
    res.status(403).json({ message: 'Forbidden' })
    return
  }
  const handover = await Handover.findOne({ booking: new mongoose.Types.ObjectId(bookingId) }).lean()
  const checklist = booking.handoverChecklist
  res.json(handover || (checklist?.completedAt ? {
    booking: booking._id,
    status: 'pickup recorded',
    odometerAtPickup: checklist.odometerStart,
    fuelLevelLabel: checklist.fuelLevel,
    damageNotes: checklist.exteriorNotes,
    spareTirePresent: checklist.spareTirePresent,
  } : null))
}

export const uploadPhotos = async (req: Request, res: Response) => {
  if (!req.user?._id) {
    res.status(401).json({ message: 'Unauthorized' })
    return
  }
  const files = req.files as Array<{ originalname: string; size: number; buffer: Buffer }> | undefined
  if (!files || files.length === 0) {
    res.status(400).json({ message: 'At least one photo is required' })
    return
  }
  const directory = path.join(path.dirname(env.CDN_ROOT), 'private', 'handover', req.user._id)
  await fs.mkdir(directory, { recursive: true })
  const photos: string[] = []
  for (const file of files) {
    const ext = path.extname(file.originalname).toLowerCase()
    if (!env.allowedImageExtensions.includes(ext) || file.size > 10 * 1024 * 1024) {
      res.status(400).json({ message: 'Handover photos must be JPG, JPEG, PNG, or WEBP and 10 MB or smaller' })
      return
    }
    const filename = `${nanoid()}${ext}`
    await fs.writeFile(path.join(directory, filename), file.buffer)
    photos.push(`private/handover/${req.user._id}/${filename}`)
  }
  res.json({ photos })
}
