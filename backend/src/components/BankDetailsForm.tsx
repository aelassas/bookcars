import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button, FormControl, FormControlLabel, Input, InputLabel, Paper, Switch } from '@mui/material'
import * as bookcarsTypes from ':bookcars-types'
import { strings as commonStrings } from '@/lang/common'
import { strings as settingsStrings } from '@/lang/settings'
import { strings } from '@/lang/bank-details-form'
import * as BankDetailsService from '@/services/BankDetailsService'
import * as helper from '@/common/helper'

const schema = z.object({
    accountHolder: z.string(),
    bankName: z.string(),
    iban: z.string(),
    swiftBic: z.string(),
    showBankDetailsPage: z.boolean(),
})

type FormFields = z.infer<typeof schema>

interface BankDetailsFormProps {
    bankDetails: bookcarsTypes.BankDetails | null
    onSubmit: (data: bookcarsTypes.BankDetails) => void
}

const BankDetailsForm = ({ bankDetails, onSubmit: onFormSubmit }: BankDetailsFormProps) => {
    const navigate = useNavigate()

    const { register, handleSubmit, formState: { isSubmitting }, setValue, watch } = useForm<FormFields>({
        resolver: zodResolver(schema),
        mode: 'onSubmit'
    })

    useEffect(() => {
        if (bankDetails) {
            setValue('accountHolder', bankDetails.accountHolder)
            setValue('bankName', bankDetails.bankName)
            setValue('iban', bankDetails.iban)
            setValue('swiftBic', bankDetails.swiftBic)
            setValue('showBankDetailsPage', bankDetails.showBankDetailsPage)
        }
    }, [bankDetails, setValue])

    const onSubmit = async (data: FormFields) => {
        try {
            const payload: bookcarsTypes.UpsertBankDetailsPayload = {
                _id: bankDetails?._id,
                accountHolder: data.accountHolder,
                bankName: data.bankName,
                iban: data.iban,
                swiftBic: data.swiftBic,
                showBankDetailsPage: data.showBankDetailsPage,
            }

            const { status, data: res } = await BankDetailsService.upsertBankDetails(payload)

            if (status === 200) {
                if (onFormSubmit) {
                    onFormSubmit(res)
                }
                helper.info(settingsStrings.SETTINGS_UPDATED)
            } else {
                helper.error()
            }
        } catch (err) {
            helper.error(err)
        }
    }

    return (
        <Paper className="settings-form settings-form-wrapper" elevation={10}>
            <form onSubmit={handleSubmit(onSubmit)}>
                <h1 className="settings-form-title">{strings.BANK_DETAILS}</h1>

                <FormControl fullWidth margin="dense">
                    <InputLabel className="required">{strings.ACCOUNT_HOLDER}</InputLabel>
                    <Input {...register('accountHolder')} type="text" required autoComplete="off" />
                </FormControl>

                <FormControl fullWidth margin="dense">
                    <InputLabel className="required">{strings.BANK_NAME}</InputLabel>
                    <Input {...register('bankName')} type="text" required autoComplete="off" />
                </FormControl>

                <FormControl fullWidth margin="dense">
                    <InputLabel className="required">{strings.IBAN}</InputLabel>
                    <Input {...register('iban')} type="text" required autoComplete="off" />
                </FormControl>

                <FormControl fullWidth margin="dense">
                    <InputLabel className="required">{strings.SWIFT_BIC}</InputLabel>
                    <Input {...register('swiftBic')} type="text" required autoComplete="off" />
                </FormControl>

                <FormControl component="fieldset">
                    <FormControlLabel
                        control={(
                            <Switch
                                checked={watch('showBankDetailsPage') ?? false}
                                onChange={(e) => setValue('showBankDetailsPage', e.target.checked)}
                            />
                        )}
                        label={strings.SHOW_BANK_DETAILS_PAGE}
                    />
                </FormControl>

                <div className="buttons">
                    <Button type="submit" variant="contained" className="btn-primary btn-margin-bottom" size="small" disabled={isSubmitting}>
                        {commonStrings.SAVE}
                    </Button>
                    <Button variant="contained" className="btn-secondary btn-margin-bottom" size="small" onClick={() => navigate('/')}>
                        {commonStrings.CANCEL}
                    </Button>
                </div>
            </form>
        </Paper>
    )
}

export default BankDetailsForm
