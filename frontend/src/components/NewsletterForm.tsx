import React from 'react'
import {
  Button,
  FormControl,
  FormHelperText,
  InputLabel,
  OutlinedInput,
  CircularProgress,
} from '@mui/material'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as bookcarsTypes from ':bookcars-types'
import env from '@/config/env.config'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/newsletter-form'
import * as helper from '@/common/helper'
import * as UserService from '@/services/UserService'
import { useRecaptchaContext, RecaptchaContextType } from '@/context/RecaptchaContext'
import { schema, FormFields } from '@/models/NewsletterForm'

import '@/assets/css/newsletter-form.css'

const NewsletterForm = () => {
  const { reCaptchaLoaded, generateReCaptchaToken } = useRecaptchaContext() as RecaptchaContextType

  const { register, handleSubmit, reset, formState: { errors, isSubmitting }, clearErrors } = useForm<FormFields>({
    resolver: zodResolver(schema),
    mode: 'onSubmit'
  })

  const onSubmit = async ({ email }: FormFields) => {
    try {
      let recaptchaToken = ''
      if (reCaptchaLoaded) {
        recaptchaToken = await generateReCaptchaToken()
        if (!(await helper.verifyReCaptcha(recaptchaToken))) {
          recaptchaToken = ''
        }
      }

      if (env.RECAPTCHA_ENABLED && !recaptchaToken) {
        helper.error('reCAPTCHA error')
        return
      }

      const payload: bookcarsTypes.SendEmailPayload = {
        from: email,
        to: env.CONTACT_EMAIL,
        subject: 'New Newsletter Subscription',
        message: '',
        isContactForm: false,
      }
      const status = await UserService.sendEmail(payload)

      if (status === 200) {
        reset()
        helper.info(strings.SUCCESS)
      } else {
        helper.error()
      }
    } catch (err) {
      helper.error(err)
    }
  }

  return (
    <form className="newsletter-form" onSubmit={handleSubmit(onSubmit)}>
      <h1>{strings.TITLE}</h1>
      <p>{strings.SUB_TITLE}</p>

      <div className="form">
        <FormControl fullWidth margin="normal" size="small" className="input" error={!!errors.email}>
          <InputLabel className="required">{commonStrings.EMAIL}</InputLabel>
          <OutlinedInput
            type="text"
            {...register('email')}
            label={commonStrings.EMAIL}
            size="small"
            required
            autoComplete="off"
            inputProps={{
              'aria-label': 'email',
            }}
            onChange={() => {
              if (errors.email) {
                clearErrors('email')
              }
            }}
          />
          <FormHelperText error={!!errors.email}>{errors.email?.message || ''}</FormHelperText>
        </FormControl>

        <Button type="submit" variant="contained" className="btn-primary btn" aria-label="Subscribe" disabled={isSubmitting}>
          {
            isSubmitting
              ? <CircularProgress color="inherit" size={24} />
              : strings.SUBSCRIBE
          }
        </Button>
      </div>
    </form>
  )
}

export default NewsletterForm
