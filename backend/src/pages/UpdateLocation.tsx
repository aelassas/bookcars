import React, { useState } from 'react'
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
import Layout from '../components/Layout'
import { strings as commonStrings } from '../lang/common'
import { strings as clStrings } from '../lang/create-location'
import { strings } from '../lang/update-location'
import * as LocationService from '../services/LocationService'
import NoMatch from './NoMatch'
import Error from './Error'
import Backdrop from '../components/SimpleBackdrop'
import * as helper from '../common/helper'
import env from '../config/env.config'

import '../assets/css/update-location.css'

const UpdateLocation = () => {
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [names, setNames] = useState<bookcarsTypes.LocationName[]>([])
  const [nameErrors, setNameErrors] = useState<boolean[]>([])
  const [noMatch, setNoMatch] = useState(false)
  const [error, setError] = useState(false)
  const [location, setLocation] = useState<bookcarsTypes.Location>()
  const [nameChanged, setNameChanged] = useState(false)

  const _error = () => {
    setLoading(false)
    helper.error()
  }

  const checkName = () => {
    let _nameChanged = false

    if (!location || !location.values) {
      helper.error()
      return _nameChanged
    }

    for (let i = 0; i < names.length; i += 1) {
      const name = names[i]
      if (name.name !== location.values[i].value) {
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
      if (!location || !location.values) {
        helper.error()
        return
      }

      const _nameChanged = checkName()

      if (!_nameChanged) {
        return
      }

      let isValid = true

      for (let i = 0; i < nameErrors.length; i += 1) {
        nameErrors[i] = false
      }

      for (let i = 0; i < names.length; i += 1) {
        const name = names[i]
        if (name.name !== location.values[i].value) {
          const _isValid = (await LocationService.validate(name)) === 200
          isValid = isValid && _isValid
          if (!_isValid) {
            nameErrors[i] = true
          }
        }
      }

      setNameErrors(bookcarsHelper.cloneArray(nameErrors) as boolean[])

      if (isValid) {
        const status = await LocationService.update(location._id, names)

        if (status === 200) {
          for (let i = 0; i < names.length; i += 1) {
            const name = names[i]
            location.values[i].value = name.name
          }

          setLocation(bookcarsHelper.clone(location))
          helper.info(strings.LOCATION_UPDATED)
        } else {
          _error()
        }
      }
    } catch (err) {
      helper.error(err)
    }
  }

  const onLoad = async (user?: bookcarsTypes.User) => {
    if (user && user.verified) {
      setLoading(true)

      const params = new URLSearchParams(window.location.search)
      if (params.has('loc')) {
        const id = params.get('loc')
        if (id && id !== '') {
          try {
            const _location = await LocationService.getLocation(id)

            if (_location && _location.values) {
              env._LANGUAGES.forEach((lang) => {
                if (_location.values && !_location.values.some((value) => value.language === lang.code)) {
                  _location.values.push({ language: lang.code, name: '' })
                }
              })

              const _names: bookcarsTypes.LocationName[] = _location.values.map((value) => ({
                language: value.language || '',
                name: value.value || '',
              }))

              setLocation(_location)
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
      {!error && !noMatch && location && location.values && (
        <div className="update-location">
          <Paper className="location-form location-form-wrapper" elevation={10} style={visible ? {} : { display: 'none' }}>
            <h1 className="location-form-title">
              {' '}
              {strings.UPDATE_LOCATION}
              {' '}
            </h1>
            <form onSubmit={handleSubmit}>
              {location.values.map((value, index) => (
                <FormControl key={value.language} fullWidth margin="dense">
                  <InputLabel className="required">{env._LANGUAGES.filter((l) => l.code === value.language)[0].label}</InputLabel>
                  <Input
                    type="text"
                    value={(names[index] && names[index].name) || ''}
                    error={nameErrors[index]}
                    required
                    onChange={(e) => {
                      nameErrors[index] = false
                      names[index].name = e.target.value
                      checkName()
                      setNames(bookcarsHelper.cloneArray(names) as bookcarsTypes.LocationName[])
                    }}
                    autoComplete="off"
                  />
                  <FormHelperText error={nameErrors[index]}>{(nameErrors[index] && clStrings.INVALID_LOCATION) || ''}</FormHelperText>
                </FormControl>
              ))}

              <div className="buttons">
                <Button type="submit" variant="contained" className="btn-primary btn-margin-bottom" size="small" disabled={!nameChanged}>
                  {commonStrings.SAVE}
                </Button>
                <Button variant="contained" className="btn-secondary btn-margin-bottom" size="small" href="/locations">
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

export default UpdateLocation
