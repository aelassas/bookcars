import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Input,
  InputLabel,
  FormControl,
  FormHelperText,
  Button,
  Paper
} from '@mui/material'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import Layout from '@/components/Layout'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/create-country'
import * as CountryService from '@/services/CountryService'
import * as helper from '@/common/helper'
import env from '@/config/env.config'

import '@/assets/css/create-country.css'

const CreateCountry = () => {
  const navigate = useNavigate()

  const [visible, setVisible] = useState(false)
  const [names, setNames] = useState<bookcarsTypes.CountryName[]>([])
  const [nameErrors, setNameErrors] = useState<boolean[]>([])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    try {
      let isValid = true

      const _nameErrors = bookcarsHelper.clone(nameErrors) as boolean[]
      for (let i = 0; i < nameErrors.length; i += 1) {
        _nameErrors[i] = false
      }

      for (let i = 0; i < names.length; i += 1) {
        const name = names[i]
        const _isValid = (await CountryService.validate(name)) === 200
        isValid = isValid && _isValid
        if (!_isValid) {
          _nameErrors[i] = true
        }
      }

      setNameErrors(_nameErrors)

      if (isValid) {
        const status = await CountryService.create(names)

        if (status === 200) {
          const _names = bookcarsHelper.clone(names) as bookcarsTypes.CountryName[]
          for (let i = 0; i < names.length; i += 1) {
            _names[i].name = ''
          }
          setNames(_names)
          helper.info(strings.COUNTRY_CREATED)
        } else {
          helper.error()
        }
      }
    } catch (err) {
      helper.error(err)
    }
  }

  const onLoad = () => {
    setVisible(true)
  }

  return (
    <Layout onLoad={onLoad} strict>
      <div className="create-country">
        <Paper className="country-form country-form-wrapper" elevation={10} style={visible ? {} : { display: 'none' }}>
          <h1 className="country-form-title">
            {' '}
            {strings.NEW_COUNTRY_HEADING}
            {' '}
          </h1>
          <form onSubmit={handleSubmit}>
            {env._LANGUAGES.map((language, index) => (
              <FormControl key={language.code} fullWidth margin="dense">
                <InputLabel className="required">{`${commonStrings.NAME} (${language.label})`}</InputLabel>
                <Input
                  type="text"
                  value={(names[index] && names[index].name) || ''}
                  error={nameErrors[index]}
                  required
                  onChange={(e) => {
                    const _names = bookcarsHelper.clone(names) as bookcarsTypes.CountryName[]
                    _names[index] = {
                      language: language.code,
                      name: e.target.value,
                    }
                    setNames(_names)

                    const _nameErrors = bookcarsHelper.clone(nameErrors) as boolean[]
                    _nameErrors[index] = false
                    setNameErrors(_nameErrors)
                  }}
                  autoComplete="off"
                />
                <FormHelperText error={nameErrors[index]}>{(nameErrors[index] && strings.INVALID_COUNTRY) || ''}</FormHelperText>
              </FormControl>
            ))}

            <div className="buttons">
              <Button type="submit" variant="contained" className="btn-primary btn-margin-bottom" size="small">
                {commonStrings.CREATE}
              </Button>
              <Button variant="contained" className="btn-secondary btn-margin-bottom" size="small" onClick={() => navigate('/countries')}>
                {commonStrings.CANCEL}
              </Button>
            </div>
          </form>
        </Paper>
      </div>
    </Layout>
  )
}

export default CreateCountry
