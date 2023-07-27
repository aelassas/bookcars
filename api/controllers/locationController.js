import Env from '../config/env.config.js'
import strings from '../config/app.config.js'
import Location from '../models/Location.js'
import LocationValue from '../models/LocationValue.js'
import Car from '../models/Car.js'
import escapeStringRegexp from 'escape-string-regexp'
import mongoose from 'mongoose'

export const validate = async (req, res) => {
    const { language, name } = req.body

    try {
        const keyword = escapeStringRegexp(name)
        const options = 'i'

        const locationValue = await LocationValue.findOne({ language: { $eq: language }, value: { $regex: new RegExp(`^${keyword}$`), $options: options } })
        return locationValue ? res.sendStatus(204) : res.sendStatus(200)
    } catch (err) {
        console.error(`[location.validate]  ${strings.DB_ERROR} ${name}`, err)
        return res.status(400).send(strings.DB_ERROR + err)
    }
}

export const create = async (req, res) => {
    const names = req.body

    try {
        const values = []
        for (let i = 0; i < names.length; i++) {
            const name = names[i]
            const locationValue = new LocationValue({
                language: name.language,
                value: name.name
            })
            await locationValue.save()
            values.push(locationValue._id)
        }

        const location = new Location({ values })
        await location.save()
        return res.sendStatus(200)
    } catch (err) {
        console.error(`[location.create] ${strings.DB_ERROR} ${req.body}`, err)
        return res.status(400).send(strings.DB_ERROR + err)
    }
}

export const update = async (req, res) => {
    const { id } = req.params

    try {
        const location = await Location.findById(id).populate('values')

        if (location) {
            const names = req.body
            for (let i = 0; i < names.length; i++) {
                const name = names[i]
                const locationValue = location.values.filter(value => value.language === name.language)[0]
                if (locationValue) {
                    locationValue.value = name.name
                    await locationValue.save()
                } else {
                    const locationValue = new LocationValue({
                        language: name.language,
                        value: name.name
                    })
                    await locationValue.save()
                    location.values.push(locationValue._id)
                    await location.save()
                }
            }
            return res.sendStatus(200)
        } else {
            console.error('[location.update] Location not found:', id)
            return res.sendStatus(204)
        }

    } catch (err) {
        console.error(`[location.update] ${strings.DB_ERROR} ${req.body}`, err)
        return res.status(400).send(strings.DB_ERROR + err)
    }
}

export const deleteLocation = async (req, res) => {
    const { id } = req.params

    try {
        const location = await Location.findByIdAndDelete(id)
        await LocationValue.deleteMany({ _id: { $in: location.values } })
        return res.sendStatus(200)
    } catch (err) {
        console.error(`[location.delete] ${strings.DB_ERROR} ${id}`, err)
        return res.status(400).send(strings.DB_ERROR + err)
    }
}

export const getLocation = async (req, res) => {
    const { id } = req.params

    try {
        const location = await Location.findById(id)
            .populate('values')
            .lean()

        if (location) {
            location.name = location.values.filter(value => value.language === req.params.language)[0].value
            return res.json(location)
        } else {
            console.error('[location.getLocation] Location not found:', id)
            return res.sendStatus(204)
        }
    } catch (err) {
        console.error(`[location.delete] ${strings.DB_ERROR} ${id}`, err)
        return res.status(400).send(strings.DB_ERROR + err)
    }
}

export const getLocations = async (req, res) => {
    try {
        const page = parseInt(req.params.page)
        const size = parseInt(req.params.size)
        const language = req.params.language
        const keyword = escapeStringRegexp(req.query.s || '')
        const options = 'i'

        const locations = await Location.aggregate([
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
                                    { $expr: { $regexMatch: { input: '$value', regex: keyword, options } } }
                                ]
                            }
                        }
                    ],
                    as: 'value'
                }
            },
            { $unwind: { path: '$value', preserveNullAndEmptyArrays: false } },
            { $addFields: { name: '$value.value' } },
            {
                $facet: {
                    resultData: [
                        { $sort: { name: 1 } },
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

        return res.json(locations)
    } catch (err) {
        console.error(`[location.getLocations] ${strings.DB_ERROR} ${req.query.s}`, err)
        return res.status(400).send(strings.DB_ERROR + err)
    }
}

export const checkLocation = async (req, res) => {
    const { id } = req.params

    try {
        const _id = new mongoose.Types.ObjectId(id)

        const count = await Car.find({ locations: _id })
            .limit(1)
            .count()

        if (count === 1) {
            return res.sendStatus(200)
        }
        
        return res.sendStatus(204)
    } catch (err) {
        console.error(`[location.checkLocation] ${strings.DB_ERROR} ${id}`, err)
        return res.status(400).send(strings.DB_ERROR + err)
    }
}
