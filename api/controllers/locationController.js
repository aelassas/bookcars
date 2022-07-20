import Env from '../config/env.config.js';
import strings from '../config/app.config.js';
import Location from '../models/Location.js';
import LocationValue from '../models/LocationValue.js';
import Car from '../models/Car.js';
import escapeStringRegexp from 'escape-string-regexp';
import mongoose from 'mongoose';

export const validate = (req, res) => {
    const language = req.body.language;
    const keyword = escapeStringRegexp(req.body.name);
    const options = 'i';

    LocationValue.findOne({ language: { $eq: language }, value: { $regex: new RegExp(`^${keyword}$`), $options: options } })
        .then(locationValue => locationValue ? res.sendStatus(204) : res.sendStatus(200))
        .catch(err => {
            console.error(`[location.validate]  ${strings.DB_ERROR} ${req.body.name}`, err);
            res.status(400).send(strings.DB_ERROR + err);
        });
};

export const create = async (req, res) => {
    const names = req.body;

    try {
        const values = [];
        for (let i = 0; i < names.length; i++) {
            const name = names[i];
            const locationValue = new LocationValue({
                language: name.language,
                value: name.name
            });
            await locationValue.save();
            values.push(locationValue._id);
        }

        const location = new Location({ values });
        await location.save();
        return res.sendStatus(200);
    } catch (err) {
        console.error(`[location.create]  ${strings.DB_ERROR} ${req.body}`, err);
        res.status(400).send(strings.DB_ERROR + err);
    }
};

export const update = (req, res) => {
    Location.findById(req.params.id)
        .populate('values')
        .then(async location => {
            if (location) {
                const names = req.body;
                for (let i = 0; i < names.length; i++) {
                    const name = names[i];
                    const locationValue = location.values.filter(value => value.language === name.language)[0];
                    if (locationValue) {
                        locationValue.value = name.name;
                        await locationValue.save();
                    } else {
                        const locationValue = new LocationValue({
                            language: name.language,
                            value: name.name
                        });
                        await locationValue.save();
                        location.values.push(locationValue._id);
                        await location.save();
                    }
                }
                return res.sendStatus(200);
            } else {
                console.error('[location.update] Location not found:', req.body);
                res.sendStatus(204);
            }
        })
        .catch(err => {
            console.error(`[location.update]  ${strings.DB_ERROR} ${req.body}`, err);
            res.status(400).send(strings.DB_ERROR + err);
        });
};

export const deleteLocation = (req, res) => {
    const id = req.params.id;

    Location.findByIdAndDelete(id, async (err, location) => {
        if (err) {
            console.error(`[location.delete]  ${strings.DB_ERROR} ${req.params.id}`, err);
            res.status(400).send(strings.DB_ERROR + err);
        } else {
            try {
                await LocationValue.deleteMany({ _id: { $in: location.values } });
                res.sendStatus(200);
            } catch (err) {
                console.error(`[location.delete]  ${strings.DB_ERROR} ${req.params.id}`, err);
                res.status(400).send(strings.DB_ERROR + err);
            }
        }
    });
};

export const getLocation = async (req, res) => {
    Location.findById(req.params.id)
        .populate('values')
        .lean()
        .then(location => {
            if (location) {
                location.name = location.values.filter(value => value.language === req.params.language)[0].value;
                res.json(location);
            } else {
                console.error('[location.getLocation] Location not found:', req.params.id);
                res.sendStatus(204);
            }
        })
        .catch(err => {
            console.error(`[location.getLocation]  ${strings.DB_ERROR} ${req.params.id}`, err);
            res.status(400).send(strings.DB_ERROR + err);
        });
};

export const getLocations = async (req, res) => {
    try {
        const page = parseInt(req.params.page);
        const size = parseInt(req.params.size);
        const language = req.params.language;
        const keyword = escapeStringRegexp(req.query.s || '');
        const options = 'i';

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
        ], { collation: { locale: Env.DEFAULT_LANGUAGE, strength: 2 } });

        res.json(locations);
    } catch (err) {
        console.error(`[location.getLocations]  ${strings.DB_ERROR} ${req.query.s}`, err);
        res.status(400).send(strings.DB_ERROR + err);
    }
};

export const checkLocation = (req, res) => {
    const id = mongoose.Types.ObjectId(req.params.id);

    Car.find({ locations: id })
        .limit(1)
        .count()
        .then(count => {
            if (count === 1) {
                return res.sendStatus(200);
            }
            return res.sendStatus(204);
        })
        .catch(err => {
            console.error(`[location.checkLocation]  ${strings.DB_ERROR} ${id}`, err);
            res.status(400).send(strings.DB_ERROR + err);
        });
};