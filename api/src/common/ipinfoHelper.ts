import { Request } from 'express'
import axios from 'axios'
import * as env from '../config/env.config'
import * as logger from './logger'

const DEFAULT_COUNTRY = env.IPINFO_DEFAULT_COUNTRY

/**
 * Returns client IP/
 *
 * @param {Request} req
 * @returns {string}
 */
export const getClientIp = (req: Request): string => {
  const forwarded = req.headers['x-forwarded-for'] as string
  let ip = ''

  if (forwarded) {
    ip = forwarded.split(',')[0].trim() // First IP in the list (original client IP)
  } else {
    ip = req.socket.remoteAddress || '' // Fallback to remote address
  }

  // Normalize IPv6-mapped IPv4 addresses
  return ip.startsWith('::ffff:') ? ip.substring(7) : ip
}

/**
 * Return ISO 2 country code from IP.
 *
 * @async
 * @param {string} ip
 * @returns {Promise<string | null>}
 */
export const getCountryCode = async (ip: string): Promise<string> => {
  let ipinfoURI = `https://ipinfo.io/${ip}/json`
  if (env.IPINFO_API_KEY && env.IPINFO_API_KEY !== 'IPINFO_API_KEY') {
    ipinfoURI = `https://ipinfo.io/${ip}/json?token=${env.IPINFO_API_KEY}`
  }
  try {
    const response = await axios.get(ipinfoURI)
    return (response.data.country as string || DEFAULT_COUNTRY).toUpperCase()
  } catch (error) {
    logger.error('Error fetching country code:', error)
    return DEFAULT_COUNTRY
  }
}
