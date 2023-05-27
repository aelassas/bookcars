import strings from '../config/app.config'
import Env from '../config/env.config'
import User from '../models/User'
import Notification from '../models/Notification'
import AdditionalDriver from '../models/AdditionalDriver'
import Booking from '../models/Booking'
import Car from '../models/Car'
import escapeStringRegexp from 'escape-string-regexp'
import path from 'path'
import mongoose from 'mongoose'
import { Request, Response } from 'express';

export const validate = (req: Request, res: Response) => {
    const keyword = escapeStringRegexp(req.body.fullName)
    const options = 'i'
    User.findOne({ type: Env.USER_TYPE.COMPANY, fullName: { $regex: new RegExp(`^${keyword}$`), $options: options } })
        .then(user => user ? res.sendStatus(204) : res.sendStatus(200))
        .catch(err => {
            console.error('[company.validateEmail] ' + strings.DB_ERROR + ' ' + req.body.fullName, err)
            res.status(400).send(strings.DB_ERROR + err)
        })
}

export const update = (req: Request, res: Response) => {
    User.findById(req.body._id)
        .then(company => {
            if (company) {
                const { fullName, phone, location, bio, payLater } = req.body
                company.fullName = fullName
                company.phone = phone
                company.location = location
                company.bio = bio
                company.payLater = payLater

                company.save()
                    .then(() => res.sendStatus(200))
                    .catch(err => {
                        console.error(strings.DB_ERROR, err)
                        res.status(400).send(strings.DB_ERROR + err)
                    })
            } else {
                console.error('[company.update] Location not found:', req.body)
                res.sendStatus(204)
            }
        })
        .catch(err => {
            console.error(strings.DB_ERROR, err)
            res.status(400).send(strings.DB_ERROR + err)
        })
}

export const deleteCompany = async (req: Request, res: Response) => {
    const id = req.params.id

    try {
        const company = await User.findByIdAndDelete(id)
        if (company) {
            if (company.avatar) {
                await Notification.deleteMany({ user: id })
                const _additionalDrivers = await Booking.find({ company: id, _additionalDriver: { $ne: null } }, { _additionalDriver: 1 })
                const additionalDrivers = _additionalDrivers.map(b => new mongoose.Types.ObjectId(b._additionalDriver))
                await AdditionalDriver.deleteMany({ _id: { $in: additionalDrivers } })
                await Booking.deleteMany({ company: id })
                await Car.deleteMany({ company: id })
            }
        } else {
            return res.sendStatus(404)
        }
        return res.sendStatus(200)
    } catch (err) {
        console.error(`[company.delete]  ${strings.DB_ERROR} ${id}`, err)
        return res.status(400).send(strings.DB_ERROR + err)
    }
}

export const getCompany = (req: Request, res: Response) => {
    User.findById(req.params.id)
        .lean()
        .then(user => {
            if (!user) {
                console.error('[company.getCompany] Company not found:', req.params)
                res.sendStatus(204)
            } else {
                const { _id, email, fullName, avatar, phone, location, bio, payLater } = user
                res.json({ _id, email, fullName, avatar, phone, location, bio, payLater })
            }
        })
        .catch(err => {
            console.error(strings.DB_ERROR, err)
            res.status(400).send(strings.DB_ERROR + err)
        })
}

export const getCompanies = async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.params.page)
        const size = parseInt(req.params.size)
        const keyword = escapeStringRegexp(String(req.query.s) || '')
        const options = 'i'

        const data = await User.aggregate([
            { $match: { type: Env.USER_TYPE.COMPANY, fullName: { $regex: keyword, $options: options } } },
            {
                $facet: {
                    resultData: [
                        { $sort: { fullName: 1 } },
                        { $skip: ((page - 1) * size) },
                        { $limit: size },
                    ],
                    pageInfo: [
                        {
                            $count: 'totalRecords'
                        }
                    ]
                }
            }
        ], { collation: { locale: Env.DEFAULT_LANGUAGE, strength: 2 } })

        if (data.length > 0) {
            //@ts-ignore
            data[0].resultData = data[0].resultData.map(company => {
                const { _id, fullName, avatar } = company
                return { _id, fullName, avatar }
            })
        }

        res.json(data)
    } catch (err) {
        console.error(`[company.getCompanies] ${strings.DB_ERROR} ${req.query.s}`, err)
        res.status(400).send(strings.DB_ERROR + err)
    }
}

export const getAllCompanies = async (req: Request, res: Response) => {
    try {
        let data = await User.aggregate([
            { $match: { type: Env.USER_TYPE.COMPANY } },
            { $sort: { fullName: 1 } }
        ], { collation: { locale: Env.DEFAULT_LANGUAGE, strength: 2 } })

        if (data.length > 0) {
            data = data.map(company => {
                const { _id, fullName, avatar } = company
                return { _id, fullName, avatar }
            })
        }

        res.json(data)
    } catch (err) {
        console.error(`[company.getAllCompanies] ${strings.DB_ERROR} ${req.query.s}`, err)
        res.status(400).send(strings.DB_ERROR + err)
    }
}
