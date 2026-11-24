import type { Request, Response } from 'express'
import mongoose from 'mongoose'
import Kyc from '../models/Kyc'
import * as helper from '../utils/helper'
import * as bookcarsTypes from ':bookcars-types'
import fs from 'node:fs/promises'
import path from 'node:path'
import { nanoid } from 'nanoid'
import * as env from '../config/env.config'
import User from '../models/User'

const cnicPattern = /^\d{5}-\d{7}-\d{1}$/

export const uploadDocuments = async (req: Request, res: Response) => {
  if (!req.user?._id) {
    res.status(401).json({ message: 'Unauthorized' })
    return
  }
  const files = req.files as { [fieldname: string]: Array<{ originalname: string, size: number, buffer: Buffer }> } | undefined
  if (!files || Object.keys(files).length === 0) {
    res.status(400).json({ message: 'At least one document image is required' })
    return
  }
  const directory = path.join(path.dirname(env.CDN_ROOT), 'private', 'kyc', req.user._id)
  await fs.mkdir(directory, { recursive: true })
  const result: Record<string, string> = {}
  for (const [field, list] of Object.entries(files)) {
    if (!['documentFront', 'documentBack', 'selfie'].includes(field) || list.length !== 1) {
      continue
    }
    const file = list[0]
    const ext = path.extname(file.originalname).toLowerCase()
    if (!env.allowedImageExtensions.includes(ext) || file.size > 5 * 1024 * 1024) {
      res.status(400).json({ message: 'KYC images must be JPG, JPEG, PNG, or WEBP and 5 MB or smaller' })
      return
    }
    const filename = `${nanoid()}${ext}`
    await fs.writeFile(path.join(directory, filename), file.buffer)
    result[field] = `private/kyc/${req.user._id}/${filename}`
  }
  res.json(result)
}

export const submit = async (req: Request, res: Response) => {
  const body = req.body as Partial<bookcarsTypes.Kyc>
  if (!req.user?._id || !helper.isValidObjectId(req.user._id)) {
    res.status(401).json({ message: 'Unauthorized' })
    return
  }
  if (!body.documentType || !body.documentNumber) {
    res.status(400).json({ message: 'Document type and number are required' })
    return
  }
  if (body.documentType === 'cnic' && !cnicPattern.test(body.documentNumber.trim())) {
    res.status(400).json({ message: 'CNIC must use the format XXXXX-XXXXXXX-X' })
    return
  }
  const kyc = await Kyc.findOneAndUpdate(
    { user: req.user._id },
    {
      user: new mongoose.Types.ObjectId(req.user._id),
      documentType: body.documentType,
      documentNumber: body.documentNumber.trim(),
      documentFront: body.documentFront,
      documentBack: body.documentBack,
      selfie: body.selfie,
      status: 'pending_review',
      rejectionReason: undefined,
      reviewedBy: undefined,
      reviewedAt: undefined,
    },
    { upsert: true, new: true, runValidators: true },
  )
  res.status(201).json(kyc)
}

export const getMine = async (req: Request, res: Response) => {
  if (!req.user?._id) {
    res.status(401).json({ message: 'Unauthorized' })
    return
  }
  res.json(await Kyc.findOne({ user: req.user._id }).lean())
}

export const getDocument = async (req: Request, res: Response) => {
  const id = String(req.params.id)
  const field = String(req.params.field)
  if (!helper.isValidObjectId(id) || !['documentFront', 'documentBack', 'selfie'].includes(field)) {
    res.status(400).json({ message: 'Invalid document request' })
    return
  }
  const kyc = await Kyc.findById(id).lean()
  const relative = (kyc as any)?.[field]
  if (!kyc || typeof relative !== 'string') {
    res.status(404).json({ message: 'Document not found' })
    return
  }
  const privateRoot = path.resolve(path.dirname(env.CDN_ROOT), 'private')
  const filePath = path.resolve(privateRoot, relative.replace(/^private[\\/]/, ''))
  if (!filePath.startsWith(privateRoot + path.sep)) {
    res.status(400).json({ message: 'Invalid document path' })
    return
  }
  res.sendFile(filePath)
}

export const getPending = async (_req: Request, res: Response) => {
  res.json(await Kyc.find({ status: 'pending_review' }).populate('user', 'fullName email phone').sort({ createdAt: -1 }).lean())
}

export const review = async (req: Request, res: Response) => {
  const id = String(req.params.id)
  if (!helper.isValidObjectId(id)) {
    res.status(400).json({ message: 'Invalid KYC ID' })
    return
  }
  const status = String(req.body?.status || '')
  if (!['approved', 'rejected', 'suspended'].includes(status)) {
    res.status(400).json({ message: 'Status must be approved, rejected, or suspended' })
    return
  }
  const kyc = await Kyc.findByIdAndUpdate(id, {
    status,
    rejectionReason: status === 'rejected' ? String(req.body?.rejectionReason || 'Rejected by reviewer').slice(0, 1000) : undefined,
    reviewedBy: req.user?._id,
    reviewedAt: new Date(),
  }, { new: true, runValidators: true })
  if (!kyc) {
    res.status(404).json({ message: 'KYC record not found' })
    return
  }
  if (status === 'suspended') {
    await User.findByIdAndUpdate(kyc.user, { blacklisted: true })
  }
  if (status === 'approved') {
    await User.findByIdAndUpdate(kyc.user, {
      verified: true,
      active: true,
      kycStatus: bookcarsTypes.KycStatus.Verified,
      cnicNumber: kyc.documentType === 'cnic' ? kyc.documentNumber : undefined,
    })
  } else if (status === 'rejected') {
    await User.findByIdAndUpdate(kyc.user, { kycStatus: bookcarsTypes.KycStatus.Rejected })
  } else if (status === 'suspended') {
    await User.findByIdAndUpdate(kyc.user, { kycStatus: bookcarsTypes.KycStatus.Pending, blacklisted: true })
  }
  res.json(kyc)
}
