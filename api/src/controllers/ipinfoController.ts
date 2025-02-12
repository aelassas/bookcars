import { Request, Response } from 'express'
import i18n from '../lang/i18n'
import * as ipinfoHelper from '../common/ipinfoHelper'
import * as logger from '../common/logger'

/**
 * Returns ISO 2 country code from IP.
 *
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const getCountryCode = async (req: Request, res: Response) => {
  try {
    const clientIp = ipinfoHelper.getClientIp(req)
    const countryCode = await ipinfoHelper.getCountryCode(clientIp)
    return res.json(countryCode)
  } catch (err) {
    logger.error(`[paypal.createPayPalOrder] ${i18n.t('ERROR')}`, err)
    return res.status(400).send(i18n.t('ERROR') + err)
  }
}
