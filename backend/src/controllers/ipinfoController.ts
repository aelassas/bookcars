import { Request, Response } from 'express'
import * as ipinfoHelper from '../utils/ipinfoHelper'

/**
 * Returns ISO 2 country code from IP.
 *
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const getCountryCode = async (req: Request, res: Response) => {
  const clientIp = ipinfoHelper.getClientIp(req)
  const countryCode = await ipinfoHelper.getCountryCode(clientIp)
  res.json(countryCode)
}
