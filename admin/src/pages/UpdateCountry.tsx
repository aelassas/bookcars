import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Input,
  InputLabel,
  FormControl,
  FormHelperText,
  Button,
  Paper,
  FormLabel
} from '@mui/material'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import Layout from '@/components/Layout'
import { strings as commonStrings } from '@/lang/common'
import { strings as clStrings } from '@/lang/create-country'
import { strings as suppliersStrings } from '@/lang/suppliers'
import { strings } from '@/lang/update-country'
import * as CountryService from '@/services/CountryService'
import NoMatch from './NoMatch'
import Error from './Error'
import Backdrop from '@/components/SimpleBackdrop'
import * as helper from '@/utils/helper'
import env from '@/config/env.config'
import SupplierBadge from '@/components/SupplierBadge'
import { schema, FormFields } from '@/models/CountryForm'

import '@/assets/css/update-country.css'

const UpdateCountry = () => {
  const navigate = useNavigate()

  const [user, setUser] = useState<bookcarsTypes.User>()
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [noMatch, setNoMatch] = useState(false)
  const [error, setError] = useState(false)
  const [country, setCountry] = useState<bookcarsTypes.Country>()
  const [originalNames, setOriginalNames] = useState<bookcarsTypes.CountryName[]>([])
  const [nameChanged, setNameChanged] = useState(false)

  // Initialize React Hook Form
  const {
    control,
    handleSubmit,
    register,
    reset,
    setError: setFormError,
    formState: { errors, isSubmitting },
    setFocus,
  } = useForm<FormFields>({
    resolver: zodResolver(schema),
    mode: 'onSubmit',
    defaultValues: {
      names: [],
    },
  })

  // Watch all form values for changes
  const watchedNames = useWatch({
    control,
    name: 'names',
  })

  // Check if names have changed compared to original values
  useEffect(() => {
    if (watchedNames && originalNames.length > 0) {
      let changed = false

      for (let i = 0; i < watchedNames.length; i++) {
        if (watchedNames[i].name !== originalNames[i].name) {
          changed = true
          break
        }
      }

      setNameChanged(changed)
    }
  }, [watchedNames, originalNames])

  const _error = () => {
    setLoading(false)
    helper.error()
  }

  const onSubmit = async (data: FormFields) => {
    try {
      if (!country) {
        helper.error()
        return
      }

      if (!nameChanged) {
        return
      }

      let isValid = true
      const validationPromises = data.names.map((name, index) => {
        // Only validate if the name has changed
        if (name.name !== originalNames[index].name) {
          return CountryService.validate(name).then((status) => {
            if (status !== 200) {
              setFormError(`names.${index}.name`, {
                type: 'manual',
                message: clStrings.INVALID_COUNTRY
              })
              setFocus(`names.${index}.name`)
              isValid = false
            }
            return status === 200
          })
        }
        return Promise.resolve(true)
      })

      await Promise.all(validationPromises)

      if (isValid) {
        const status = await CountryService.update(country._id, data.names)

        if (status === 200) {
          const _country = bookcarsHelper.clone(country) as bookcarsTypes.Country
          if (_country.values) {
            for (let i = 0; i < data.names.length; i += 1) {
              _country.values[i].value = data.names[i].name
            }
          }

          setCountry(_country)
          setOriginalNames(bookcarsHelper.clone(data.names) as bookcarsTypes.LocationName[])
          helper.info(strings.COUNTRY_UPDATED)
        } else {
          _error()
        }
      }
    } catch (err) {
      helper.error(err)
    }
  }

  const onLoad = async (_user?: bookcarsTypes.User) => {
    if (_user && _user.verified) {
      setLoading(true)
      setUser(_user)

      const params = new URLSearchParams(window.location.search)
      if (params.has('loc')) {
        const id = params.get('loc')
        if (id && id !== '') {
          try {
            const _country = await CountryService.getCountry(id)

            if (!helper.admin(_user) && _user._id !== _country.supplier?._id) {
              setLoading(false)
              setNoMatch(true)
              return
            }

            if (_country && _country.values) {
              env._LANGUAGES.forEach((lang) => {
                if (_country.values && !_country.values.some((value) => value.language === lang.code)) {
                  _country.values.push({ language: lang.code, value: '' })
                }
              })

              const _names: bookcarsTypes.CountryName[] = _country.values.map((value) => ({
                language: value.language || '',
                name: value.value || '',
              }))

              setCountry(_country)
              setOriginalNames(_names)

              // Reset form with the loaded country data
              reset({ names: _names })

              setVisible(true)
              setLoading(false)
            } else {
              setLoading(false)
              setNoMatch(true)
            }
          } catch (err) {
            helper.error(err)
            setLoading(false)
            setError(true)
            setVisible(false)
          }
        } else {
          setLoading(false)
          setNoMatch(true)
        }
      } else {
        setLoading(false)
        setNoMatch(true)
      }
    }
  }

  return (
    <Layout onLoad={onLoad} strict>
      {!error && !noMatch && country && country.values && (
        <div className="update-country">
          <Paper className="country-form country-form-wrapper" elevation={10} style={visible ? {} : { display: 'none' }}>
            <h1 className="country-form-title">{strings.UPDATE_COUNTRY}</h1>
            <form onSubmit={handleSubmit(onSubmit)}>
              {helper.admin(user) && country.supplier && (
                <FormControl fullWidth margin="dense">
                  <FormLabel>{suppliersStrings.SUPPLIER}</FormLabel>
                  <SupplierBadge supplier={country.supplier} />
                </FormControl>
              )}
              {country.values.map((value, index) => (
                <FormControl key={value.language} fullWidth margin="dense">
                  <InputLabel className="required">{`${commonStrings.NAME} (${env._LANGUAGES.filter((l) => l.code === value.language)[0].label})`}</InputLabel>
                  <Input
                    type="text"
                    error={!!errors.names?.[index]?.name}
                    required
                    {...register(`names.${index}.name`)}
                    autoComplete="off"
                  />
                  <FormHelperText error={!!errors.names?.[index]?.name}>
                    {errors.names?.[index]?.name?.message || ''}
                  </FormHelperText>
                </FormControl>
              ))}

              <div className="buttons">
                <Button
                  type="submit"
                  variant="contained"
                  className="btn-primary btn-margin-bottom"
                  size="small"
                  disabled={!nameChanged || isSubmitting}
                >
                  {commonStrings.SAVE}
                </Button>
                <Button
                  variant="contained"
                  className="btn-secondary btn-margin-bottom"
                  size="small"
                  onClick={() => navigate('/countries')}
                >
                  {commonStrings.CANCEL}
                </Button>
              </div>
            </form>
          </Paper>
        </div>
      )}
      {loading && <Backdrop text={commonStrings.PLEASE_WAIT} />}
      {error && <Error />}
      {noMatch && <NoMatch hideHeader />}
    </Layout>
  )
}

export default UpdateCountry
