import { Request, Response } from 'express'
import * as bookcarsTypes from ':bookcars-types'
import * as logger from '../utils/logger'
import i18n from '../lang/i18n'
import Setting from '../models/Setting'

/**
 * Initialize settings.
 *
 * @async
 * @returns {Promise<boolean>}
 */
export const init = async () => {
  try {
    const count = await Setting.findOne({}).countDocuments()

    if (count === 0) {
      await new Setting().save()
    }

    return true
  } catch (err) {
    logger.error(`[setting.init] ${i18n.t('DB_ERROR')}`, err)
    return false
  }
}

/**
 * Get settings.
 *
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const getSettings = async (req: Request, res: Response) => {
  try {
    const settings = await Setting.findOne({})

    res.json(settings)
  } catch (err) {
    logger.error(`[setting.getSettings] ${i18n.t('DB_ERROR')}`, err)
    res.status(400).send(i18n.t('DB_ERROR') + err)
  }
}

/**
 * Update settings.
 *
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const updateSettings = async (req: Request, res: Response) => {
  try {
    const {
      minPickupHours,
      minRentalHours,
      minPickupDropoffHour,
      maxPickupDropoffHour,
    }: bookcarsTypes.UpdateSettingsPayload = req.body
    const settings = await Setting.findOne({})

    if (settings) {
      settings.minPickupHours = minPickupHours
      settings.minRentalHours = minRentalHours
      settings.minPickupDropoffHour = minPickupDropoffHour
      settings.maxPickupDropoffHour = maxPickupDropoffHour

      await settings.save()

      res.json(settings)
      return
    }

    res.sendStatus(204)
  } catch (err) {
    logger.error(`[setting.updateSettings] ${i18n.t('DB_ERROR')}`, err)
    res.status(400).send(i18n.t('DB_ERROR') + err)
  }
}
