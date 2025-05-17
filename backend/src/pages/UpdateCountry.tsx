import React, { useState } from 'react'
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
import * as helper from '@/common/helper'
import env from '@/config/env.config'
import SupplierBadge from '@/components/SupplierBadge'

import '@/assets/css/update-country.css'

const UpdateCountry = () => {
  const navigate = useNavigate()

  const [user, setUser] = useState<bookcarsTypes.User>()
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [names, setNames] = useState<bookcarsTypes.CountryName[]>([])
  const [nameErrors, setNameErrors] = useState<boolean[]>([])
  const [noMatch, setNoMatch] = useState(false)
  const [error, setError] = useState(false)
  const [country, setCountry] = useState<bookcarsTypes.Country>()
  const [nameChanged, setNameChanged] = useState(false)

  const _error = () => {
    setLoading(false)
    helper.error()
  }

  const checkName = () => {
    let _nameChanged = false

    if (!country || !country.values) {
      helper.error()
      return _nameChanged
    }

    for (let i = 0; i < names.length; i += 1) {
      const name = names[i]
      if (name.name !== country.values[i].value) {
        _nameChanged = true
        break
      }
    }

    setNameChanged(_nameChanged)
    return _nameChanged
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    try {
      if (!country || !country.values) {
        helper.error()
        return
      }

      const _nameChanged = checkName()

      if (!_nameChanged) {
        return
      }

      let isValid = true

      const _nameErrors = bookcarsHelper.clone(nameErrors) as boolean[]
      for (let i = 0; i < nameErrors.length; i += 1) {
        _nameErrors[i] = false
      }

      for (let i = 0; i < names.length; i += 1) {
        const name = names[i]
        if (name.name !== country.values[i].value) {
          const _isValid = (await CountryService.validate(name)) === 200
          isValid = isValid && _isValid
          if (!_isValid) {
            _nameErrors[i] = true
          }
        }
      }

      setNameErrors(_nameErrors)

      if (isValid) {
        const status = await CountryService.update(country._id, names)

        if (status === 200) {
          const _country = bookcarsHelper.clone(country) as bookcarsTypes.Country
          for (let i = 0; i < names.length; i += 1) {
            const name = names[i]
            _country.values![i].value = name.name
          }

          setCountry(_country)
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
              setNames(_names)
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
            <form onSubmit={handleSubmit}>
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
                    value={(names[index] && names[index].name) || ''}
                    error={nameErrors[index]}
                    required
                    onChange={(e) => {
                      const _names = bookcarsHelper.clone(names) as bookcarsTypes.CountryName[]
                      _names[index].name = e.target.value
                      const _nameErrors = bookcarsHelper.cloneArray(nameErrors) as boolean[]
                      _nameErrors[index] = false
                      checkName()
                      setNames(_names)
                      setNameErrors(_nameErrors)
                    }}
                    autoComplete="off"
                  />
                  <FormHelperText error={nameErrors[index]}>{(nameErrors[index] && clStrings.INVALID_COUNTRY) || ''}</FormHelperText>
                </FormControl>
              ))}

              <div className="buttons">
                <Button type="submit" variant="contained" className="btn-primary btn-margin-bottom" size="small" disabled={!nameChanged}>
                  {commonStrings.SAVE}
                </Button>
                <Button variant="contained" className="btn-secondary btn-margin-bottom" size="small" onClick={() => navigate('/countries')}>
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
