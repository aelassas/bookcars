import { Request, Response } from 'express'
import * as bookcarsTypes from ':bookcars-types'
import * as env from '../config/env.config'
import * as logger from '../common/logger'
import i18n from '../lang/i18n'
import BankDetails from '../models/BankDetails'

/**
 * Upsert BankDetails.
 *
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const upsert = async (req: Request, res: Response) => {
  const { body }: { body: bookcarsTypes.UpsertBankDetailsPayload } = req
  try {
    let bankDetails: env.BankDetails | null = null
    if (body._id) {
      bankDetails = await BankDetails.findById(body._id)
    }

    const {
      accountHolder,
      bankName,
      iban,
      swiftBic,
      showBankDetailsPage,
    } = body

    if (bankDetails) {
      bankDetails.accountHolder = accountHolder
      bankDetails.bankName = bankName
      bankDetails.iban = iban
      bankDetails.swiftBic = swiftBic
      bankDetails.showBankDetailsPage = showBankDetailsPage
    } else {
      await BankDetails.deleteMany()
      bankDetails = new BankDetails({
        accountHolder,
        bankName,
        iban,
        swiftBic,
        showBankDetailsPage,
      })
    }
    await bankDetails.save()

    return res.json(bankDetails)
  } catch (err) {
    logger.error(`[bankDetails.upsert] ${i18n.t('DB_ERROR')} ${JSON.stringify(body)}`, err)
    return res.status(400).send(i18n.t('ERROR') + err)
  }
}

/**
 * Get BankDetails.
 *
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const get = async (req: Request, res: Response) => {
  try {
    const bankDetails = await BankDetails.findOne()
    return res.json(bankDetails)
  } catch (err) {
    logger.error(`[bankDetails.get] ${i18n.t('DB_ERROR')}`, err)
    return res.status(400).send(i18n.t('ERROR') + err)
  }
}
